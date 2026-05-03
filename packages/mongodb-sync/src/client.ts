/**
 * AACsearch Connector API client — sends documents to AACsearch Engine.
 * Reused pattern from @aacsearch/postgres-sync.
 */

import type { AacSearchConfig, SyncResult } from "./types";

function requestId(): string {
	return `mongo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Client for the AACsearch Connector API.
 * Covers handshake, delta-sync, full-sync, and document deletion.
 */
export class AacSearchClient {
	private readonly baseUrl: string;
	private readonly token: string;
	private readonly projectId: string;
	private readonly userAgent: string;

	constructor(config: AacSearchConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, "");
		this.token = config.token;
		this.projectId = config.projectId;
		this.userAgent = "@aacsearch/mongodb-sync/0.1.0";
	}

	private headers(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.token}`,
			"X-Request-Id": requestId(),
			"User-Agent": this.userAgent,
		};
	}

	/** Verify the connector token is valid */
	async handshake(indexSlug: string): Promise<{ status: string }> {
		const res = await fetch(`${this.baseUrl}/api/connectors/handshake`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ moduleVersion: "0.1.0", platform: "mongodb", indexSlug }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Handshake failed: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { status: string };
		return data;
	}

	/** Push documents via delta-sync */
	async syncDocuments(indexSlug: string, documents: Record<string, unknown>[]): Promise<SyncResult> {
		if (documents.length === 0) return { synced: 0, skipped: 0, errors: [] };
		const res = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/sync/delta`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ [indexSlug]: documents }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Delta sync failed for ${indexSlug}: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { status: string; itemsProcessed?: number };
		return { synced: data.itemsProcessed ?? documents.length, skipped: 0, errors: [] };
	}

	/** Delete a document by external_id */
	async deleteDocument(indexSlug: string, externalId: string): Promise<boolean> {
		const res = await fetch(
			`${this.baseUrl}/api/projects/${this.projectId}/${indexSlug}/${encodeURIComponent(externalId)}`,
			{ method: "DELETE", headers: this.headers() },
		);
		if (!res.ok) {
			if (res.status === 404) return true;
			const body = await res.text().catch(() => "");
			throw new Error(`Delete failed for ${indexSlug}: ${res.status} ${body}`);
		}
		return true;
	}

	/** Batch delete documents */
	async batchDelete(indexSlug: string, externalIds: string[]): Promise<number> {
		if (externalIds.length === 0) return 0;
		const res = await fetch(`${this.baseUrl}/api/connector/documents`, {
			method: "DELETE",
			headers: this.headers(),
			body: JSON.stringify({ indexSlug, externalIds }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Batch delete failed for ${indexSlug}: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { deleted?: number };
		return data.deleted ?? externalIds.length;
	}

	/** Full sync: replace all documents for a collection */
	async fullSync(indexSlug: string, documents: Record<string, unknown>[]): Promise<SyncResult> {
		if (documents.length === 0) return { synced: 0, skipped: 0, errors: [] };
		const res = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/sync/full`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ [indexSlug]: documents }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Full sync failed for ${indexSlug}: ${res.status} ${body}`);
		}
		const data = (await res.json()) as { status: string; itemsCount?: number };
		return { synced: data.itemsCount ?? documents.length, skipped: 0, errors: [] };
	}
}
