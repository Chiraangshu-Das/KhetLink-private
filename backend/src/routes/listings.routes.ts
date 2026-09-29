import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { kgEquivalent, logisticsFee, ensureRoleCode } from "../services/business.js";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  price: z.number().positive(),
  status: z.enum(["Active", "Sold", "Paused"]).default("Active"),
});

const distanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return Math.round(
    r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10
  ) / 10;
};

const fromKg = (quantity: number, unit: string) =>
  unit === "ton"
    ? quantity / 1000
    : unit === "dozen"
      ? quantity / 12
      : quantity;

const broadRegion = (location?: string | null) => {
  const parts = String(location || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter(
      (x) =>
        x !== "India" &&
        !/^\d{6}$/.test(x)
    );

  return parts.length >= 2
    ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
    : parts[0] || "Location not shared";
};

router.get("/", async (req: AuthRequest, res) => {
  const viewer = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      latitude: true,
      longitude: true,
    },
  });

  const rows = await prisma.listing.findMany({
    where: {
      status: "Active",
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      farmer: {
        include: {
          farmer: true,
          roles: {
            where: {
              role: "FARMER",
            },
            select: {
              id: true,
              roleCode: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const ids = [...new Set(rows.map((x) => x.farmerId))];

  const reviews = await prisma.review.findMany({
    where: {
      revieweeId: {
        in: ids,
      },
    },
    include: {
      reviewer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const ratingMap = new Map<
    string,
    {
      sum: number;
      count: number;
    }
  >();

  const reviewMap = new Map<string, any[]>();

  for (const review of reviews) {
    const value = ratingMap.get(review.revieweeId) || {
      sum: 0,
      count: 0,
    };

    value.sum += review.rating;
    value.count++;

    ratingMap.set(review.revieweeId, value);

    const list = reviewMap.get(review.revieweeId) || [];

    list.push({
      id: review.id,
      orderId: review.orderId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewerName:
        [review.reviewer.firstName, review.reviewer.lastName]
          .filter(Boolean)
          .join(" ") || "Buyer",
    });

    reviewMap.set(review.revieweeId, list);
  }

  const listings = await Promise.all(
    rows.map(async (row) => {
      const rating = ratingMap.get(row.farmerId);

      const distance =
        viewer?.latitude != null &&
        viewer.longitude != null &&
        row.farmer.latitude != null &&
        row.farmer.longitude != null
          ? distanceKm(
              viewer.latitude,
              viewer.longitude,
              row.farmer.latitude,
              row.farmer.longitude
            )
          : null;

      const farmerRole = row.farmer.roles?.[0];

      const roleCode = farmerRole
        ? await ensureRoleCode(
            farmerRole.id,
            farmerRole.roleCode
          )
        : undefined;

      return {
        ...row,

        logisticsFee:
          distance == null
            ? null
            : logisticsFee(distance),

        farmer: {
          id: row.farmer.id,
          roleCode,

          firstName: row.farmer.firstName,
          lastName: row.farmer.lastName,
          profileImage: row.farmer.profileImage,

          location: broadRegion(
            row.farmer.location
          ),

          farmer: row.farmer.farmer
            ? {
                id: row.farmer.farmer.id,
                farmName: row.farmer.farmer.farmName,
                landAcres: row.farmer.farmer.landAcres,
                verified: row.farmer.farmer.verified,
              }
            : null,

          rating: rating?.count
            ? Math.round(
                (rating.sum / rating.count) * 10
              ) / 10
            : null,

          reviews: rating?.count || 0,
        },

        distanceKm: distance,

        reviewDetails:
          reviewMap.get(row.farmerId) || [],
      };
    })
  );

  return res.json({
    listings,
  });
});

router.get(
  "/mine",
  async (req: AuthRequest, res) =>
    res.json({
      listings: await prisma.listing.findMany({
        where: {
          farmerId: req.userId!,
        },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    })
);

router.post("/", async (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid listing",
      details: parsed.error.flatten(),
    });
  }

  const role = await prisma.userRole.findUnique({
    where: {
      userId_role: {
        userId: req.userId!,
        role: "FARMER",
      },
    },
  });

  if (!role) {
    return res.status(403).json({
      error: "Farmer role required",
    });
  }

  const existing = await prisma.listing.findFirst({
    where: {
      farmerId: req.userId!,
      productId: parsed.data.productId,
      status: "Active",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existing) {
    const totalKg =
      kgEquivalent(
        existing.quantity,
        existing.unit
      ) +
      kgEquivalent(
        parsed.data.quantity,
        parsed.data.unit
      );

    const merged = await prisma.listing.update({
      where: {
        id: existing.id,
      },
      data: {
        quantity: fromKg(
          totalKg,
          parsed.data.unit
        ),
        unit: parsed.data.unit,
        price: parsed.data.price,
        status: "Active",
      },
    });

    return res.status(200).json(merged);
  }

  return res.status(201).json(
    await prisma.listing.create({
      data: {
        ...parsed.data,
        farmerId: req.userId!,
      },
    })
  );
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const parsed = schema.partial().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid listing",
    });
  }

  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : null;

  if (!id) {
    return res.status(400).json({
      error: "Invalid listing id",
    });
  }

  const own = await prisma.listing.findFirst({
    where: {
      id,
      farmerId: req.userId!,
    },
  });

  if (!own) {
    return res.status(404).json({
      error: "Listing not found",
    });
  }

  return res.json(
    await prisma.listing.update({
      where: {
        id: own.id,
      },
      data: parsed.data,
    })
  );
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : null;

  if (!id) {
    return res.status(400).json({
      error: "Invalid listing id",
    });
  }

  const own = await prisma.listing.findFirst({
    where: {
      id,
      farmerId: req.userId!,
    },
  });

  if (!own) {
    return res.status(404).json({
      error: "Listing not found",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.updateMany({
      where: {
        listingId: id,
      },
      data: {
        listingId: null,
      },
    });

    await tx.offerItem.deleteMany({
      where: {
        listingId: id,
      },
    });

    await tx.listing.delete({
      where: {
        id,
      },
    });
  });

  return res.json({
    ok: true,
  });
});

export default router;