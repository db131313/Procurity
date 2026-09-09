-- Additive: lower User.zipAllowance column default from 3 → 1 (Starter/Trial).
-- Existing rows keep their current zipAllowance values; app code uses PLAN_LIMITS on plan changes.
ALTER TABLE "User" ALTER COLUMN "zipAllowance" SET DEFAULT 1;
