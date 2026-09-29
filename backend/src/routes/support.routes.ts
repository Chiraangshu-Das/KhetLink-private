import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthRequest,
} from "../middleware/auth.js";

const r = Router();

r.use(requireAuth);

r.get(
  "/",
  requireRole("BUYER", "FARMER", "LOGISTICS"),
  async (req: AuthRequest, res) => {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId: req.userId!,
        role: req.role!,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({ tickets });
  }
);

r.post(
  "/",
  requireRole("BUYER", "FARMER", "LOGISTICS"),
  async (req: AuthRequest, res) => {
    const p = z
      .object({
        subject: z.string().min(1),
        message: z.string().min(1),
      })
      .safeParse(req.body);

    if (!p.success) {
      return res.status(400).json({
        error: "Subject and message are required",
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ...p.data,
        userId: req.userId!,
        role: req.role!,
      },
    });

    return res.status(201).json({ ticket });
  }
);

export default r;