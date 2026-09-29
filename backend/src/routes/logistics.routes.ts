import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { notify } from "../services/business.js";

const router = Router();
router.use(requireAuth);

const capacityUnit = z.enum(["KG", "QUINTAL", "TON", "LITRE"]);
const normalizeKg = (quantity: number, unit: string) => {
  const u = unit.toUpperCase();
  if (u === "TON" || u === "TONNE" || u === "TONNES") return quantity * 1000;
  if (u === "QUINTAL" || u === "QUINTALS" || u === "Q") return quantity * 100;
  if (u === "KG" || u === "KGS" || u === "KILOGRAM" || u === "KILOGRAMS") return quantity;
  // KhetLink currently has no density field, so litre is treated as 1 kg/L
  // for capacity matching. This is an application rule, not a physical density claim.
  if (u === "L" || u === "LITRE" || u === "LITRES" || u === "LITER" || u === "LITERS") return quantity;
  return quantity;
};

const distanceKm = (lat1?: number | null, lng1?: number | null, lat2?: number | null, lng2?: number | null) => {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
  const r = 6371;
  const dLat = ((lat2! - lat1!) * Math.PI) / 180;
  const dLng = ((lng2! - lng1!) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1! * Math.PI) / 180) * Math.cos((lat2! * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
};

const param = (req: AuthRequest, key: "id" | "orderId") => typeof req.params[key] === "string" ? req.params[key] : null;

async function getProfile(userId: string) {
  return prisma.logisticsProfile.findUnique({ where: { userId }, include: { user: { select: { firstName: true, lastName: true, phone: true, email: true, language: true, profileImage: true, location: true, latitude: true, longitude: true } } } });
}

async function orderLoadKg(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId: orderId } });
  return items.reduce((sum, item) => sum + normalizeKg(item.quantity, item.unit), 0);
}

