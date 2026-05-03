// Supabase Edge Function — AACsearch sync via Database Webhook
// Deploy this function in your Supabase project and set it as a Database Webhook.
//
// This is a TEMPLATE — copy `supabase/functions/aacsearch-sync/` into your
// Supabase project, configure the environment variables, and deploy with:
//   supabase functions deploy aacsearch-sync --no-verify-jwt
//
// The function receives Database Webhook payloads and pushes them to AACsearch.
//
// Required secrets (set via `supabase secrets set`):
//   AACSEARCH_URL  — AACsearch API base URL
//   AACSEARCH_TOKEN — Connector bearer token (ss_connector_*)
//   AACSEARCH_PROJECT_ID — Your AACsearch project/organization ID

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

interface WebhookPayload {
	type: "INSERT" | "UPDATE" | "DELETE";
	table: string;
	schema: string;
	record: Record<string, unknown> | null;
	old_record: Record<string, unknown> | null;
	columns: Array<{ name: string; type: string }>;
}

interface SyncResponse {
	status: string;
	itemsProcessed?: number;
	deleted?: number;
}

serve(async (req: Request) => {
	const AACSEARCH_URL = Deno.env.get("AACSEARCH_URL") ?? "";
	const AACSEARCH_TOKEN = Deno.env.get("AACSEARCH_TOKEN") ?? "";
	const AACSEARCH_PROJECT_ID = Deno.env.get("AACSEARCH_PROJECT_ID") ?? "";
	const ID_COLUMN = Deno.env.get("AACSEARCH_ID_COLUMN") ?? "id";

	if (!AACSEARCH_URL || !AACSEARCH_TOKEN || !AACSEARCH_PROJECT_ID) {
		return new Response("Missing configuration", { status: 500 });
	}

	try {
		const payload: WebhookPayload = await req.json();
		const baseUrl = AACSEARCH_URL.replace(/\/$/, "");
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${AACSEARCH_TOKEN}`,
			"User-Agent": "aacsearch-supabase-edge-function/0.1.0",
		};

		if (payload.type === "DELETE") {
			const oldRecord = payload.old_record ?? {};
			const externalId = String(oldRecord[ID_COLUMN] ?? "");

			if (!externalId) {
				return new Response(JSON.stringify({ error: "Missing ID column" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const res = await fetch(
				`${baseUrl}/api/projects/${AACSEARCH_PROJECT_ID}/products/${encodeURIComponent(externalId)}`,
				{ method: "DELETE", headers },
			);

			if (!res.ok && res.status !== 404) {
				const body = await res.text();
				throw new Error(`Delete failed: ${res.status} ${body}`);
			}

			return new Response(
				JSON.stringify({ status: "deleted", externalId } satisfies SyncResponse),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		// INSERT or UPDATE
		const record = payload.record ?? {};
		const externalId = String(record[ID_COLUMN] ?? "");

		if (!externalId || Object.keys(record).length === 0) {
			return new Response(JSON.stringify({ error: "Empty or invalid record" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Build document with external_id
		const document: Record<string, unknown> = {
			external_id: externalId,
			...record,
		};

		const res = await fetch(`${baseUrl}/api/projects/${AACSEARCH_PROJECT_ID}/sync/delta`, {
			method: "POST",
			headers,
			body: JSON.stringify({ products: [document] }),
		});

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Sync failed: ${res.status} ${body}`);
		}

		const data = await res.json();
		return new Response(JSON.stringify(data), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
});
