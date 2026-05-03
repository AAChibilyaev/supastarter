-- Create global_synonym_set table
CREATE TABLE IF NOT EXISTS "global_synonym_set" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "synonyms" TEXT[] NOT NULL DEFAULT '{}',
    "locale" TEXT DEFAULT 'en',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_synonym_set_pkey" PRIMARY KEY ("id")
);

-- Create global_synonym_set_collection (junction table for excluded collections)
CREATE TABLE IF NOT EXISTS "global_synonym_set_collection" (
    "id" TEXT NOT NULL,
    "synonym_set_id" TEXT NOT NULL,
    "index_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "global_synonym_set_collection_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "global_synonym_set_collection_synonym_set_id_index_id_key" UNIQUE ("synonym_set_id", "index_id")
);

-- Foreign keys
ALTER TABLE "global_synonym_set" ADD CONSTRAINT "global_synonym_set_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "global_synonym_set_collection" ADD CONSTRAINT "global_synonym_set_collection_synonym_set_id_fkey" FOREIGN KEY ("synonym_set_id") REFERENCES "global_synonym_set"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "global_synonym_set_collection" ADD CONSTRAINT "global_synonym_set_collection_index_id_fkey" FOREIGN KEY ("index_id") REFERENCES "search_index"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "global_synonym_set_collection" ADD CONSTRAINT "global_synonym_set_collection_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "global_synonym_set_organization_id_idx" ON "global_synonym_set"("organization_id");
CREATE INDEX IF NOT EXISTS "global_synonym_set_collection_index_id_idx" ON "global_synonym_set_collection"("index_id");
CREATE INDEX IF NOT EXISTS "global_synonym_set_collection_organization_id_idx" ON "global_synonym_set_collection"("organization_id");
