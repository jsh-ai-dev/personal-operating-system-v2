CREATE TABLE "calendar_checklist_profiles" (
    "user_id" TEXT NOT NULL,
    "started_on" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_checklist_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "calendar_checklist_template_versions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "effective_from" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_checklist_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_checklist_template_items" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_checklist_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_checklist_days" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "source_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_checklist_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_checklist_day_items" (
    "id" TEXT NOT NULL,
    "day_id" TEXT NOT NULL,
    "source_template_item_id" TEXT,
    "title" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_checklist_day_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_checklist_template_versions_user_id_effective_from_key" ON "calendar_checklist_template_versions"("user_id", "effective_from");
CREATE INDEX "calendar_checklist_template_versions_user_id_effective_from_idx" ON "calendar_checklist_template_versions"("user_id", "effective_from");
CREATE INDEX "calendar_checklist_template_items_version_id_sort_order_idx" ON "calendar_checklist_template_items"("version_id", "sort_order");
CREATE UNIQUE INDEX "calendar_checklist_days_user_id_date_key_key" ON "calendar_checklist_days"("user_id", "date_key");
CREATE INDEX "calendar_checklist_days_user_id_date_key_idx" ON "calendar_checklist_days"("user_id", "date_key");
CREATE INDEX "calendar_checklist_day_items_day_id_sort_order_idx" ON "calendar_checklist_day_items"("day_id", "sort_order");

ALTER TABLE "calendar_checklist_profiles" ADD CONSTRAINT "calendar_checklist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_checklist_template_versions" ADD CONSTRAINT "calendar_checklist_template_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_checklist_template_items" ADD CONSTRAINT "calendar_checklist_template_items_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "calendar_checklist_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_checklist_days" ADD CONSTRAINT "calendar_checklist_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_checklist_day_items" ADD CONSTRAINT "calendar_checklist_day_items_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "calendar_checklist_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
