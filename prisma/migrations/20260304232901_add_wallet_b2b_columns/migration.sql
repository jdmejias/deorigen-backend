-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "FarmerProfile" ADD COLUMN     "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lockedBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "supportAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isB2B" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "bankAccountInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Withdrawal_farmerId_idx" ON "Withdrawal"("farmerId");

-- CreateIndex
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
