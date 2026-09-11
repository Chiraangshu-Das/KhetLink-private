-- KhetLink full business schema migration
-- Extends the existing authenticated User table; does not seed fake activity.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'English';

DO $$ BEGIN CREATE TYPE "RoleType" AS ENUM ('BUYER','FARMER','LOGISTICS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RequirementStatus" AS ENUM ('BROWSE_PRODUCTS','PENDING','NOT_FOUND','CONFIRMED','CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OfferStatus" AS ENUM ('OFFERED','COUNTERED','NEGOTIATING','ACCEPTED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('CONFIRMED','PROCESSING','IN_TRANSIT','DELIVERED','CANCELLED','CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','FAILED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ShipmentStatus" AS ENUM ('CONFIRMED','PROCESSING','IN_TRANSIT','DELIVERED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationType" AS ENUM ('REQUEST','COUNTER_OFFER','ACCEPTED','ORDER','PAYMENT','SHIPMENT','SUPPORT','SYSTEM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupportStatus" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "UserRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RoleType" NOT NULL,
  "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
  "termsVersion" TEXT,
  "termsAcceptedAt" TIMESTAMP(3),
  "roleCode" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_roleCode_key" ON "UserRole"("roleCode");
CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_role_key" ON "UserRole"("userId","role");
CREATE INDEX IF NOT EXISTS "UserRole_userId_role_idx" ON "UserRole"("userId","role");

CREATE TABLE IF NOT EXISTS "FarmerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "farmName" TEXT,
  "farmArea" TEXT,
  "landAcres" DOUBLE PRECISION,
  "experience" TEXT,
  "sellingArea" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "capacity" DOUBLE PRECISION,
  "produce" JSONB,
  CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FarmerProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "FarmerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "BuyerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "company" TEXT,
  "buyerType" TEXT,
  CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BuyerProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LogisticsProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "capacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "capabilities" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "availableCapacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "LogisticsProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LogisticsProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "LogisticsProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductCategory_name_key" UNIQUE ("name")
);
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_name_key" UNIQUE ("name"),
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");

CREATE TABLE IF NOT EXISTS "Listing" (
  "id" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "listingId" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'kg',
  "price" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Listing_farmerId_productId_status_idx" ON "Listing"("farmerId","productId","status");

CREATE TABLE IF NOT EXISTS "Requirement" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "status" "RequirementStatus" NOT NULL DEFAULT 'BROWSE_PRODUCTS',
  "location" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Requirement_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Requirement_buyerId_status_idx" ON "Requirement"("buyerId","status");
CREATE TABLE IF NOT EXISTS "RequirementItem" (
  "id" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "minPrice" DOUBLE PRECISION NOT NULL,
  "maxPrice" DOUBLE PRECISION NOT NULL,
  "requiredBy" TIMESTAMP(3),
  "location" TEXT,
  CONSTRAINT "RequirementItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequirementItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RequirementItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Offer" (
  "id" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "farmerId" TEXT NOT NULL,
  "offeredPrice" DOUBLE PRECISION NOT NULL,
  "originalPrice" DOUBLE PRECISION,
  "status" "OfferStatus" NOT NULL DEFAULT 'OFFERED',
  "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "farmerConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Offer_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Offer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Offer_requirementId_farmerId_key" ON "Offer"("requirementId","farmerId");
CREATE INDEX IF NOT EXISTS "Offer_farmerId_status_idx" ON "Offer"("farmerId","status");
CREATE TABLE IF NOT EXISTS "OfferItem" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfferItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "OfferItem_offerId_listingId_key" ON "OfferItem"("offerId","listingId");

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "requirementId" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentExpiresAt" TIMESTAMP(3),
  "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "logisticsFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Order_buyerId_createdAt_idx" ON "Order"("buyerId","createdAt");
CREATE INDEX IF NOT EXISTS "Order_sellerId_createdAt_idx" ON "Order"("sellerId","createdAt");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_paymentExpiresAt_idx" ON "Order"("paymentStatus","paymentExpiresAt");
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "listingId" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'CONFIRMED',
  "pickupLocation" TEXT,
  "deliveryLocation" TEXT,
  "pickupLat" DOUBLE PRECISION,
  "pickupLng" DOUBLE PRECISION,
  "deliveryLat" DOUBLE PRECISION,
  "deliveryLng" DOUBLE PRECISION,
  "currentLat" DOUBLE PRECISION,
  "currentLng" DOUBLE PRECISION,
  "currentLocation" TEXT,
  "distanceKm" DOUBLE PRECISION,
  "etaMinutes" INTEGER,
  "routeJson" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Shipment_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "LogisticsAssignment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "logisticsId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OFFERED',
  "fee" DOUBLE PRECISION NOT NULL,
  "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "LogisticsAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LogisticsAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LogisticsAssignment_logisticsId_fkey" FOREIGN KEY ("logisticsId") REFERENCES "LogisticsProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsAssignment_orderId_logisticsId_key" ON "LogisticsAssignment"("orderId","logisticsId");
CREATE INDEX IF NOT EXISTS "LogisticsAssignment_logisticsId_status_idx" ON "LogisticsAssignment"("logisticsId","status");
CREATE TABLE IF NOT EXISTS "ParticipantCode" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RoleType" NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParticipantCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ParticipantCode_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParticipantCode_orderId_role_key" ON "ParticipantCode"("orderId","role");
CREATE UNIQUE INDEX IF NOT EXISTS "ParticipantCode_orderId_userId_key" ON "ParticipantCode"("orderId","userId");
CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId","createdAt");
CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "revieweeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_reviewerId_revieweeId_key" ON "Review"("orderId","reviewerId","revieweeId");
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RoleType",
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId","read","createdAt");
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
