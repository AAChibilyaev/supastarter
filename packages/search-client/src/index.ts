/**
 * @repo/search-client — AACSearch TypeScript SDK
 *
 * Clients:
 * - {@link SearchClient} — browser-safe v1 public search client (search-scoped keys)
 * - {@link AdminClient} — server-side v1 management client (admin-scoped keys)
 * - {@link V2SearchClient} — browser-safe v2 public search client
 * - {@link V2AdminClient} — server-side v2 management client
 *
 * Re-exports all types and errors for convenience.
 */

export { AdminClient } from "./admin-client";
export type { AdminClientOptions } from "./admin-client";
export { SearchClient } from "./search-client";
export { V2AdminClient } from "./v2-admin-client";
export type { V2AdminClientOptions, V2CreateProjectInput, V2CreateIndexInput, V2UpdateIndexInput, V2ListDocumentsOptions, V2UpsertDocumentsInput, V2BatchDeleteInput, V2ExportDocumentsOptions, V2CreateKeyInput, V2CreateSynonymInput, V2Project, V2SearchIndex, V2SearchField, V2SearchRequest, V2Error } from "./v2-admin-client";
export { V2SearchClient } from "./v2-search-client";
export type { V2SearchClientOptions, V2TrackEventInput, V2TrackEventResult } from "./v2-search-client";
export { SdkError } from "./types";
export { type TrackEventInput, type TrackEventResult, type TrackEventType } from "./types";
export * from "./types";
