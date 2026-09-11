import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";
import { notify } from "../services/business.js";

const router = Router();

router.use(requireAuth);

async function profile(userId: string) {
  return prisma.logisticsProfile.findUnique({
    where: {
      userId,
    },
  });
}

router.get(
  "/offers",
  async (req: AuthRequest, res) => {
    const logisticsProfile = await profile(
      req.userId!,
    );

    if (!logisticsProfile) {
      return res.status(403).json({
        error: "Logistics role required",
      });
    }

    const assignments =
      await prisma.logisticsAssignment.findMany({
        where: {
          logisticsId: logisticsProfile.id,
          status: "OFFERED",
        },
        orderBy: {
          offeredAt: "desc",
        },
      });

    const offers = await Promise.all(
      assignments.map(async (assignment) => {
        const order =
          await prisma.order.findUnique({
            where: {
              id: assignment.orderId,
            },
          });

        if (!order) {
          return {
            ...assignment,
            order: null,
          };
        }

        const items =
          await prisma.orderItem.findMany({
            where: {
              orderId: order.id,
            },
            include: {
              product: true,
            },
          });

        const shipment =
          await prisma.shipment.findUnique({
            where: {
              orderId: order.id,
            },
          });

        return {
          ...assignment,
          order: {
            ...order,
            items,
            shipment,
          },
        };
      }),
    );

    return res.json({
      offers,
    });
  },
);

router.post(
  "/offers/:id/accept",
  async (req: AuthRequest, res) => {
    const logisticsProfile = await profile(
      req.userId!,
    );

    if (!logisticsProfile) {
      return res.status(403).json({
        error: "Logistics role required",
      });
    }

    const assignmentId = String(
      req.params.id,
    );

    const assignment =
      await prisma.logisticsAssignment.findFirst({
        where: {
          id: assignmentId,
          logisticsId: logisticsProfile.id,
          status: "OFFERED",
        },
      });

    if (!assignment) {
      return res.status(404).json({
        error: "Offer not found",
      });
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: assignment.orderId,
        },
      });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    const items =
      await prisma.orderItem.findMany({
        where: {
          orderId: order.id,
        },
      });

    const qty = items.reduce(
      (sum: number, item: { quantity: number }) =>
        sum + item.quantity,
      0,
    );

    if (
      qty > logisticsProfile.availableCapacity
    ) {
      return res.status(409).json({
        error: "Capacity exceeded",
      });
    }

    const updated =
      await prisma.$transaction(async (tx) => {
        const freshProfile =
          await tx.logisticsProfile.findUnique({
            where: {
              id: logisticsProfile.id,
            },
          });

        if (!freshProfile) {
          throw new Error(
            "Logistics profile not found",
          );
        }

        if (
          freshProfile.availableCapacity <
          qty
        ) {
          throw new Error(
            "Capacity exceeded",
          );
        }

        const updatedAssignment =
          await tx.logisticsAssignment.update({
            where: {
              id: assignment.id,
            },
            data: {
              status: "ACCEPTED",
              acceptedAt: new Date(),
            },
          });

        await tx.logisticsProfile.update({
          where: {
            id: logisticsProfile.id,
          },
          data: {
            availableCapacity: {
              decrement: qty,
            },
          },
        });

        return updatedAssignment;
      });

    await notify(
      order.buyerId,
      "SHIPMENT",
      "Logistics assigned",
      "A logistics provider has accepted your paid order.",
      "BUYER",
    );

    await notify(
      order.sellerId,
      "SHIPMENT",
      "Logistics assigned",
      "A logistics provider has been assigned to the order.",
      "FARMER",
    );

    return res.json({
      assignment: updated,
    });
  },
);

router.post(
  "/offers/:id/decline",
  async (req: AuthRequest, res) => {
    const logisticsProfile = await profile(
      req.userId!,
    );

    if (!logisticsProfile) {
      return res.status(403).json({
        error: "Logistics role required",
      });
    }

    const assignmentId = String(
      req.params.id,
    );

    const assignment =
      await prisma.logisticsAssignment.findFirst({
        where: {
          id: assignmentId,
          logisticsId: logisticsProfile.id,
          status: "OFFERED",
        },
      });

    if (!assignment) {
      return res.status(404).json({
        error: "Offer not found",
      });
    }

    const updated =
      await prisma.logisticsAssignment.update({
        where: {
          id: assignment.id,
        },
        data: {
          status: "DECLINED",
        },
      });

    return res.json({
      assignment: updated,
    });
  },
);

