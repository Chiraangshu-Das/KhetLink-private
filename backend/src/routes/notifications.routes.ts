import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const r = Router();
r.use(requireAuth);
const roleSchema = z.enum(["BUYER", "FARMER", "LOGISTICS"]);

r.get("/", async (req: AuthRequest, res) => {
  const parsed = roleSchema.safeParse(req.query.role);
  const role = parsed.success ? parsed.data : undefined;
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId!, ...(role ? { role } : {}) },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return res.json({ notifications });
});

r.post("/:id/read", async (req: AuthRequest, res) => {
  const id = typeof req.params.id === "string" ? req.params.id : null;
  if (!id) return res.status(400).json({ error: "Invalid notification id" });
  const result = await prisma.notification.updateMany({ where: { id, userId: req.userId! }, data: { read: true } });
  if (!result.count) return res.status(404).json({ error: "Notification not found" });
  return res.json({ notification: { id, read: true } });
});

export default r;
