import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { ROLE_CODE_PREFIX, TERMS_VERSION, uniqueCode } from "../services/business.js";

const router = Router();
const roleSchema = z.object({ role: z.enum(["BUYER", "FARMER", "LOGISTICS"]), accepted: z.literal(true), termsVersion: z.string().default(TERMS_VERSION) });

router.use(requireAuth);
router.get("/", async (req: AuthRequest, res) => {
  const roles = await prisma.userRole.findMany({ where: { userId: req.userId } });
  res.json({ roles });
});
router.post("/activate", async (req: AuthRequest, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Terms acceptance is required" });
  const { role } = parsed.data;
  const existing = await prisma.userRole.findUnique({ where: { userId_role: { userId: req.userId!, role } } });
  if (existing) return res.json({ role: existing });
  const roleCode = await uniqueCode(ROLE_CODE_PREFIX[role]);
  const created = await prisma.$transaction(async tx => {
    const roleRow = await tx.userRole.create({ data: { userId: req.userId!, role, termsAccepted: true, termsVersion: TERMS_VERSION, termsAcceptedAt: new Date(), roleCode } });
    if (role === "FARMER") await tx.farmerProfile.create({ data: { userId: req.userId! } });
    if (role === "BUYER") await tx.buyerProfile.create({ data: { userId: req.userId! } });
    if (role === "LOGISTICS") await tx.logisticsProfile.create({ data: { userId: req.userId!, availableCapacity: 0 } });
    return roleRow;
  });
  res.status(201).json({ role: created });
});
export default router;
