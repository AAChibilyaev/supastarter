/**
 * AACsearch Connector API client — sends documents to AACsearch Engine.
 */

import type { AacSearchConfig, SyncResult, RealtimeChangeType } from "./types";

/** Generate a unique client request ID for idempotency tracking */
function requestId(): string {
	return `supa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Client for the AACsearch Connector API.
 * Handles token auth, full-sync, delta-sync, and document deletion.
 */
export class AacSearchClient {
	private readonly baseUrl: string;
	private readonly token: string;
	private readonly projectId: string;

	constructor(config: AacSearchConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, "");
		this.token = config.token;
		this.projectId = config.projectId;
	}

	/** Default headers for every connector API call */
	private headers(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.token}`,
			"X-Request-Id": requestId(),
			"User-Agent": "@aacsearch/supabase-sync/0.1.0",
		};
	}

	/** Perform handshake to verify the connector token */
	async handshake(): Promise<{ status: string; indexSlug: string }> {
		const res = await fetch(`${this.baseUrl}/api/connectors/handshake`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({
				moduleVersion: "0.1.0",
				platform: "supabase",
			}),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Handshake failed: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { status: string; indexSlug?: string };
		return {
			status: data.status,
			indexSlug: data.indexSlug ?? "",
		};
	}

	/**
	 * Push documents to AACsearch via delta-sync endpoint.
	 * Each document must include an `external_id` field.
	 * Returns the number of synced documents.
	 */
	async syncDocuments(documents: Record<string, unknown>[]): Promise<SyncResult> {
		if (documents.length === 0) {
			return { synced: 0, skipped: 0, errors: [] };
		}

		const res = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/sync/delta`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ products: documents }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Delta sync failed: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { status: string; itemsProcessed?: number };
		return {
			synced: data.itemsProcessed ?? documents.length,
			skipped: 0,
			errors: [],
		};
	}

	/** Delete a document by its external_id */
	async deleteDocument(externalId: string): Promise<boolean> {
		const res = await fetch(
			`${this.baseUrl}/api/projects/${this.projectId}/products/${encodeURIComponent(externalId)}`,
			{
				method: "DELETE",
				headers: this.headers(),
			},
		);
		if (!res.ok) {
			// 404 means the document was already deleted
			if (res.status === 404) return true;
			const body = await res.text().catch(() => "");
			throw new Error(`Delete failed: ${res.status} ${body}`);
		}
		return true;
	}

	/** Batch delete multiple documents by their external IDs */
	async batchDelete(externalIds: string[]): Promise<number> {
		if (externalIds.length === 0) return 0;

		const res = await fetch(`${this.baseUrl}/api/connector/documents`, {
			method: "DELETE",
			headers: this.headers(),
			body: JSON.stringify({ externalIds }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Batch delete failed: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { deleted?: number };
		return data.deleted ?? externalIds.length;
	}

	/** Full sync: replace all documents in the index with the given set */
	async fullSync(documents: Record<string, unknown>[]): Promise<SyncResult> {
		if (documents.length === 0) {
			return { synced: 0, skipped: 0, errors: [] };
		}

		const res = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/sync/full`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ products: documents }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Full sync failed: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { status: string; itemsCount?: number };
		return {
			synced: data.itemsCount ?? documents.length,
			skipped: 0,
			errors: [],
		};
	}
}
