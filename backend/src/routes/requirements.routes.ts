import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { kgEquivalent, notify } from "../services/business.js";

const router = Router();
router.use(requireAuth);

const paramId = (req: AuthRequest) => typeof req.params.id === "string" ? req.params.id : null;

const item = z.object({
  productId: z.string(), quantity: z.number().positive(), unit: z.string(),
  minPrice: z.number().nonnegative(), maxPrice: z.number().positive(),
  requiredBy: z.string().datetime().optional(), location: z.string().optional(),
});
const create = z.object({
  location: z.string().optional(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(),
  items: z.array(item).min(1),
});

router.get("/", async (req: AuthRequest, res) => {
  const requirements = await prisma.requirement.findMany({ where: { buyerId: req.userId! }, orderBy: { createdAt: "desc" } });
  const result = [];
  for (const requirement of requirements) {
    const items = await prisma.requirementItem.findMany({ where: { requirementId: requirement.id }, include: { product: true } });
    const offers = await prisma.offer.findMany({ where: { requirementId: requirement.id }, include: { items: true } });
    result.push({ ...requirement, items, offers });
  }
  return res.json({ requirements: result });
});

router.post("/", async (req: AuthRequest, res) => {
  const p = create.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid requirement", details: p.error.flatten() });
  const r = await prisma.$transaction(async tx => tx.requirement.create({ data: {
    buyerId: req.userId!, location: p.data.location, latitude: p.data.latitude, longitude: p.data.longitude,
    status: "PENDING", items: { create: p.data.items.map(i => ({ ...i, requiredBy: i.requiredBy ? new Date(i.requiredBy) : undefined })) },
  }}));
  const listings = await prisma.listing.findMany({ where: { status: "Active" }, include: { farmer: { include: { farmer: true } }, product: true } });
  const matchedFarmerIds = new Set<string>();
  let canFulfil = true;
  for (const requested of p.data.items) {
    let remaining = kgEquivalent(requested.quantity, requested.unit);
    const candidates = listings.filter(l => l.productId === requested.productId && l.price >= requested.minPrice && l.price <= requested.maxPrice && kgEquivalent(l.quantity, l.unit) > 0).sort((a, b) => kgEquivalent(b.quantity, b.unit) - kgEquivalent(a.quantity, a.unit));
    for (const l of candidates) {
      if (remaining <= 0) break;
      const take = Math.min(kgEquivalent(l.quantity, l.unit), remaining);
      if (take > 0) { matchedFarmerIds.add(l.farmerId); remaining -= take; }
    }
    if (remaining > 0) canFulfil = false;
  }
  if (!canFulfil) await prisma.requirement.update({ where: { id: r.id }, data: { status: "NOT_FOUND" } });
  return res.status(201).json({ requirementId: r.id, matchedFarmers: [...matchedFarmerIds], status: canFulfil ? "PENDING" : "NOT_FOUND" });
});

router.post("/:id/offer", async (req: AuthRequest, res) => {
  const id = paramId(req);
  if (!id) return res.status(400).json({ error: "Invalid requirement id" });
  const p = z.object({ farmerId: z.string(), offeredPrice: z.number().positive(), items: z.array(z.object({ listingId: z.string(), quantity: z.number().positive() })) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid offer" });
  const reqt = await prisma.requirement.findFirst({ where: { id, buyerId: req.userId! } });
  if (!reqt) return res.status(404).json({ error: "Requirement not found" });
  const listings = await prisma.listing.findMany({ where: { id: { in: p.data.items.map(i => i.listingId) }, farmerId: p.data.farmerId, status: "Active" } });
  if (listings.length !== p.data.items.length) return res.status(400).json({ error: "Invalid listings" });
  for (const i of p.data.items) { const l = listings.find(x => x.id === i.listingId)!; if (i.quantity > l.quantity) return res.status(409).json({ error: "Insufficient inventory" }); }
  const offer = await prisma.$transaction(async tx => tx.offer.upsert({
    where: { requirementId_farmerId: { requirementId: reqt.id, farmerId: p.data.farmerId } },
    update: { offeredPrice: p.data.offeredPrice, status: "OFFERED", items: { deleteMany: {}, create: p.data.items } },
    create: { requirementId: reqt.id, farmerId: p.data.farmerId, offeredPrice: p.data.offeredPrice, originalPrice: p.data.offeredPrice, status: "OFFERED", items: { create: p.data.items } },
  }));
  await notify(p.data.farmerId, "REQUEST", "New buyer request", "A new KhetLink procurement request is waiting for your response.", "FARMER");
  return res.status(201).json({ offer });
});

router.post("/:id/counter", async (req: AuthRequest, res) => {
  const id = paramId(req);
  if (!id) return res.status(400).json({ error: "Invalid requirement id" });
  const p = z.object({ farmerId: z.string(), price: z.number().positive() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid counter offer" });
  const offer = await prisma.offer.findFirst({ where: { requirementId: id, farmerId: p.data.farmerId, requirement: { buyerId: req.userId! } } });
  if (!offer) return res.status(404).json({ error: "Offer not found" });
  return res.json({ offer: await prisma.offer.update({ where: { id: offer.id }, data: { offeredPrice: p.data.price, status: "COUNTERED", buyerConfirmed: false, farmerConfirmed: false } }) });
});

router.post("/:id/decline", async (req: AuthRequest, res) => {
  const id = paramId(req);
  if (!id) return res.status(400).json({ error: "Invalid requirement id" });
  const p = z.object({ farmerId: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Farmer is required" });
  const offer = await prisma.offer.findFirst({ where: { requirementId: id, farmerId: p.data.farmerId, requirement: { buyerId: req.userId! } } });
  if (!offer) return res.status(404).json({ error: "Offer not found" });
  return res.json({ offer: await prisma.offer.update({ where: { id: offer.id }, data: { status: "REJECTED", buyerConfirmed: false } }) });
});

router.post("/:id/accept", async (req: AuthRequest, res) => {
  const id = paramId(req);
  if (!id) return res.status(400).json({ error: "Invalid requirement id" });
  const p = z.object({ farmerId: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Farmer is required" });
  const offer = await prisma.offer.findFirst({ where: { requirementId: id, farmerId: p.data.farmerId, requirement: { buyerId: req.userId! } } });
  if (!offer) return res.status(404).json({ error: "Offer not found" });
  const updated = await prisma.offer.update({ where: { id: offer.id }, data: { buyerConfirmed: true, status: offer.farmerConfirmed ? "ACCEPTED" : "NEGOTIATING" } });
  if (updated.farmerConfirmed) {
    const exists = await prisma.order.findFirst({ where: { requirementId: offer.requirementId, sellerId: offer.farmerId } });
    if (!exists) {
      const itemRows = await prisma.offerItem.findMany({ where: { offerId: offer.id } });
      const listings = await prisma.listing.findMany({ where: { id: { in: itemRows.map(x => x.listingId) } } });
      const totalQty = itemRows.reduce((s: number, x) => s + x.quantity, 0);
      const total = updated.offeredPrice * totalQty;
      await prisma.order.create({ data: {
        buyerId: req.userId!, sellerId: offer.farmerId, requirementId: offer.requirementId, status: "CONFIRMED", paymentStatus: "PENDING",
        paymentExpiresAt: new Date(Date.now() + 3600000), platformFee: total * 0.05, logisticsFee: 0, total: total * 1.05,
        items: { create: itemRows.map(x => { const listing = listings.find(l => l.id === x.listingId); return { productId: listing!.productId, listingId: x.listingId, quantity: x.quantity, unit: listing!.unit, unitPrice: updated.offeredPrice }; }) },
        payment: { create: { amount: total * 1.05, status: "PENDING", expiresAt: new Date(Date.now() + 3600000) } },
        shipment: { create: { status: "CONFIRMED" } }, statusHistory: { create: { toStatus: "CONFIRMED" } },
      }});
      await prisma.requirement.update({ where: { id: offer.requirementId }, data: { status: "CONFIRMED" } });
    }
  }
  return res.json({ message: "Offer accepted", offerId: offer.id, orderCreated: updated.farmerConfirmed });
});

router.post("/:id/farmer-response", async (req: AuthRequest, res) => {
  const id = paramId(req);
  if (!id) return res.status(400).json({ error: "Invalid requirement id" });
  const p = z.object({ action: z.enum(["accept", "decline", "counter"]), price: z.number().positive().optional(), items: z.array(z.object({ listingId: z.string(), quantity: z.number().positive() })).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid farmer response" });
  const role = await prisma.userRole.findUnique({ where: { userId_role: { userId: req.userId!, role: "FARMER" } } });
  if (!role) return res.status(403).json({ error: "Farmer role required" });
  const requirement = await prisma.requirement.findUnique({ where: { id } });
  if (!requirement) return res.status(404).json({ error: "Requirement not found" });
  const requirementItems = await prisma.requirementItem.findMany({ where: { requirementId: requirement.id } });
  if (p.data.action === "decline") {
    const offer = await prisma.offer.findUnique({ where: { requirementId_farmerId: { requirementId: requirement.id, farmerId: req.userId! } } });
    if (offer) await prisma.offer.update({ where: { id: offer.id }, data: { status: "REJECTED", farmerConfirmed: false } });
    return res.json({ status: "REJECTED" });
  }
  const listings = await prisma.listing.findMany({ where: { farmerId: req.userId!, status: "Active", productId: { in: requirementItems.map(i => i.productId) } } });
  const requestedItems = p.data.items?.length ? p.data.items : requirementItems.flatMap(ri => {
    const l = listings.find(x => x.productId === ri.productId && x.quantity > 0);
    return l ? [{ listingId: l.id, quantity: Math.min(ri.quantity, l.quantity) }] : [];
  });
  if (!requestedItems.length) return res.status(409).json({ error: "No matching inventory" });
  for (const selected of requestedItems) { const l = listings.find(x => x.id === selected.listingId); if (!l || selected.quantity > l.quantity) return res.status(409).json({ error: "Insufficient inventory" }); }
  const basePrice = p.data.price ?? Math.round(requestedItems.reduce((sum: number, x) => sum + (listings.find(l => l.id === x.listingId)?.price ?? 0), 0) / requestedItems.length);
  const status = p.data.action === "counter" ? "COUNTERED" : "ACCEPTED";
  const offer = await prisma.offer.upsert({
    where: { requirementId_farmerId: { requirementId: requirement.id, farmerId: req.userId! } },
    update: { offeredPrice: basePrice, status, farmerConfirmed: p.data.action === "accept", buyerConfirmed: false, items: { deleteMany: {}, create: requestedItems } },
    create: { requirementId: requirement.id, farmerId: req.userId!, offeredPrice: basePrice, originalPrice: basePrice, status, farmerConfirmed: p.data.action === "accept", items: { create: requestedItems } },
  });
  await notify(requirement.buyerId, p.data.action === "counter" ? "COUNTER_OFFER" : "ACCEPTED", p.data.action === "counter" ? "Farmer sent a counter offer" : "Farmer accepted", `A farmer responded to requirement ${requirement.id} at ₹${basePrice}.`, "BUYER");
  return res.json({ offer });
});

router.get("/incoming", async (req: AuthRequest, res) => {
  const farmer = await prisma.userRole.findUnique({ where: { userId_role: { userId: req.userId!, role: "FARMER" } } });
  if (!farmer) return res.status(403).json({ error: "Farmer role required" });
  const listings = await prisma.listing.findMany({ where: { farmerId: req.userId!, status: "Active" }, select: { productId: true } });
  const productIds = listings.map(x => x.productId);
  const requirements = await prisma.requirement.findMany({ where: { status: "PENDING", items: { some: { productId: { in: productIds } } } }, orderBy: { createdAt: "desc" } });
  const result = [];
  for (const requirement of requirements) {
    const items = await prisma.requirementItem.findMany({ where: { requirementId: requirement.id }, include: { product: true } });
    const buyer = await prisma.user.findUnique({ where: { id: requirement.buyerId }, select: { id: true, location: true } });
    result.push({ ...requirement, items, buyer });
  }
  return res.json({ requirements: result });
});

export default router;
