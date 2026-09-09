-- Additive: nullable admin-only plan override (takes precedence over Stripe plan).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "devPlanOverride" "PlanTier";
