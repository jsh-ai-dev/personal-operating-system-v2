-- CreateTable
CREATE TABLE "calendar_memos" (
    "id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "brief" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_memos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_memos_date_key_key" ON "calendar_memos"("date_key");
