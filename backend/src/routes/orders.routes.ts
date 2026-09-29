import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { verificationCode, logisticsFee, notify, ensureRoleCode, uniqueOrderId, } from "../services/business.js";
import { dispatchOrder } from "./logistics.routes.js";

const router = Router();
router.use(requireAuth);

const broadRegion = (location?: string | null) => {
  const parts = String(location || "").split(",").map(x => x.trim()).filter(Boolean).filter(x => x !== "India" && !/^\d{6}$/.test(x));
  return parts.length >= 2 ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}` : (parts[0] || "Location not shared");
};
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => { const r = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180, a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return Math.round(r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10; };
async function ensureParticipantCodesForPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      buyerId: true,
      sellerId: true,
    },
  });

  if (!order || order.paymentStatus !== "PAID") return;

  const existing = await prisma.participantCode.findMany({
    where: { orderId: order.id },
  });

  const buyerExists = existing.some(
    code => code.userId === order.buyerId,
  );

  const farmerExists = existing.some(
    code => code.userId === order.sellerId,
  );

  await prisma.$transaction(async tx => {
    if (!buyerExists) {
      await tx.participantCode.create({
        data: {
          orderId: order.id,
          userId: order.buyerId,
          role: "BUYER",
          code: verificationCode(),
        },
      });
    }

    if (!farmerExists) {
      let farmerCode = verificationCode();

      const buyerCode = existing.find(
        code => code.userId === order.buyerId,
      )?.code;

      if (buyerCode && farmerCode === buyerCode) {
        farmerCode = verificationCode();
      }

      await tx.participantCode.create({
        data: {
          orderId: order.id,
          userId: order.sellerId,
          role: "FARMER",
          code: farmerCode,
        },
      });
    }
  });
}
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
    await tx.payment.updateMany({ where: { orderId }, data: { status: "EXPIRED" } });
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: fresh.status, toStatus: "CANCELLED" } });
    return cancelled;
  });
}

router.get("/", async (req: AuthRequest, res) => {
  const raw = await prisma.order.findMany({
    where: { OR: [{ buyerId: req.userId! }, { sellerId: req.userId! }] },
    include: { buyer: { select: { firstName: true, lastName: true, roles: { where: { role: "BUYER" }, select: { id: true, roleCode: true } } } }, seller: { select: { firstName: true, lastName: true, roles: { where: { role: "FARMER" }, select: { id: true, roleCode: true } } } }, items: { include: { product: true, listing: true } }, requirement: { include: { items: true } }, shipment: true, assignments: { include: { logistics: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, roles: { where: { role: "LOGISTICS" }, select: { id: true, roleCode: true } } } } } } } }, participantCodes: true, payment: true, statusHistory: true },
    orderBy: { createdAt: "desc" },
  });
  await Promise.all(
    raw
      .filter(o => o.paymentStatus === "PAID")
      .map(o => ensureParticipantCodesForPaidOrder(o.id)),
  );
  await Promise.all(raw.map(o => expireOrderIfNeeded(o.id)));
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: req.userId! }, { sellerId: req.userId! }] },
    include: { buyer: { select: { firstName: true, lastName: true, location: true, roles: { where: { role: "BUYER" }, select: { id: true, roleCode: true } } } }, seller: { select: { firstName: true, lastName: true, location: true, roles: { where: { role: "FARMER" }, select: { id: true, roleCode: true } } } }, items: { include: { product: true, listing: true } }, requirement: { include: { items: true } }, shipment: true, assignments: { include: { logistics: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, roles: { where: { role: "LOGISTICS" }, select: { id: true, roleCode: true } } } } } } } }, participantCodes: true, payment: true, statusHistory: true },
    orderBy: { createdAt: "desc" },
  });
  const safeOrders = await Promise.all(orders.map(async (o: any) => {
    const logisticsAssignmentsWithOfferTime = (o.assignments || []).filter(
      (assignment: any) => assignment.offeredAt,
    );

    const latestLogisticsOffer = logisticsAssignmentsWithOfferTime.reduce(
      (latest: any, assignment: any) =>
        !latest ||
          new Date(assignment.offeredAt).getTime() >
          new Date(latest.offeredAt).getTime()
          ? assignment
          : latest,
      null,
    );

    const acceptedLogisticsAssignment =
      o.assignments?.find((assignment: any) => ["ACCEPTED", "COMPLETED"].includes(String(assignment.status || "").toUpperCase())) ||
      null;

    const logisticsRequestSentAt =
      latestLogisticsOffer?.offeredAt ??
      (o.paymentStatus === "PAID" ? o.payment?.paidAt ?? null : null);

    const logisticsRequestExpiresAt = logisticsRequestSentAt
      ? new Date(
        new Date(logisticsRequestSentAt).getTime() + 60 * 60 * 1000,
      )
      : null;
    const viewerIsBuyer = o.buyerId === req.userId;
    const buyerRole = o.buyer?.roles?.[0];
    const sellerRole = o.seller?.roles?.[0];
    const logisticsAssignment = acceptedLogisticsAssignment || o.assignments?.find((a: any) => a.logistics?.user) || null;
    const logisticsProfile = logisticsAssignment?.logistics ?? null;
    const logisticsUser = logisticsProfile?.user ?? null;
    const logisticsRole = logisticsUser?.roles?.find((r: any) => r.role === "LOGISTICS");
    const logisticsReview = logisticsUser
      ? await prisma.review.findFirst({
          where: { orderId: o.id, reviewerId: req.userId!, revieweeId: logisticsUser.id },
          select: { id: true, rating: true, comment: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : null;
    const buyerRoleCode = buyerRole ? await ensureRoleCode(buyerRole.id, buyerRole.roleCode) : undefined;
    const sellerRoleCode = sellerRole ? await ensureRoleCode(sellerRole.id, sellerRole.roleCode) : undefined;
    const logisticsRoleCode = logisticsRole ? await ensureRoleCode(logisticsRole.id, logisticsRole.roleCode) : undefined;
    return {
      ...o,
      buyerRoleCode,
      sellerRoleCode,
      logisticsRoleCode,
      logisticsProvider: logisticsProfile ? {
        id: logisticsProfile.id,
        roleCode: logisticsRoleCode,
        name: [logisticsUser?.firstName, logisticsUser?.lastName].filter(Boolean).join(" ").trim(),
        phone: logisticsUser?.phone ?? null,
        vehicleType: logisticsProfile.vehicleType ?? null,
        vehicleNumber: logisticsProfile.vehicleNumber ?? null,
        rating: logisticsProfile.rating ?? 0,
        reviews: logisticsProfile.reviews ?? 0,
      } : null,
      logisticsReviewSubmitted: Boolean(logisticsReview),
      logisticsReview: logisticsReview || null,
      logisticsRequestSentAt,
      logisticsRequestExpiresAt,
      logisticsAcceptedAt: acceptedLogisticsAssignment?.acceptedAt ?? null,
      logisticsAccepted: Boolean(acceptedLogisticsAssignment),
      buyer: o.buyer ? { ...o.buyer, location: viewerIsBuyer ? undefined : broadRegion(o.buyer.location) } : o.buyer,
      seller: o.seller ? { ...o.seller, location: viewerIsBuyer ? broadRegion(o.seller.location) : undefined } : o.seller,
      buyerLocation: viewerIsBuyer ? o.buyer?.location : broadRegion(o.buyer?.location),
      sellerLocation: viewerIsBuyer ? broadRegion(o.seller?.location) : o.seller?.location,
      shipment: o.shipment ? { ...o.shipment, pickupLocation: viewerIsBuyer ? broadRegion(o.shipment.pickupLocation) : o.shipment.pickupLocation, deliveryLocation: viewerIsBuyer ? o.shipment.deliveryLocation : broadRegion(o.shipment.deliveryLocation) } : o.shipment
    };
  }));
  res.json({ orders: safeOrders });
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
  const participants = await prisma.user.findMany({ where: { id: { in: [req.userId!, p.data.sellerId] } }, select: { id: true, latitude: true, longitude: true, location: true } });
  const buyer = participants.find(x => x.id === req.userId);
  const seller = participants.find(x => x.id === p.data.sellerId);
  const serverDistance = buyer?.latitude != null && buyer.longitude != null && seller?.latitude != null && seller.longitude != null ? distanceKm(buyer.latitude, buyer.longitude, seller.latitude, seller.longitude) : Math.max(0, p.data.distanceKm);
  const fee = logisticsFee(serverDistance);
  const platform = totalItem * 0.05;
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const orderId = await uniqueOrderId();
    const order = await prisma.$transaction(async tx => {
      const order = await tx.order.create({
        data: {
          id: orderId,
          buyerId: req.userId!, sellerId: p.data.sellerId, requirementId: p.data.requirementId,
          status: "CONFIRMED", paymentStatus: "PENDING", paymentExpiresAt: expires,
          platformFee: platform, logisticsFee: fee, total: totalItem + platform + fee,
          items: { create: [] },
          payment: { create: { amount: totalItem + platform + fee, status: "PENDING", expiresAt: expires } },
          shipment: { create: { status: "CONFIRMED", pickupLocation: seller?.location, deliveryLocation: buyer?.location, pickupLat: seller?.latitude, pickupLng: seller?.longitude, deliveryLat: buyer?.latitude, deliveryLng: buyer?.longitude, distanceKm: serverDistance } },
          statusHistory: { create: { toStatus: "CONFIRMED" } },
        }
      });
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
  try {
    const order = await expireOrderIfNeeded(orderId);
    if (!order || order.buyerId !== req.userId) return res.status(404).json({ error: "Order not found" });
    if (order.paymentStatus === "EXPIRED" || order.status === "CANCELLED") return res.status(409).json({ error: "Payment deadline expired; order cancelled" });
    if (order.paymentStatus === "PAID") return res.json({ order, message: "Payment already completed." });

    const paid = await prisma.$transaction(async tx => {
      const fresh = await tx.order.findUnique({ where: { id: order.id }, include: { payment: true, items: true } });
      if (!fresh || fresh.paymentStatus === "EXPIRED" || fresh.status === "CANCELLED") throw new Error("Payment deadline expired; order cancelled");
      const updated = await tx.order.update({ where: { id: fresh.id }, data: { paymentStatus: "PAID" } });
      await tx.payment.upsert({
        where: { orderId: fresh.id },
        update: { status: "PAID", paidAt: new Date() },
        create: { orderId: fresh.id, amount: fresh.total, status: "PAID", paidAt: new Date(), expiresAt: fresh.paymentExpiresAt },
      });
      await tx.participantCode.upsert({
        where: {
          orderId_userId: {
            orderId: fresh.id,
            userId: fresh.buyerId,
          },
        },
        update: {},
        create: {
          orderId: fresh.id,
          userId: fresh.buyerId,
          role: "BUYER",
          code: verificationCode(),
        },
      });

      await tx.participantCode.upsert({
        where: {
          orderId_userId: {
            orderId: fresh.id,
            userId: fresh.sellerId,
          },
        },
        update: {},
        create: {
          orderId: fresh.id,
          userId: fresh.sellerId,
          role: "FARMER",
          code: verificationCode(),
        },
      });
      const paidOrder = await tx.order.findUnique({
        where: { id: fresh.id },
        include: {
          items: true,
          payment: true,
          shipment: true,
          participantCodes: true,
        },
      });

      if (!paidOrder) {
        throw new Error("Order could not be retrieved after payment");
      }

      return paidOrder;
    });

    try { await dispatchOrder(paid.id); } catch (error) { console.error("logistics dispatch:", error); }

    await notify(order.sellerId, "PAYMENT", "Payment received", `Payment for order ${order.id} is complete.`, "FARMER");
    await notify(order.buyerId, "PAYMENT", "Payment successful", `Payment for order ${order.id} is complete.`, "BUYER");
    return res.json({ order: paid, message: "Demo payment successful. Logistics search started." });
  } catch (e: any) {
    const message = e?.message || "Unable to process payment";
    if (/deadline expired|cancelled/i.test(message)) return res.status(409).json({ error: message });
    console.error("Payment processing failed:", e);
    return res.status(500).json({ error: message });
  }
});

router.post("/:id/retry-logistics", async (req: AuthRequest, res) => {
  const orderId = typeof req.params.id === "string" ? req.params.id : undefined;
  if (!orderId) return res.status(400).json({ error: "Order id is required" });
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { assignments: true } });
  if (!order || order.buyerId !== req.userId) return res.status(404).json({ error: "Order not found" });
  if (order.paymentStatus !== "PAID") return res.status(409).json({ error: "Payment must be completed before retrying logistics." });
  if (order.assignments.some(a => ["ACCEPTED", "COMPLETED"].includes(a.status))) {return res.status(409).json({ error: "A logistics provider has already accepted this order." });}
  try {
    const assignment = await dispatchOrder(order.id, {allowPreviouslyTried: true,});
    if (!assignment) return res.status(409).json({ error: "No online logistics provider currently has enough available capacity." });
    return res.json({ success: true, logisticsRequestSentAt: assignment.offeredAt, logisticsRequestExpiresAt: assignment.expiresAt, assignment, message: "Logistics request sent again." });
  } catch (error: any) {
    console.error("Retry logistics request failed:", error);
    return res.status(500).json({ error: error?.message || "Unable to retry logistics request." });
  }
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
  const p = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    target: z.enum(["FARMER", "LOGISTICS"]).default("FARMER"),
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Rating must be between 1 and 5" });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { assignments: { include: { logistics: { include: { user: true } } } } },
  });
  if (!order || ![order.buyerId, order.sellerId].includes(req.userId!) || order.status !== "DELIVERED") {
    return res.status(403).json({ error: "Review is not available for this order" });
  }

  let revieweeId: string;
  if (p.data.target === "LOGISTICS") {
    if (req.userId !== order.buyerId) {
      return res.status(403).json({ error: "Only the buyer can review the logistics provider" });
    }
    const assignment = order.assignments.find((a: any) => a.status === "ACCEPTED" || a.status === "COMPLETED");
    const logisticsUserId = assignment?.logistics?.user?.id;
    if (!logisticsUserId) return res.status(409).json({ error: "Logistics provider is not available for review" });
    revieweeId = logisticsUserId;
  } else {
    revieweeId = req.userId === order.buyerId ? order.sellerId : order.buyerId;
  }

  const existing = await prisma.review.findFirst({
    where: { orderId: order.id, reviewerId: req.userId!, revieweeId },
    select: { id: true },
  });
  if (existing) return res.status(409).json({ error: "You have already reviewed this provider for this order." });

  const review = await prisma.review.create({
    data: { orderId: order.id, reviewerId: req.userId!, revieweeId, rating: p.data.rating, comment: p.data.comment },
  });

  if (p.data.target === "LOGISTICS") {
    const logisticsReviews = await prisma.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.logisticsProfile.updateMany({
      where: { userId: revieweeId },
      data: {
        rating: Number(logisticsReviews._avg.rating ?? 0),
        reviews: Number(logisticsReviews._count._all ?? 0),
      },
    });
  }

  res.status(201).json({ review });
});

export default router;