export async function dispatchOrder(orderId: string, options: { allowPreviouslyTried?: boolean } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, shipment: true, assignments: true } });
  if (!order || order.paymentStatus !== "PAID" || !order.shipment) return null;
  if (order.assignments.some(a => a.status === "ACCEPTED")) return null;

  const loadKg = await orderLoadKg(orderId);
  const triedIds = options.allowPreviouslyTried ? new Set<string>() : new Set(order.assignments.map(a => a.logisticsId));
  const candidates = await prisma.logisticsProfile.findMany({
    where: { isOnline: true, locationTrackingEnabled: true, availableCapacityKg: { gte: loadKg }, currentLat: { not: null }, currentLng: { not: null }, ...(triedIds.size ? { id: { notIn: [...triedIds] } } : {}) },
  });
  const ranked = candidates
    .map(p => ({ p, distance: distanceKm(p.currentLat, p.currentLng, order.shipment!.pickupLat, order.shipment!.pickupLng) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.distance - b.distance);

  const now = new Date();
  let sequence = order.assignments.length;

  // Offer the closest eligible provider first. The worker below moves the offer forward after 2 minutes.
  const first = ranked[0];
  if (!first) return null;

  const existingAssignment = order.assignments.find(
    a => a.logisticsId === first.p.id,
  );

  const offerExpiresAt = new Date(now.getTime() + 2 * 60 * 1000);

  let assignment;

  if (existingAssignment) {
    assignment = await prisma.logisticsAssignment.update({
      where: { id: existingAssignment.id },
      data: {
        status: "OFFERED",
        sequence,
        loadKg,
        fee: order.logisticsFee,
        distanceToPickupKm: first.distance,
        offeredAt: now,
        expiresAt: offerExpiresAt,
        acceptedAt: null,
        declinedAt: null,
      },
    });
  } else {
    assignment = await prisma.logisticsAssignment.create({
      data: {
        orderId,
        logisticsId: first.p.id,
        fee: order.logisticsFee,
        sequence,
        loadKg,
        distanceToPickupKm: first.distance,
        offeredAt: now,
        expiresAt: offerExpiresAt,
      },
    });
  }

  await notify(
    first.p.userId,
    "SHIPMENT",
    "New delivery request",
    `Order ${order.id} requires ${loadKg.toFixed(0)} kg capacity.`,
    "LOGISTICS",
  );

  return assignment;
}

async function expireAndReroute() {
  const now = new Date();
  const expired = await prisma.logisticsAssignment.findMany({ where: { status: "OFFERED", expiresAt: { lte: now } }, include: { order: { include: { items: true, shipment: true, assignments: true } } } });
  for (const assignment of expired) {
    await prisma.logisticsAssignment.updateMany({ where: { id: assignment.id, status: "OFFERED" }, data: { status: "EXPIRED" } });
    if (assignment.order.assignments.some(a => a.status === "ACCEPTED")) continue;
    const loadKg = assignment.loadKg || assignment.order.items.reduce((s, i) => s + normalizeKg(i.quantity, i.unit), 0);
    const tried = new Set(assignment.order.assignments.map(a => a.logisticsId));
    const candidates = await prisma.logisticsProfile.findMany({ where: { isOnline: true, locationTrackingEnabled: true, availableCapacityKg: { gte: loadKg }, currentLat: { not: null }, currentLng: { not: null }, id: { notIn: [...tried] } } });
    const ranked = candidates.map(p => ({ p, d: distanceKm(p.currentLat, p.currentLng, assignment.order.shipment?.pickupLat, assignment.order.shipment?.pickupLng) ?? Number.POSITIVE_INFINITY })).sort((a, b) => a.d - b.d);
    const next = ranked[0];
    if (!next) continue;
    const nextAssignment = await prisma.logisticsAssignment.create({ data: { orderId: assignment.orderId, logisticsId: next.p.id, fee: assignment.fee, sequence: assignment.sequence + 1, loadKg, distanceToPickupKm: next.d, offeredAt: now, expiresAt: new Date(now.getTime() + 2 * 60 * 1000) } });
    await notify(next.p.userId, "SHIPMENT", "Delivery request rerouted", `Order ${assignment.orderId} is now offered to you.`, "LOGISTICS");
    void nextAssignment;
  }
}

router.get("/snapshot", async (req: AuthRequest, res) => {
  await expireAndReroute();
  const p = await getProfile(req.userId!);
  if (!p) return res.status(403).json({ error: "Logistics role required" });
  const orderInclude = {
    items: { include: { product: true } },
    shipment: true,
    buyer: {
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        roles: { where: { role: "BUYER" }, select: { roleCode: true } },
      },
    },
    seller: {
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        roles: { where: { role: "FARMER" }, select: { roleCode: true } },
      },
    },
  } as const;

  const [offers, accepted, notifications] = await Promise.all([
    prisma.logisticsAssignment.findMany({
      where: { logisticsId: p.id, status: "OFFERED" },
      include: { order: { include: orderInclude } },
      orderBy: [{ offeredAt: "desc" }],
    }),
    prisma.logisticsAssignment.findMany({
      where: { logisticsId: p.id, status: "ACCEPTED" },
      include: { order: { include: orderInclude } },
      orderBy: [{ acceptedAt: "desc" }],
    }),
    prisma.notification.findMany({
      where: { userId: req.userId!, role: "LOGISTICS" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return res.json({ profile: p, offers, accepted, notifications });
});

router.get("/offers", async (req: AuthRequest, res) => {
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  await expireAndReroute();
  const offers = await prisma.logisticsAssignment.findMany({ where: { logisticsId: p.id, status: "OFFERED" }, include: { order: { include: { items: { include: { product: true } }, shipment: true } } }, orderBy: { offeredAt: "desc" } });
  return res.json({ offers });
});

router.put("/profile", async (req: AuthRequest, res) => {
  const p = z.object({ capacity: z.number().nonnegative(), capacityUnit, vehicleType: z.string().min(1), vehicleNumber: z.string().min(1), experience: z.string().min(1), profileImage: z.string().optional(), phone: z.string().min(7).optional(), location: z.string().optional(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(), locationTrackingEnabled: z.boolean().default(false) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid logistics profile", details: p.error.flatten() });
  const kg = normalizeKg(p.data.capacity, p.data.capacityUnit);
  const user = await prisma.user.update({ where: { id: req.userId! }, data: { ...(p.data.profileImage !== undefined ? { profileImage: p.data.profileImage } : {}), ...(p.data.phone !== undefined ? { phone: p.data.phone } : {}), ...(p.data.location !== undefined ? { location: p.data.location } : {}), ...(p.data.latitude !== undefined ? { latitude: p.data.latitude } : {}), ...(p.data.longitude !== undefined ? { longitude: p.data.longitude } : {}) } });
  const profileRow = await prisma.logisticsProfile.upsert({ where: { userId: req.userId! }, create: { userId: req.userId!, capacity: p.data.capacity, availableCapacity: p.data.capacity, capacityUnit: p.data.capacityUnit, maxCapacityKg: kg, availableCapacityKg: kg, vehicleType: p.data.vehicleType, vehicleNumber: p.data.vehicleNumber, experience: p.data.experience, locationTrackingEnabled: p.data.locationTrackingEnabled, currentLat: p.data.latitude ?? null, currentLng: p.data.longitude ?? null, lastLocationAt: p.data.latitude != null && p.data.longitude != null ? new Date() : null }, update: { capacity: p.data.capacity, capacityUnit: p.data.capacityUnit, maxCapacityKg: kg, availableCapacityKg: kg, availableCapacity: p.data.capacity, vehicleType: p.data.vehicleType, vehicleNumber: p.data.vehicleNumber, experience: p.data.experience, locationTrackingEnabled: p.data.locationTrackingEnabled, ...(p.data.latitude != null && p.data.longitude != null ? { currentLat: p.data.latitude, currentLng: p.data.longitude, lastLocationAt: new Date() } : {}) } });
  return res.json({ profile: profileRow, user });
});

router.post("/status", async (req: AuthRequest, res) => {
  const body = z.object({ online: z.boolean(), locationTrackingEnabled: z.boolean().optional(), latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid status" });
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  const updated = await prisma.logisticsProfile.update({ where: { id: p.id }, data: { isOnline: body.data.online, locationTrackingEnabled: body.data.locationTrackingEnabled ?? p.locationTrackingEnabled, ...(body.data.latitude != null && body.data.longitude != null ? { currentLat: body.data.latitude, currentLng: body.data.longitude, lastLocationAt: new Date() } : {}) } });
  if (updated.isOnline) await dispatchWaitingOrders();
  return res.json({ profile: updated });
});

async function dispatchWaitingOrders() {
  const orders = await prisma.order.findMany({ where: { paymentStatus: "PAID", assignments: { none: { status: "OFFERED" } }, shipment: { isNot: null } }, select: { id: true } });
  for (const o of orders) { try { await dispatchOrder(o.id); } catch (e) { console.error("dispatch waiting order", e); } }
}

router.post("/location", async (req: AuthRequest, res) => {
  const body = z.object({ latitude: z.number(), longitude: z.number(), location: z.string().optional(), orderId: z.string().optional(), distanceKm: z.number().nonnegative().optional(), etaMinutes: z.number().int().nonnegative().optional(), routeJson: z.string().optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid location" });
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  await prisma.logisticsProfile.update({ where: { id: p.id }, data: { currentLat: body.data.latitude, currentLng: body.data.longitude, lastLocationAt: new Date(), locationTrackingEnabled: true } });
  if (!body.data.orderId) {
    const activeAssignments = await prisma.logisticsAssignment.findMany({ where: { logisticsId: p.id, status: "ACCEPTED" }, select: { orderId: true } });
    for (const assignment of activeAssignments) {
      await prisma.shipment.updateMany({ where: { orderId: assignment.orderId }, data: { currentLat: body.data.latitude, currentLng: body.data.longitude } });
    }
    return res.json({ ok: true });
  }
  const a = await prisma.logisticsAssignment.findFirst({ where: { orderId: body.data.orderId, logisticsId: p.id, status: "ACCEPTED" } });
  if (!a) return res.status(403).json({ error: "Assignment not found" });
  const shipment = await prisma.shipment.findUnique({ where: { orderId: body.data.orderId } }); if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  await prisma.shipment.update({ where: { orderId: body.data.orderId }, data: { currentLat: body.data.latitude, currentLng: body.data.longitude, ...(body.data.location !== undefined ? { currentLocation: body.data.location } : {}), ...(body.data.distanceKm !== undefined ? { distanceKm: body.data.distanceKm } : {}), ...(body.data.etaMinutes !== undefined ? { etaMinutes: body.data.etaMinutes } : {}), ...(body.data.routeJson !== undefined ? { routeJson: body.data.routeJson } : {}) } });
  return res.json({ ok: true });
});

router.post("/offers/:id/accept", async (req: AuthRequest, res) => {
  await expireAndReroute();
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  const id = param(req, "id"); if (!id) return res.status(400).json({ error: "Invalid offer id" });
  const result = await prisma.$transaction(async tx => {
    const a = await tx.logisticsAssignment.findFirst({ where: { id, logisticsId: p.id, status: "OFFERED" } }); if (!a) throw new Error("Offer not found");
    if (a.expiresAt && a.expiresAt <= new Date()) throw new Error("Offer expired");
    const fresh = await tx.logisticsProfile.findUnique({ where: { id: p.id } }); if (!fresh || fresh.availableCapacityKg < a.loadKg) throw new Error("Capacity exceeded");
    const updated = await tx.logisticsAssignment.update({ where: { id: a.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await tx.logisticsProfile.update({ where: { id: p.id }, data: { availableCapacityKg: { decrement: a.loadKg } } });
    return { updated, orderId: a.orderId };
  }).catch(e => ({ error: e instanceof Error ? e.message : "Unable to accept offer" }));
  if ("error" in result) return res.status(409).json({ error: result.error });
  const order = await prisma.order.findUnique({ where: { id: result.orderId } });
  if (order) { await notify(order.buyerId, "SHIPMENT", "Logistics assigned", "A logistics provider has accepted your paid order.", "BUYER"); await notify(order.sellerId, "SHIPMENT", "Logistics assigned", "A logistics provider has been assigned to the order.", "FARMER"); }
  return res.json({ assignment: result.updated });
});

router.post("/offers/:id/decline", async (req: AuthRequest, res) => {
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  const id = param(req, "id"); if (!id) return res.status(400).json({ error: "Invalid offer id" });
  const a = await prisma.logisticsAssignment.findFirst({ where: { id, logisticsId: p.id, status: "OFFERED" } }); if (!a) return res.status(404).json({ error: "Offer not found" });
  const updated = await prisma.logisticsAssignment.update({ where: { id }, data: { status: "DECLINED", declinedAt: new Date() } });
  await dispatchOrder(a.orderId).catch(() => null);
  return res.json({ assignment: updated });
});

router.post("/orders/:orderId/emergency-cancel", async (req: AuthRequest, res) => {
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  const orderId = param(req, "orderId"); if (!orderId) return res.status(400).json({ error: "Invalid order id" });
  const result = await prisma.$transaction(async tx => {
    const a = await tx.logisticsAssignment.findFirst({ where: { orderId, logisticsId: p.id, status: "ACCEPTED" } }); if (!a) throw new Error("Active assignment not found");
    const updated = await tx.logisticsAssignment.update({ where: { id: a.id }, data: { status: "CANCELLED" } });
    await tx.logisticsProfile.update({ where: { id: p.id }, data: { availableCapacityKg: { increment: a.loadKg } } });
    return updated;
  }).catch(e => ({ error: e instanceof Error ? e.message : "Unable to cancel assignment" }));
  if ("error" in result) return res.status(409).json({ error: result.error });
  const next = await dispatchOrder(orderId).catch(() => null);
  return res.json({ cancelled: result, rerouted: Boolean(next), nextAssignment: next });
});

router.post("/:orderId/verify", async (req: AuthRequest, res) => {
  const body = z.object({
    code: z.string().regex(/^[A-Z0-9]{4}$/).optional(),
    stage: z.enum(["PICKUP", "QC", "DROPOFF"]),
    qcPassed: z.boolean().optional(),
    qcNote: z.string().optional(),
  }).safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid verification request" });
  }

  const p = await getProfile(req.userId!);
  if (!p) return res.status(403).json({ error: "Logistics role required" });

  const orderId = param(req, "orderId");
  if (!orderId) return res.status(400).json({ error: "Invalid order id" });

  const assignment = await prisma.logisticsAssignment.findFirst({
    where: { orderId, logisticsId: p.id, status: "ACCEPTED" },
  });
  if (!assignment) return res.status(403).json({ error: "Assignment not found" });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipment: true, participantCodes: true },
  });
  if (!order?.shipment) return res.status(404).json({ error: "Shipment not found" });

  const shipment = order.shipment;
  const now = new Date();

  // The existing KhetLink workflow is intentionally preserved:
  // CONFIRMED -> PROCESSING happens only with the farmer's 4-character code.
  if (body.data.stage === "PICKUP") {
    if (shipment.status !== "CONFIRMED") {
      return res.status(409).json({ error: "Pickup verification is not available in the current state" });
    }

    if (!body.data.code) {
      return res.status(400).json({ error: "Farmer pickup code is required" });
    }

    const farmerCode = order.participantCodes.find(c => c.role === "FARMER");
    if (!farmerCode || farmerCode.code !== body.data.code) {
      return res.status(400).json({ error: "Farmer verification failed" });
    }

    const near = (a: number | null | undefined, b: number | null | undefined) =>
      a != null && b != null && Math.abs(a - b) < 0.002;
    const atPickup = near(shipment.currentLat, shipment.pickupLat) && near(shipment.currentLng, shipment.pickupLng);
    if (!atPickup) {
      return res.status(400).json({ error: "Logistics provider must reach the farmer location first" });
    }

    await prisma.$transaction([
      prisma.shipment.update({
        where: { orderId },
        data: { status: "PROCESSING", pickupVerifiedAt: now, returnRequired: false },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PROCESSING" },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId, fromStatus: "CONFIRMED", toStatus: "PROCESSING" },
      }),
    ]);
  }

  // QC is deliberately separate from the two participant-code checkpoints.
  // A QC result advances PROCESSING -> IN_TRANSIT only when it passes.
  if (body.data.stage === "QC") {
    if (shipment.status !== "PROCESSING") {
      return res.status(409).json({ error: "QC is only available after pickup verification" });
    }

    const passed = body.data.qcPassed === true;
    await prisma.$transaction([
      prisma.shipment.update({
        where: { orderId },
        data: {
          qcStatus: passed ? "PASSED" : "FAILED",
          qcNote: body.data.qcNote,
          qcAt: now,
          returnRequired: !passed,
          status: passed ? "IN_TRANSIT" : "PROCESSING",
        },
      }),
      ...(passed
        ? [
          prisma.order.update({
            where: { id: orderId },
            data: { status: "IN_TRANSIT" },
          }),
          prisma.orderStatusHistory.create({
            data: { orderId, fromStatus: "PROCESSING", toStatus: "IN_TRANSIT" },
          }),
        ]
        : []),
    ]);
  }

  // IN_TRANSIT -> DELIVERED happens only with the buyer's 4-character code.
  if (body.data.stage === "DROPOFF") {
    if (shipment.status !== "IN_TRANSIT") {
      return res.status(409).json({ error: "Dropoff verification is only available after QC passes" });
    }

    if (!body.data.code) {
      return res.status(400).json({ error: "Buyer delivery code is required" });
    }

    const buyerCode = order.participantCodes.find(c => c.role === "BUYER");
    if (!buyerCode || buyerCode.code !== body.data.code) {
      return res.status(400).json({ error: "Buyer verification failed" });
    }

    const near = (a: number | null | undefined, b: number | null | undefined) =>
      a != null && b != null && Math.abs(a - b) < 0.002;
    const atDelivery = near(shipment.currentLat, shipment.deliveryLat) && near(shipment.currentLng, shipment.deliveryLng);
    if (!atDelivery) {
      return res.status(400).json({ error: "Logistics provider must reach the buyer location first" });
    }

    await prisma.$transaction([
      prisma.shipment.update({
        where: { orderId },
        data: { status: "DELIVERED", dropoffVerifiedAt: now, returnRequired: false },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      }),
      prisma.orderStatusHistory.create({
        data: { orderId, fromStatus: "IN_TRANSIT", toStatus: "DELIVERED" },
      }),
      prisma.logisticsProfile.update({
        where: { id: p.id },
        data: { availableCapacityKg: { increment: assignment.loadKg } },
      }),
      prisma.logisticsAssignment.update({
        where: { id: assignment.id },
        data: { status: "COMPLETED" },
      }),
    ]);
  }

  return res.json({
    ok: true,
    shipment: await prisma.shipment.findUnique({ where: { orderId } }),
  });
});

router.get("/history", async (req: AuthRequest, res) => {
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  const rows = await prisma.logisticsAssignment.findMany({
    where: { logisticsId: p.id, status: "COMPLETED" },
    include: { order: { include: { items: { include: { product: true } }, shipment: true } } },
    orderBy: { acceptedAt: "desc" },
  });
  return res.json({ history: rows });
});

router.get("/analytics", async (req: AuthRequest, res) => {
  const p = await getProfile(req.userId!); if (!p) return res.status(403).json({ error: "Logistics role required" });
  const from = typeof req.query.from === "string" ? new Date(req.query.from + (req.query.from.length === 10 ? "T00:00:00" : "")) : new Date(Date.now() - 7 * 86400000);
  const to = typeof req.query.to === "string" ? new Date(req.query.to + (req.query.to.length === 10 ? "T23:59:59.999" : "")) : new Date();
  const rows = await prisma.logisticsAssignment.findMany({ where: { logisticsId: p.id, status: "COMPLETED", acceptedAt: { gte: from, lte: to } }, include: { order: { include: { items: { include: { product: true } }, shipment: true } } }, orderBy: { acceptedAt: "asc" } });
  const itemTypes: Record<string, number> = {};
  const pickupPlaces: Record<string, number> = {};
  const dropoffPlaces: Record<string, number> = {};
  const deliveriesByDate: Record<string, number> = {};
  let quantityKg = 0; let distanceKmTotal = 0; let earnings = 0;
  for (const r of rows) {
    const dateKey = new Date(r.acceptedAt || r.order.createdAt).toISOString().slice(0, 10);
    deliveriesByDate[dateKey] = (deliveriesByDate[dateKey] || 0) + 1;
    const pickup = r.order.shipment?.pickupLocation || "Unknown pickup";
    const dropoff = r.order.shipment?.deliveryLocation || "Unknown dropoff";
    pickupPlaces[pickup] = (pickupPlaces[pickup] || 0) + 1;
    dropoffPlaces[dropoff] = (dropoffPlaces[dropoff] || 0) + 1;
    for (const i of r.order.items) { itemTypes[i.product.name] = (itemTypes[i.product.name] || 0) + normalizeKg(i.quantity, i.unit); }
    quantityKg += r.loadKg;
    distanceKmTotal += r.order.shipment?.distanceKm || 0;
    earnings += r.fee * 0.95;
  }
  return res.json({ from, to, completed: rows.length, quantityKg, distanceKm: distanceKmTotal, earnings, itemTypes, pickupPlaces, dropoffPlaces, deliveriesByDate, rows });
});

export default router;
