import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

const schema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  price: z.number().positive(),
  status: z
    .enum(["Active", "Sold", "Paused"])
    .default("Active"),
});

router.get("/", async (req: AuthRequest, res) => {
  const listings = await prisma.listing.findMany({
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json({
    listings,
  });
});

router.get("/mine", async (req: AuthRequest, res) => {
  const listings = await prisma.listing.findMany({
    where: {
      farmerId: req.userId!,
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json({
    listings,
  });
});

router.post("/", async (req: AuthRequest, res) => {
  const p = schema.safeParse(req.body);

  if (!p.success) {
    return res.status(400).json({
      error: "Invalid listing",
      details: p.error.flatten(),
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

  const listing = await prisma.listing.create({
    data: {
      ...p.data,
      farmerId: req.userId!,
    },
  });

  return res.status(201).json(listing);
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const p = schema.partial().safeParse(req.body);

  if (!p.success) {
    return res.status(400).json({
      error: "Invalid listing",
    });
  }

  const listingId = String(req.params.id);

  const own = await prisma.listing.findFirst({
    where: {
      id: listingId,
      farmerId: req.userId!,
    },
  });

  if (!own) {
    return res.status(404).json({
      error: "Listing not found",
    });
  }

  const listing = await prisma.listing.update({
    where: {
      id: own.id,
    },
    data: p.data,
  });

  return res.json(listing);
});

export default router;