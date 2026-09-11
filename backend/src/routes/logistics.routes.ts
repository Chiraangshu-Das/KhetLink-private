import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { notify } from "../services/business.js";

const router = Router();
router.use(requireAuth);

const paramId = (req: AuthRequest, key: "id" | "orderId") =>
  typeof req.params[key] === "string" ? req.params[key] : null;

async function profile(userId: string) {
  return prisma.logisticsProfile.findUnique({ where: { userId } });
}

router.get("/offers", async (req: AuthRequest, res) => {
  const p = await profile(req.userId!);
  if (!p) return res.status(403).json({ error: "Logistics role required" });

  const assignments = await prisma.logisticsAssignment.findMany({
    where: { logisticsId: p.id, status: "OFFERED" },
    orderBy: { offeredAt: "desc" },
  });

  const offers = [];
  for (const assignment of assignments) {
    const order = await prisma.order.findUnique({ where: { id: assignment.orderId } });
    if (!order || order.paymentStatus !== "PAID") continue;
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { product: true },
    });
    const shipment = await prisma.shipment.findUnique({ where: { orderId: order.id } });
    offers.push({ ...assignment, order: { ...order, items, shipment } });
  }

  return res.json({ offers });
});

router.post("/offers/:id/accept", async (req: AuthRequest, res) => {
  const p = await profile(req.userId!);
  if (!p) return res.status(403).json({ error: "Logistics role required" });
  const id = paramId(req, "id");
  if (!id) return res.status(400).json({ error: "Invalid offer id" });

  const a = await prisma.logisticsAssignment.findFirst({
    where: { id, logisticsId: p.id, status: "OFFERED" },
  });
  if (!a) return res.status(404).json({ error: "Offer not found" });

  const order = await prisma.order.findUnique({ where: { id: a.orderId } });
  if (!order || order.paymentStatus !== "PAID") {
    return res.status(409).json({ error: "Only paid orders can be accepted" });
  }
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const qty = items.reduce((sum: number, item) => sum + item.quantity, 0);
  if (qty > p.availableCapacity) return res.status(409).json({ error: "Capacity exceeded" });

  const updated = await prisma.$transaction(async tx => {
    const x = await tx.logisticsAssignment.update({
      where: { id: a.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    await tx.logisticsProfile.update({
      where: { id: p.id },
      data: { availableCapacity: { decrement: qty } },
    });
    return x;
  });

  await notify(order.buyerId, "SHIPMENT", "Logistics assigned", "A logistics provider has accepted your paid order.", "BUYER");
  await notify(order.sellerId, "SHIPMENT", "Logistics assigned", "A logistics provider has been assigned to the order.", "FARMER");
  return res.json({ assignment: updated });
});

router.post("/offers/:id/decline", async (req: AuthRequest, res) => {
  const p = await profile(req.userId!);
  if (!p) return res.status(403).json({ error: "Logistics role required" });
  const id = paramId(req, "id");
  if (!id) return res.status(400).json({ error: "Invalid offer id" });

  const a = await prisma.logisticsAssignment.findFirst({
    where: { id, logisticsId: p.id, status: "OFFERED" },
  });
  if (!a) return res.status(404).json({ error: "Offer not found" });

  const assignment = await prisma.logisticsAssignment.update({
    where: { id: a.id },
    data: { status: "DECLINED" },
  });
  return res.json({ assignment });
});

router.post("/location", async (req: AuthRequest, res) => {
  const parsed = z.object({
    orderId: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    location: z.string().optional(),
    distanceKm: z.number().nonnegative().optional(),
    etaMinutes: z.number().int().nonnegative().optional(),
    routeJson: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid location" });

  const profileRow = await profile(req.userId!);
  if (!profileRow) return res.status(403).json({ error: "Logistics role required" });

  const a = await prisma.logisticsAssignment.findFirst({
    where: { orderId: parsed.data.orderId, logisticsId: profileRow.id, status: "ACCEPTED" },
  });
  if (!a) return res.status(403).json({ error: "Assignment not found" });

  const shipment = await prisma.shipment.update({
    where: { orderId: parsed.data.orderId },
    data: {
      currentLat: parsed.data.latitude,
      currentLng: parsed.data.longitude,
      ...(parsed.data.location !== undefined ? { currentLocation: parsed.data.location } : {}),
      ...(parsed.data.distanceKm !== undefined ? { distanceKm: parsed.data.distanceKm } : {}),
      ...(parsed.data.etaMinutes !== undefined ? { etaMinutes: parsed.data.etaMinutes } : {}),
      ...(parsed.data.routeJson !== undefined ? { routeJson: parsed.data.routeJson } : {}),
    },
  });
  return res.json({ shipment });
});

router.post("/:orderId/verify", async (req: AuthRequest, res) => {
  const parsed = z.object({ code: z.string().regex(/^[A-Z0-9]{4}$/) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Verification code must be exactly 4 alphanumeric characters" });
  }

  const profileRow = await profile(req.userId!);
  if (!profileRow) return res.status(403).json({ error: "Logistics role required" });
  const orderId = paramId(req, "orderId");
  if (!orderId) return res.status(400).json({ error: "Invalid order id" });

  const assignment = await prisma.logisticsAssignment.findFirst({
    where: { orderId, logisticsId: profileRow.id, status: "ACCEPTED" },
  });
  if (!assignment) return res.status(403).json({ error: "Assignment not found" });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  const shipment = await prisma.shipment.findUnique({ where: { orderId: order.id } });
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  const participantCodes = await prisma.participantCode.findMany({ where: { orderId: order.id } });

  const farmerCode = participantCodes.find(c => c.role === "FARMER");
  const buyerCode = participantCodes.find(c => c.role === "BUYER");
  const codeMatchesFarmer = farmerCode?.code === parsed.data.code;
  const codeMatchesBuyer = buyerCode?.code === parsed.data.code;

  if (shipment.status === "CONFIRMED" && !codeMatchesFarmer) {
    return res.status(400).json({ error: "Farmer verification failed" });
  }
  if (shipment.status === "IN_TRANSIT" && !codeMatchesBuyer) {
    return res.status(400).json({ error: "Buyer verification failed" });
  }

  let next = shipment.status;
  if (next === "CONFIRMED") next = "PROCESSING";
  else if (next === "PROCESSING") next = "IN_TRANSIT";
  else if (next === "IN_TRANSIT") next = "DELIVERED";
  else return res.status(409).json({ error: "Invalid shipment state" });

  const updatedShipment = await prisma.shipment.update({
    where: { orderId: order.id },
    data: { status: next },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: next },
  });

  return res.json({ shipment: updatedShipment });
});

export default router;