router.post(
  "/location",
  async (req: AuthRequest, res) => {
    const parsed = z
      .object({
        orderId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        location: z.string().optional(),
        distanceKm: z
          .number()
          .nonnegative()
          .optional(),
        etaMinutes: z
          .number()
          .int()
          .nonnegative()
          .optional(),
        routeJson: z.string().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid location",
      });
    }

    const logisticsProfile = await profile(
      req.userId!,
    );

    if (!logisticsProfile) {
      return res.status(403).json({
        error: "Logistics role required",
      });
    }

    const assignment =
      await prisma.logisticsAssignment.findFirst({
        where: {
          orderId: parsed.data.orderId,
          logisticsId: logisticsProfile.id,
          status: "ACCEPTED",
        },
      });

    if (!assignment) {
      return res.status(403).json({
        error: "Assignment not found",
      });
    }

    const shipmentData: {
      currentLat: number;
      currentLng: number;
      currentLocation?: string;
      distanceKm?: number;
      etaMinutes?: number;
      routeJson?: string;
    } = {
      currentLat: parsed.data.latitude,
      currentLng: parsed.data.longitude,
    };

    if (
      parsed.data.location !== undefined
    ) {
      shipmentData.currentLocation =
        parsed.data.location;
    }

    if (
      parsed.data.distanceKm !== undefined
    ) {
      shipmentData.distanceKm =
        parsed.data.distanceKm;
    }

    if (
      parsed.data.etaMinutes !== undefined
    ) {
      shipmentData.etaMinutes =
        parsed.data.etaMinutes;
    }

    if (
      parsed.data.routeJson !== undefined
    ) {
      shipmentData.routeJson =
        parsed.data.routeJson;
    }

    const shipment =
      await prisma.shipment.update({
        where: {
          orderId: parsed.data.orderId,
        },
        data: shipmentData,
      });

    return res.json({
      shipment,
    });
  },
);

router.post(
  "/:orderId/verify",
  async (req: AuthRequest, res) => {
    const parsed = z
      .object({
        code: z
          .string()
          .regex(
            /^[A-Z0-9]{4}$/,
          ),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error:
          "Verification code must be exactly 4 alphanumeric characters",
      });
    }

    const logisticsProfile = await profile(
      req.userId!,
    );

    if (!logisticsProfile) {
      return res.status(403).json({
        error: "Logistics role required",
      });
    }

    const orderId = String(
      req.params.orderId,
    );

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
      });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    const assignment =
      await prisma.logisticsAssignment.findFirst({
        where: {
          orderId: order.id,
          logisticsId: logisticsProfile.id,
          status: "ACCEPTED",
        },
      });

    if (!assignment) {
      return res.status(403).json({
        error:
          "You are not assigned to this order",
      });
    }

    const participantCodes =
      await prisma.participantCode.findMany({
        where: {
          orderId: order.id,
        },
      });

    const farmerCode =
      participantCodes.find(
        (code) => code.role === "FARMER",
      );

    const buyerCode =
      participantCodes.find(
        (code) => code.role === "BUYER",
      );

    const shipment =
      await prisma.shipment.findUnique({
        where: {
          orderId: order.id,
        },
      });

    const codeMatchesFarmer =
      farmerCode?.code ===
      parsed.data.code;

    const codeMatchesBuyer =
      buyerCode?.code ===
      parsed.data.code;

    if (
      shipment?.status === "CONFIRMED" &&
      !codeMatchesFarmer
    ) {
      return res.status(400).json({
        error: "Farmer verification failed",
      });
    }

    if (
      shipment?.status === "IN_TRANSIT" &&
      !codeMatchesBuyer
    ) {
      return res.status(400).json({
        error: "Buyer verification failed",
      });
    }

    let nextStatus =
      shipment?.status;

    if (nextStatus === "CONFIRMED") {
      nextStatus = "PROCESSING";
    } else if (
      nextStatus === "PROCESSING"
    ) {
      nextStatus = "IN_TRANSIT";
    } else if (
      nextStatus === "IN_TRANSIT"
    ) {
      nextStatus = "DELIVERED";
    } else {
      return res.status(409).json({
        error: "Invalid shipment state",
      });
    }

    const updatedShipment =
      await prisma.shipment.update({
        where: {
          orderId: order.id,
        },
        data: {
          status: nextStatus,
        },
      });

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: nextStatus,
      },
    });

    return res.json({
      shipment: updatedShipment,
    });
  },
);

export default router;