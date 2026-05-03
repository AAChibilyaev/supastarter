/**
 * AACsearch Connector API client for Strapi plugin.
 */

export interface AacSearchConfig {
	baseUrl: string;
	token: string;
}

export interface SyncResult {
	synced: number;
	errors: string[];
}

export class AacSearchClient {
	private readonly baseUrl: string;
	private readonly token: string;

	constructor(config: AacSearchConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, "");
		this.token = config.token;
	}

	private headers(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.token}`,
			"User-Agent": "@aacsearch/strapi-plugin/0.1.0",
		};
	}

	async syncDocuments(indexSlug: string, documents: Record<string, unknown>[]): Promise<SyncResult> {
		if (documents.length === 0) return { synced: 0, errors: [] };
		const res = await fetch(`${this.baseUrl}/api/projects/strapi/sync/delta`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ [indexSlug]: documents }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Delta sync failed: ${res.status} ${body}`);
		}
		return { synced: documents.length, errors: [] };
	}

	async deleteDocument(indexSlug: string, documentId: string): Promise<boolean> {
		const res = await fetch(
			`${this.baseUrl}/api/projects/strapi/${indexSlug}/${encodeURIComponent(documentId)}`,
			{ method: "DELETE", headers: this.headers() },
		);
		if (!res.ok) {
			if (res.status === 404) return true;
			const body = await res.text().catch(() => "");
			throw new Error(`Delete failed: ${res.status} ${body}`);
		}
		return true;
	}

	async fullSync(indexSlug: string, documents: Record<string, unknown>[]): Promise<SyncResult> {
		if (documents.length === 0) return { synced: 0, errors: [] };
		const res = await fetch(`${this.baseUrl}/api/projects/strapi/sync/full`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify({ [indexSlug]: documents }),
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(`Full sync failed: ${res.status} ${body}`);
		}
		return { synced: documents.length, errors: [] };
	}
}
