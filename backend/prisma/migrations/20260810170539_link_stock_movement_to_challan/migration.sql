-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "challanId" TEXT;

-- CreateIndex
CREATE INDEX "stock_movements_challanId_idx" ON "stock_movements"("challanId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "challans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
