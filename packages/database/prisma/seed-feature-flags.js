// Seed script for Feature Flags — no-op (empty seed by design).
// Feature flags are created via oRPC admin procedures at runtime.
// This script exists so the seed pipeline doesn't fail when
// running prisma db seed for the feature_flag tables.
//
// Usage: node packages/database/prisma/seed-feature-flags.js

console.log("Feature flags: no default flags to seed (empty list — no-op).");
console.log("Flags are created via AACsearch admin API at runtime.");
console.log("Done.");
