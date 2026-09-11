import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
const router = Router();
router.get("/", async (_req, res) => res.json(await prisma.product.findMany({ include: { category: true }, orderBy: { name: "asc" } })));

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const role = await prisma.userRole.findUnique({ where: { userId_role: { userId: req.userId!, role: "FARMER" } } });
  if (!role) return res.status(403).json({ error: "Farmer role required" });
  const parsed = z.object({ name: z.string().trim().min(1), category: z.string().trim().min(1).default("Other"), imageUrl: z.string().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid catalog product" });
  const name = parsed.data.name;
  const category = await prisma.productCategory.upsert({ where: { name: parsed.data.category }, update: {}, create: { name: parsed.data.category } });
  const product = await prisma.product.upsert({ where: { name }, update: { imageUrl: parsed.data.imageUrl ?? undefined, categoryId: category.id }, create: { name, imageUrl: parsed.data.imageUrl ?? null, categoryId: category.id }, include: { category: true } });
  res.status(201).json({ product });
});
router.get("/categories", async (_req, res) => res.json(await prisma.productCategory.findMany({ orderBy: { name: "asc" } })));
export default router;
