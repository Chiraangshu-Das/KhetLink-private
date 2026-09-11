import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

export interface AuthRequest extends Request { userId?: string }
const secret = process.env.JWT_SECRET;

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token || !secret) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, secret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(...roles: Array<"BUYER" | "FARMER" | "LOGISTICS">) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
    const active = await prisma.userRole.findFirst({ where: { userId: req.userId, role: { in: roles } } });
    if (!active) return res.status(403).json({ error: "Required role is not activated" });
    next();
  };
}
