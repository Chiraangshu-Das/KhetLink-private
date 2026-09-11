import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { verificationCode, logisticsFee, notify } from "../services/business.js";

const router = Router();
router.use(requireAuth);

async function expireOrderIfNeeded(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.paymentStatus !== "PENDING" || !order.paymentExpiresAt || order.paymentExpiresAt > new Date()) return order;
  return prisma.$transaction(async tx => {
    const fresh = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!fresh || fresh.paymentStatus !== "PENDING" || !fresh.paymentExpiresAt || fresh.paymentExpiresAt > new Date()) return fresh;
    for (const item of fresh.items) {
      if (item.listingId) await tx.listing.update({ where: { id: item.listingId }, data: { quantity: { increment: item.quantity } } });
    }
    const cancelled = await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "EXPIRED", status: "CANCELLED" } });
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: fresh.status, toStatus: "CANCELLED" } });
    return cancelled;
  });
}

router.get("/", async (req: AuthRequest, res) => {
  const raw = await prisma.order.findMany({
    where: { OR: [{ buyerId: req.userId! }, { sellerId: req.userId! }] },
    include: { buyer: { select: { firstName: true, lastName: true } }, seller: { select: { firstName: true, lastName: true } }, items: { include: { product: true, listing: true } }, shipment: true, assignments: { include: { logistics: { include: { user: true } } } }, participantCodes: true, payment: true, statusHistory: true },
    orderBy: { createdAt: "desc" },
  });
  const orders = await Promise.all(raw.map(o => expireOrderIfNeeded(o.id)));
  res.json({ orders });
});

const createSchema = z.object({
  sellerId: z.string(), requirementId: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), listingId: z.string().optional(), quantity: z.number().positive(), unit: z.string(), unitPrice: z.number().positive() })).min(1),
  distanceKm: z.number().nonnegative().default(0), pickupLocation: z.string().optional(), deliveryLocation: z.string().optional(),
});

router.post("/", async (req: AuthRequest, res) => {
  const p = createSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid order", details: p.error.flatten() });
  if (p.data.sellerId === req.userId) return res.status(400).json({ error: "Buyer and farmer must be different users" });

  const totalItem = p.data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const fee = logisticsFee(p.data.distanceKm);
  const platform = totalItem * 0.05;
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const order = await prisma.$transaction(async tx => {
      const order = await tx.order.create({ data: {
        buyerId: req.userId!, sellerId: p.data.sellerId, requirementId: p.data.requirementId,
        status: "CONFIRMED", paymentStatus: "PENDING", paymentExpiresAt: expires,
        platformFee: platform, logisticsFee: fee, total: totalItem + platform + fee,
        items: { create: [] },
        payment: { create: { amount: totalItem + platform + fee, status: "PENDING", expiresAt: expires } },
        shipment: { create: { status: "CONFIRMED", pickupLocation: p.data.pickupLocation, deliveryLocation: p.data.deliveryLocation, distanceKm: p.data.distanceKm } },
        statusHistory: { create: { toStatus: "CONFIRMED" } },
      } });
      for (const item of p.data.items) {
        const listing = item.listingId
          ? await tx.listing.findFirst({ where: { id: item.listingId, farmerId: p.data.sellerId, productId: item.productId, status: "Active" } })
          : await tx.listing.findFirst({ where: { farmerId: p.data.sellerId, productId: item.productId, status: "Active", quantity: { gte: item.quantity } }, orderBy: { createdAt: "asc" } });
        if (!listing || listing.quantity < item.quantity) throw new Error(`Insufficient inventory for ${item.productId}`);
        const changed = await tx.listing.updateMany({ where: { id: listing.id, quantity: { gte: item.quantity }, status: "Active" }, data: { quantity: { decrement: item.quantity } } });
        if (changed.count !== 1) throw new Error(`Inventory changed; please retry`);
        await tx.orderItem.create({ data: { orderId: order.id, productId: item.productId, listingId: listing.id, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice } });
      }
      return tx.order.findUnique({ where: { id: order.id }, include: { items: true, payment: true, shipment: true } });
    });
    await notify(req.userId!, "ORDER", "Order confirmed", `Order ${order?.id} is confirmed. Payment is due within one hour.`, "BUYER");
    await notify(p.data.sellerId, "ORDER", "New order", `Order ${order?.id} has been created from KhetLink.`, "FARMER");
    res.status(201).json({ order });
  } catch (e: any) {
    res.status(409).json({ error: e?.message ?? "Unable to create order" });
  }
});

router.post("/:id/pay", async (req: AuthRequest, res) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!orderId) return res.status(400).json({ error: "Order id is required" });
  const order = await expireOrderIfNeeded(orderId);
  if (!order || order.buyerId !== req.userId) return res.status(404).json({ error: "Order not found" });
  if (order.paymentStatus === "EXPIRED" || order.status === "CANCELLED") return res.status(409).json({ error: "Payment deadline expired; order cancelled" });
  if (order.paymentStatus === "PAID") return res.json({ order });
  const paid = await prisma.$transaction(async tx => {
    const updated = await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
    await tx.payment.update({ where: { orderId: order.id }, data: { status: "PAID", paidAt: new Date() } });
    const logistics = await tx.logisticsProfile.findMany({ where: { availableCapacity: { gt: 0 } }, include: { user: true }, orderBy: { rating: "desc" } });
    const existing = await tx.logisticsAssignment.findMany({ where: { orderId: order.id }, select: { logisticsId: true } });
    const existingIds = new Set(existing.map(x => x.logisticsId));
    const quantity = (await tx.orderItem.findMany({ where: { orderId: order.id } })).reduce((s, i) => s + i.quantity, 0);
    for (const l of logistics) if (!existingIds.has(l.id) && l.availableCapacity >= quantity) await tx.logisticsAssignment.create({ data: { orderId: order.id, logisticsId: l.id, fee: order.logisticsFee } });
    return updated;
  });
  await notify(order.sellerId, "PAYMENT", "Payment received", `Payment for order ${order.id} is complete.`, "FARMER");
  res.json({ order: paid, message: "Demo payment successful. Logistics search started." });
});

router.post("/:id/cancel", async (req: AuthRequest, res) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!orderId) return res.status(400).json({ error: "Order id is required" });
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || ![order.buyerId, order.sellerId].includes(req.userId!)) return res.status(404).json({ error: "Order not found" });
  if (order.paymentStatus === "PAID") return res.status(409).json({ error: "Paid orders cannot be cancelled through this demo endpoint" });
  const cancelled = await prisma.$transaction(async tx => {
    for (const item of order.items) if (item.listingId) await tx.listing.update({ where: { id: item.listingId }, data: { quantity: { increment: item.quantity } } });
    await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "FAILED" } });
    return tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
  });
  res.json({ order: cancelled });
});

router.post("/:id/review", async (req: AuthRequest, res) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!orderId) return res.status(400).json({ error: "Order id is required" });
  const p = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Rating must be between 1 and 5" });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || ![order.buyerId, order.sellerId].includes(req.userId!) || order.status !== "DELIVERED") return res.status(403).json({ error: "Review is not available for this order" });
  const revieweeId = req.userId === order.buyerId ? order.sellerId : order.buyerId;
  const review = await prisma.review.create({ data: { orderId: order.id, reviewerId: req.userId!, revieweeId, rating: p.data.rating, comment: p.data.comment } });
  res.status(201).json({ review });
});

export default router;
