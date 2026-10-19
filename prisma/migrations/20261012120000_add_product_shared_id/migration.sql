-- Add a stable cross-module identifier for products represented in more than one module.
ALTER TABLE "Product" ADD COLUMN "sharedId" TEXT;

CREATE INDEX "Product_sharedId_idx" ON "Product"("sharedId");

-- Add the dedicated bread inventory module.
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'PAN';
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'PAN_RESTAURANTE';
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'FRITURAS';
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'FRITURAS_RESTAURANTE';
