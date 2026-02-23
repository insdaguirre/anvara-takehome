-- CreateTable
CREATE TABLE "quote_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT,
    "budget" TEXT,
    "goals" TEXT,
    "timeline" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adSlotId" TEXT NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_requests_ad_slot_id_idx" ON "quote_requests"("adSlotId");

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_adSlotId_fkey"
    FOREIGN KEY ("adSlotId") REFERENCES "ad_slots"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
