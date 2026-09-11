import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { kgEquivalent, notify } from "../services/business.js";

const router = Router();
router.use(requireAuth);

const item = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  minPrice: z.number().nonnegative(),
  maxPrice: z.number().positive(),
  requiredBy: z.string().datetime().optional(),
  location: z.string().optional(),
});

const create = z.object({
  location: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  items: z.array(item).min(1),
});

/* -------------------------------------------------------------------------- */
/* GET BUYER REQUIREMENTS                                                     */
/* -------------------------------------------------------------------------- */

router.get("/", async (req: AuthRequest, res) => {
  const requirements = await prisma.requirement.findMany({
    where: {
      buyerId: req.userId!,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      offers: {
        include: {
          farmer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          items: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json({ requirements });
});

/* -------------------------------------------------------------------------- */
/* CREATE REQUIREMENT                                                         */
/* -------------------------------------------------------------------------- */

router.post("/", async (req: AuthRequest, res) => {
  const parsed = create.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid requirement",
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  const requirement = await prisma.$transaction(async (tx) => {
    return tx.requirement.create({
        data: {
          buyerId: req.userId!,
          ...(data.location !== undefined
            ? { location: data.location }
            : {}),
          ...(data.latitude !== undefined
            ? { latitude: data.latitude }
            : {}),
          ...(data.longitude !== undefined
            ? { longitude: data.longitude }
            : {}),
          status: "PENDING",

          items: {
          create: data.items.map((i) => ({
            product: {
              connect: {
                id: i.productId,
              },
            },
            quantity: i.quantity,
            unit: i.unit,
            minPrice: i.minPrice,
            maxPrice: i.maxPrice,
            ...(i.requiredBy
              ? {
                  requiredBy: new Date(i.requiredBy),
                }
              : {}),
            ...(i.location
              ? {
                  location: i.location,
                }
              : {}),
          })),
        },
      },
    });
  });

  const listings = await prisma.listing.findMany({
    where: {
      status: "Active",
    },
    include: {
      farmer: {
        include: {
          farmer: true,
        },
      },
      product: true,
    },
  });

  const matchedFarmerIds = new Set<string>();
  let canFulfil = true;

  for (const requested of data.items) {
    let remaining = kgEquivalent(
      requested.quantity,
      requested.unit
    );

    const candidates = listings
      .filter(
        (listing) =>
          listing.productId === requested.productId &&
          listing.price >= requested.minPrice &&
          listing.price <= requested.maxPrice &&
          kgEquivalent(listing.quantity, listing.unit) > 0
      )
      .sort(
        (a, b) =>
          kgEquivalent(b.quantity, b.unit) -
          kgEquivalent(a.quantity, a.unit)
      );

    for (const listing of candidates) {
      if (remaining <= 0) {
        break;
      }

      const available = kgEquivalent(
        listing.quantity,
        listing.unit
      );

      const take = Math.min(available, remaining);

      if (take > 0) {
        matchedFarmerIds.add(listing.farmerId);
        remaining -= take;
      }
    }

    if (remaining > 0) {
      canFulfil = false;
    }
  }

  if (!canFulfil) {
    await prisma.requirement.update({
      where: {
        id: requirement.id,
      },
      data: {
        status: "NOT_FOUND",
      },
    });
  }

  return res.status(201).json({
    requirementId: requirement.id,
    matchedFarmers: [...matchedFarmerIds],
    status: canFulfil ? "PENDING" : "NOT_FOUND",
  });
});

/* -------------------------------------------------------------------------- */
/* BUYER CREATES / UPDATES OFFER TO FARMER                                    */
/* -------------------------------------------------------------------------- */

router.post("/:id/offer", async (req: AuthRequest, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;

  if (!id) {
    return res.status(400).json({
      error: "Invalid requirement id",
    });
  }

  const parsed = z
    .object({
      farmerId: z.string(),
      offeredPrice: z.number().positive(),
      items: z.array(
        z.object({
          listingId: z.string(),
          quantity: z.number().positive(),
        })
      ),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid offer",
    });
  }

  const data = parsed.data;

  const requirement = await prisma.requirement.findFirst({
    where: {
      id,
      buyerId: req.userId!,
    },
    include: {
      items: true,
    },
  });

  if (!requirement) {
    return res.status(404).json({
      error: "Requirement not found",
    });
  }

  const listings = await prisma.listing.findMany({
    where: {
      id: {
        in: data.items.map((i) => i.listingId),
      },
      farmerId: data.farmerId,
      status: "Active",
    },
  });

  if (listings.length !== data.items.length) {
    return res.status(400).json({
      error: "Invalid listings",
    });
  }

  for (const requestedItem of data.items) {
    const listing = listings.find(
      (x) => x.id === requestedItem.listingId
    );

    if (!listing) {
      return res.status(400).json({
        error: "Invalid listing",
      });
    }

    if (requestedItem.quantity > listing.quantity) {
      return res.status(409).json({
        error: "Insufficient inventory",
      });
    }
  }

  const offer = await prisma.$transaction(async (tx) => {
    return tx.offer.upsert({
      where: {
        requirementId_farmerId: {
          requirementId: requirement.id,
          farmerId: data.farmerId,
        },
      },

      update: {
        offeredPrice: data.offeredPrice,
        status: "OFFERED",
        items: {
          deleteMany: {},
          create: data.items.map((i) => ({
            listing: {
              connect: {
                id: i.listingId,
              },
            },
            quantity: i.quantity,
          })),
        },
      },

      create: {
        requirementId: requirement.id,
        farmerId: data.farmerId,
        offeredPrice: data.offeredPrice,
        originalPrice: data.offeredPrice,
        status: "OFFERED",

        items: {
          create: data.items.map((i) => ({
            listing: {
              connect: {
                id: i.listingId,
              },
            },
            quantity: i.quantity,
          })),
        },
      },
    });
  });

  await notify(
    data.farmerId,
    "REQUEST",
    "New buyer request",
    "A new KhetLink procurement request is waiting for your response.",
    "FARMER"
  );

  return res.status(201).json({
    offer,
  });
});

/* -------------------------------------------------------------------------- */
/* BUYER COUNTER OFFER                                                        */
/* -------------------------------------------------------------------------- */

router.post("/:id/counter", async (req: AuthRequest, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;

  if (!id) {
    return res.status(400).json({
      error: "Invalid requirement id",
    });
  }

  const parsed = z
    .object({
      farmerId: z.string(),
      price: z.number().positive(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid counter offer",
    });
  }

  const offer = await prisma.offer.findFirst({
    where: {
      requirementId: id,
      farmerId: parsed.data.farmerId,
      requirement: {
        buyerId: req.userId!,
      },
    },
  });

  if (!offer) {
    return res.status(404).json({
      error: "Offer not found",
    });
  }

  const updated = await prisma.offer.update({
    where: {
      id: offer.id,
    },
    data: {
      offeredPrice: parsed.data.price,
      status: "COUNTERED",
      buyerConfirmed: false,
      farmerConfirmed: false,
    },
  });

  return res.json({
    offer: updated,
  });
});

/* -------------------------------------------------------------------------- */
/* BUYER DECLINES FARMER OFFER                                                */
/* -------------------------------------------------------------------------- */

router.post("/:id/decline", async (req: AuthRequest, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;

  if (!id) {
    return res.status(400).json({
      error: "Invalid requirement id",
    });
  }

  const parsed = z
    .object({
      farmerId: z.string(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Farmer is required",
    });
  }

  const offer = await prisma.offer.findFirst({
    where: {
      requirementId: id,
      farmerId: parsed.data.farmerId,
      requirement: {
        buyerId: req.userId!,
      },
    },
  });

  if (!offer) {
    return res.status(404).json({
      error: "Offer not found",
    });
  }

  const updated = await prisma.offer.update({
    where: {
      id: offer.id,
    },
    data: {
      status: "REJECTED",
      buyerConfirmed: false,
    },
  });

  return res.json({
    offer: updated,
  });
});

/* -------------------------------------------------------------------------- */
/* BUYER ACCEPTS FARMER OFFER                                                 */
/* -------------------------------------------------------------------------- */

router.post("/:id/accept", async (req: AuthRequest, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;

  if (!id) {
    return res.status(400).json({
      error: "Invalid requirement id",
    });
  }

  const parsed = z
    .object({
      farmerId: z.string(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Farmer is required",
    });
  }

  const offer = await prisma.offer.findFirst({
    where: {
      requirementId: id,
      farmerId: parsed.data.farmerId,
      requirement: {
        buyerId: req.userId!,
      },
    },
    include: {
      items: {
        include: {
          listing: true,
        },
      },
      requirement: true,
    },
  });

  if (!offer) {
    return res.status(404).json({
      error: "Offer not found",
    });
  }

  const updated = await prisma.offer.update({
    where: {
      id: offer.id,
    },
    data: {
      buyerConfirmed: true,
      status: offer.farmerConfirmed
        ? "ACCEPTED"
        : "NEGOTIATING",
    },
  });

  if (updated.farmerConfirmed) {
    const exists = await prisma.order.findFirst({
      where: {
        requirementId: offer.requirementId,
        sellerId: offer.farmerId,
      },
    });

    if (!exists) {
      const itemRows = await prisma.offerItem.findMany({
        where: {
          offerId: offer.id,
        },
        include: {
          listing: true,
        },
      });

      const total =
        updated.offeredPrice *
        itemRows.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

      const expiresAt = new Date(
        Date.now() + 60 * 60 * 1000
      );

      await prisma.order.create({
        data: {
          buyerId: req.userId!,
          sellerId: offer.farmerId,
          requirementId: offer.requirementId,
          status: "CONFIRMED",
          paymentStatus: "PENDING",
          paymentExpiresAt: expiresAt,
          platformFee: total * 0.05,
          logisticsFee: 0,
          total: total * 1.05,

          items: {
            create: itemRows.map((item) => ({
              productId: item.listing.productId,
              listingId: item.listingId,
              quantity: item.quantity,
              unit: item.listing.unit,
              unitPrice: updated.offeredPrice,
            })),
          },

          payment: {
            create: {
              amount: total * 1.05,
              status: "PENDING",
              expiresAt,
            },
          },

          shipment: {
            create: {
              status: "CONFIRMED",
            },
          },

          statusHistory: {
            create: {
              toStatus: "CONFIRMED",
            },
          },
        },
      });

      await prisma.requirement.update({
        where: {
          id: offer.requirementId,
        },
        data: {
          status: "CONFIRMED",
        },
      });
    }
  }

  return res.json({
    message: "Offer accepted",
    offerId: offer.id,
    orderCreated: updated.farmerConfirmed,
  });
});

/* -------------------------------------------------------------------------- */
/* FARMER RESPONDS TO BUYER REQUIREMENT                                       */
/* -------------------------------------------------------------------------- */

router.post(
  "/:id/farmer-response",
  async (req: AuthRequest, res) => {
    const id =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;

    if (!id) {
      return res.status(400).json({
        error: "Invalid requirement id",
      });
    }

    const parsed = z
      .object({
        action: z.enum([
          "accept",
          "decline",
          "counter",
        ]),
        price: z.number().positive().optional(),
        items: z
          .array(
            z.object({
              listingId: z.string(),
              quantity: z.number().positive(),
            })
          )
          .optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid farmer response",
      });
    }

    const data = parsed.data;

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

    const requirement =
      await prisma.requirement.findUnique({
        where: {
          id,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!requirement) {
      return res.status(404).json({
        error: "Requirement not found",
      });
    }

    /* ------------------------------ DECLINE ------------------------------ */

    if (data.action === "decline") {
      const offer =
        await prisma.offer.findUnique({
          where: {
            requirementId_farmerId: {
              requirementId: requirement.id,
              farmerId: req.userId!,
            },
          },
        });

      if (offer) {
        await prisma.offer.update({
          where: {
            id: offer.id,
          },
          data: {
            status: "REJECTED",
            farmerConfirmed: false,
          },
        });
      }

      return res.json({
        status: "REJECTED",
      });
    }

    /* ---------------------------- FIND LISTINGS --------------------------- */

    const listings = await prisma.listing.findMany({
      where: {
        farmerId: req.userId!,
        status: "Active",
        productId: {
          in: requirement.items.map(
            (i) => i.productId
          ),
        },
      },
    });

    const requestedItems =
      data.items?.length
        ? data.items
        : requirement.items.flatMap(
            (requirementItem) => {
              const listing = listings.find(
                (x) =>
                  x.productId ===
                    requirementItem.productId &&
                  x.quantity > 0
              );

              return listing
                ? [
                    {
                      listingId: listing.id,
                      quantity: Math.min(
                        requirementItem.quantity,
                        listing.quantity
                      ),
                    },
                  ]
                : [];
            }
          );

    if (!requestedItems.length) {
      return res.status(409).json({
        error: "No matching inventory",
      });
    }

    /* -------------------------- CHECK INVENTORY --------------------------- */

    for (const requestedItem of requestedItems) {
      const listing = listings.find(
        (x) => x.id === requestedItem.listingId
      );

      if (
        !listing ||
        requestedItem.quantity > listing.quantity
      ) {
        return res.status(409).json({
          error: "Insufficient inventory",
        });
      }
    }

    /* ---------------------------- CALCULATE PRICE ------------------------- */

    const calculatedPrice =
      requestedItems.reduce(
        (sum, requestedItem) => {
          const listing = listings.find(
            (l) => l.id === requestedItem.listingId
          );

          return (
            sum +
            (listing?.price ?? 0)
          );
        },
        0
      ) / requestedItems.length;

    const basePrice =
      data.price ?? Math.round(calculatedPrice);

    const status =
      data.action === "counter"
        ? "COUNTERED"
        : "ACCEPTED";

    /* ------------------------------ UPSERT OFFER -------------------------- */

    const offer = await prisma.offer.upsert({
      where: {
        requirementId_farmerId: {
          requirementId: requirement.id,
          farmerId: req.userId!,
        },
      },

      update: {
        offeredPrice: basePrice,
        status,
        farmerConfirmed:
          data.action === "accept",
        buyerConfirmed: false,

        items: {
          deleteMany: {},

          create: requestedItems.map((item) => ({
            listing: {
              connect: {
                id: item.listingId,
              },
            },
            quantity: item.quantity,
          })),
        },
      },

      create: {
        requirementId: requirement.id,
        farmerId: req.userId!,
        offeredPrice: basePrice,
        originalPrice: basePrice,
        status,
        farmerConfirmed:
          data.action === "accept",

        items: {
          create: requestedItems.map((item) => ({
            listing: {
              connect: {
                id: item.listingId,
              },
            },
            quantity: item.quantity,
          })),
        },
      },
    });

    await notify(
      requirement.buyerId,
      data.action === "counter"
        ? "COUNTER_OFFER"
        : "ACCEPTED",
      data.action === "counter"
        ? "Farmer sent a counter offer"
        : "Farmer accepted",
      `A farmer responded to requirement ${requirement.id} at ₹${basePrice}.`,
      "BUYER"
    );

    return res.json({
      offer,
    });
  }
);

/* -------------------------------------------------------------------------- */
/* FARMER INCOMING REQUIREMENTS                                               */
/* -------------------------------------------------------------------------- */

router.get(
  "/incoming",
  async (req: AuthRequest, res) => {
    const farmer =
      await prisma.userRole.findUnique({
        where: {
          userId_role: {
            userId: req.userId!,
            role: "FARMER",
          },
        },
      });

    if (!farmer) {
      return res.status(403).json({
        error: "Farmer role required",
      });
    }

    const listings =
      await prisma.listing.findMany({
        where: {
          farmerId: req.userId!,
          status: "Active",
        },
        select: {
          productId: true,
        },
      });

    const productIds = listings.map(
      (listing) => listing.productId
    );

    const requirements =
      await prisma.requirement.findMany({
        where: {
          status: "PENDING",
          items: {
            some: {
              productId: {
                in: productIds,
              },
            },
          },
        },

        include: {
          items: {
            include: {
              product: true,
            },
          },

          buyer: {
            select: {
              id: true,
              location: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      requirements,
    });
  }
);

export default router;