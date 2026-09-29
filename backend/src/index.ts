import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./auth.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import listingsRoutes from "./routes/listings.routes.js";
import requirementsRoutes from "./routes/requirements.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import logisticsRoutes from "./routes/logistics.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import supportRoutes from "./routes/support.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import { prisma } from "../lib/prisma.js";
import integrationsRoutes from "./routes/integrations.routes.js";
import { requireAuth, type AuthRequest } from "./middleware/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",  // Next.js dev server
  credentials: true,                // Allow cookies cross-origin
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/requirements", requirementsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/logistics", logisticsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/integrations", integrationsRoutes);

app.get("/api/sync/version", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const [user, listing, requirement, offer, order, shipment, support] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { updatedAt: true } }),
    prisma.listing.aggregate({ where: { farmerId: userId }, _max: { updatedAt: true } }),
    prisma.requirement.aggregate({ where: { buyerId: userId }, _max: { updatedAt: true } }),
    prisma.offer.aggregate({ where: { OR: [{ farmerId: userId }, { requirement: { buyerId: userId } }] }, _max: { updatedAt: true } }),
    prisma.order.aggregate({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, _max: { updatedAt: true } }),
    prisma.shipment.aggregate({ where: { order: { OR: [{ buyerId: userId }, { sellerId: userId }] } }, _max: { updatedAt: true } }),
    prisma.supportTicket.aggregate({ where: { userId }, _max: { updatedAt: true } }),
  ]);
  const values = [
    user?.updatedAt, listing._max.updatedAt, requirement._max.updatedAt, offer._max.updatedAt,
    order._max.updatedAt, shipment._max.updatedAt, support._max.updatedAt,
  ].filter(Boolean).map(value => (value as Date).getTime());
  res.json({ version: values.length ? Math.max(...values) : 0 });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────


// Server-side payment expiry enforcement. This keeps cancellation independent
// from browser timers and restores reserved inventory atomically.
setInterval(async () => {
  try {
    const expired = await prisma.order.findMany({ where: { paymentStatus: "PENDING", paymentExpiresAt: { lt: new Date() } }, select: { id: true } });
    for (const item of expired) {
      const order = await prisma.order.findUnique({ where: { id: item.id }, include: { items: true } });
      if (!order || order.paymentStatus !== "PENDING") continue;
      await prisma.$transaction(async tx => {
        const fresh = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
        if (!fresh || fresh.paymentStatus !== "PENDING" || !fresh.paymentExpiresAt || fresh.paymentExpiresAt >= new Date()) return;
        for (const oi of fresh.items) if (oi.listingId) await tx.listing.update({ where: { id: oi.listingId }, data: { quantity: { increment: oi.quantity } } });
        await tx.order.update({ where: { id: fresh.id }, data: { paymentStatus: "EXPIRED", status: "CANCELLED" } });
        await tx.payment.updateMany({ where: { orderId: fresh.id }, data: { status: "EXPIRED" } });
        await tx.orderStatusHistory.create({ data: { orderId: fresh.id, fromStatus: fresh.status, toStatus: "CANCELLED" } });
      });
      const expiredOrder = await prisma.order.findUnique({ where: { id: item.id }, select: { buyerId: true, sellerId: true } });
      if (expiredOrder) {
        await Promise.all([
          prisma.notification.create({ data: { userId: expiredOrder.buyerId, role: "BUYER", type: "PAYMENT", title: "Order cancelled", message: `Payment was not completed within one hour for order ${item.id}.`, } }),
          prisma.notification.create({ data: { userId: expiredOrder.sellerId, role: "FARMER", type: "ORDER", title: "Order cancelled", message: `Order ${item.id} was cancelled because payment was not completed within one hour.`, } }),
        ]);
      }
    }
  } catch (error) { console.error("payment expiry worker:", error); }
}, 60_000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌾 KhetLink backend running on port ${PORT}`);
});
export default app;
