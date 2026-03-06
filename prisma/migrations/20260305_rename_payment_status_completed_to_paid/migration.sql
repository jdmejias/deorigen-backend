-- Migration: rename PaymentStatus COMPLETED → PAID
-- Applied manually: 2026-03-05 (via QA session DB fix)
-- Registered in _prisma_migrations: see context

-- Step 1: add new value (applied)
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';

-- Step 2: migrate existing records (applied; 0 rows affected – no existing payments)
UPDATE "Payment" SET status = 'PAID' WHERE status = 'COMPLETED';

-- Note on COMPLETED removal:
-- PostgreSQL does not support DROP VALUE on enums.
-- The COMPLETED value remains in the DB enum type but is no longer used by any
-- application code. All Prisma client generated types use PAID only.
