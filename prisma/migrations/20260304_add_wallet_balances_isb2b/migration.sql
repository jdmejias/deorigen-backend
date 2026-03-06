-- Migration: add wallet balances, isB2B, supportAmount, trackingNumber,
--            investment status, and Withdrawal model.
-- Applied via `prisma db push` on 2026-03-04 and registered here for history.

-- ─── New enums ───────────────────────────────────────────────────────────────

CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- ─── FarmerProfile: wallet columns ───────────────────────────────────────────

ALTER TABLE "FarmerProfile"
  ADD COLUMN "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lockedBalance"    DECIMAL(12,2) NOT NULL DEFAULT 0;

-- ─── Investment: status column ────────────────────────────────────────────────

ALTER TABLE "Investment"
  ADD COLUMN "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- ─── Order: supportAmount + trackingNumber ────────────────────────────────────

ALTER TABLE "Order"
  ADD COLUMN "supportAmount"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "trackingNumber" TEXT;

-- ─── Product: isB2B flag ──────────────────────────────────────────────────────

ALTER TABLE "Product"
  ADD COLUMN "isB2B" BOOLEAN NOT NULL DEFAULT false;

-- ─── Withdrawal model ─────────────────────────────────────────────────────────

CREATE TABLE "Withdrawal" (
  "id"              TEXT        NOT NULL,
  "farmerId"        TEXT        NOT NULL,
  "amount"          DECIMAL(12,2) NOT NULL,
  "currency"        TEXT        NOT NULL DEFAULT 'EUR',
  "status"          "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "bankAccountInfo" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Withdrawal_farmerId_idx" ON "Withdrawal"("farmerId");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

ALTER TABLE "Withdrawal"
  ADD CONSTRAINT "Withdrawal_farmerId_fkey"
  FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
