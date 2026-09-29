/*
  Warnings:

  - You are about to drop the column `listingId` on the `Listing` table. All the data in the column will be lost.
  - Added the required column `role` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "listingId";

-- AlterTable
ALTER TABLE "LogisticsAssignment" ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "detourKm" DOUBLE PRECISION,
ADD COLUMN     "distanceToPickupKm" DOUBLE PRECISION,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "loadKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LogisticsProfile" ADD COLUMN     "availableCapacityKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "capacityUnit" TEXT NOT NULL DEFAULT 'KG',
ADD COLUMN     "currentLat" DOUBLE PRECISION,
ADD COLUMN     "currentLng" DOUBLE PRECISION,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLocationAt" TIMESTAMP(3),
ADD COLUMN     "locationTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxCapacityKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vehicleNumber" TEXT,
ADD COLUMN     "vehicleType" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "dropoffVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "pickupVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "qcAt" TIMESTAMP(3),
ADD COLUMN     "qcNote" TEXT,
ADD COLUMN     "qcStatus" TEXT,
ADD COLUMN     "requiredBy" TIMESTAMP(3),
ADD COLUMN     "returnRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "role" "RoleType" NOT NULL;

-- CreateIndex
CREATE INDEX "SupportTicket_userId_role_createdAt_idx" ON "SupportTicket"("userId", "role", "createdAt");
