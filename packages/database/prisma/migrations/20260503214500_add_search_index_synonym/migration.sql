-- Create search_index_synonym table to migrate synonyms out of JSON metadata
CREATE TABLE IF NOT EXISTS "search_index_synonym" (
    "id" TEXT NOT NULL,
    "index_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "locale" TEXT DEFAULT 'en',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_index_synonym_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "search_index_synonym_index_id_root_synonym_key" UNIQUE ("index_id", "root", "synonym")
);

-- Add foreign key constraints
ALTER TABLE "search_index_synonym" ADD CONSTRAINT "search_index_synonym_index_id_fkey" FOREIGN KEY ("index_id") REFERENCES "search_index"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "search_index_synonym" ADD CONSTRAINT "search_index_synonym_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "search_index_synonym_index_id_idx" ON "search_index_synonym"("index_id");
CREATE INDEX IF NOT EXISTS "search_index_synonym_organization_id_idx" ON "search_index_synonym"("organization_id");

-- Migrate existing _synonyms from search_index.schema JSON to the new table
-- The _synonyms field is stored as a JSON array of {synonym: string, root: string} objects
INSERT INTO "search_index_synonym" ("id", "index_id", "organization_id", "root", "synonym", "locale", "created_at", "updated_at")
SELECT
    md5(random()::text || clock_timestamp()::text)::uuid || '-' || row_number() OVER () as id,
    si.id as index_id,
    si.organization_id,
    elem ->> 'root' as root,
    elem ->> 'synonym' as synonym,
    'en' as locale,
    NOW() as created_at,
    NOW() as updated_at
FROM
    "search_index" si,
    LATERAL jsonb_array_elements(
        CASE
            WHEN si.schema ? '_synonyms' AND jsonb_typeof(si.schema -> '_synonyms') = 'array'
            THEN si.schema -> '_synonyms'
            ELSE '[]'::jsonb
        END
    ) AS elem
WHERE
    si.schema ? '_synonyms'
    AND jsonb_typeof(si.schema -> '_synonyms') = 'array'
    AND jsonb_array_length(si.schema -> '_synonyms') > 0;
