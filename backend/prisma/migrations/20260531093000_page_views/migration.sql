CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "page_views_occurred_at_idx" ON "page_views"("occurred_at");
CREATE INDEX "page_views_path_occurred_at_idx" ON "page_views"("path", "occurred_at");
CREATE INDEX "page_views_user_id_occurred_at_idx" ON "page_views"("user_id", "occurred_at");

ALTER TABLE "page_views" ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
