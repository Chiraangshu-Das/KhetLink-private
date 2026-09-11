import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: req.userId!,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return res.json({
    notifications,
  });
});

router.post("/:id/read", async (req: AuthRequest, res) => {
  const notificationId = String(req.params.id);

  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: req.userId!,
    },
    data: {
      read: true,
    },
  });

  return res.json({
    notification,
  });
});

export default router;