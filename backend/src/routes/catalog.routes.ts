import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
const router = Router();
router.get("/", async (_req, res) => res.json(await prisma.product.findMany({ include: { category: true }, orderBy: { name: "asc" } })));
router.get("/categories", async (_req, res) => res.json(await prisma.productCategory.findMany({ orderBy: { name: "asc" } })));
export default router;
