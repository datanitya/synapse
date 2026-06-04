-- Rename Plan.priceUsd to Plan.priceInr
-- Field stores INR amounts (₹0, ₹299, ₹999) — name corrected to avoid confusion with USD
ALTER TABLE "Plan" RENAME COLUMN "priceUsd" TO "priceInr";
