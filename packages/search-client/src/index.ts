/**
 * @repo/search-client — AACSearch TypeScript SDK
 *
 * Two clients:
 * - {@link SearchClient} — browser-safe public search client (search-scoped keys)
 * - {@link AdminClient} — server-side management client (admin-scoped keys)
 *
 * Re-exports all types and errors for convenience.
 */

export { AdminClient } from "./admin-client";
export type { AdminClientOptions } from "./admin-client";
export { SearchClient } from "./search-client";
export { SdkError } from "./types";
export { type TrackEventInput, type TrackEventResult, type TrackEventType } from "./types";
export * from "./types";
