import { ORPCError } from "@orpc/client";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationMember } from "../../search/lib/access";

// ─── Export Procedure ──────────────────────────────────────────────────────

export const exportDocuments = protectedProcedure
	.route({
		method: "POST",
		path: "/collections/{slug}/documents/export",
		tags: ["Documents"],
		summary: "Export documents",
		description: "Exports collection documents as CSV, JSON, JSONL, or XLSX.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
			format: z.enum(["csv", "json", "jsonl", "xlsx"]).optional().default("csv"),
			pretty: z.boolean().optional().default(true),
			/** Optional field list — if omitted, uses all keys from first document */
			fields: z.array(z.string()).optional(),
			/** Optional document IDs for selection-aware export */
			documentIds: z.array(z.string()).optional(),
		}),
	)
	.output(
		z.object({
			content: z.string(),
			total: z.number(),
			format: z.enum(["csv", "json", "jsonl", "xlsx"]),
			filename: z.string(),
			mimeType: z.string(),
			/** Only present for xlsx — base64-encoded binary */
			isBase64: z.boolean().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const {
			getCollectionBySlug,
			exportCollectionDocuments,
			buildCsvContent,
			buildJsonContent,
			buildXlsxContent,
		} = await import("@repo/database");

		const collection = await getCollectionBySlug(input.organizationId, input.slug);
		if (!collection) {
			throw new ORPCError("NOT_FOUND");
		}

		const documents = await exportCollectionDocuments(collection.id, {
			documentIds: input.documentIds,
		});

		// Determine fields: from input, schema, or auto-detect
		const schemaFields: string[] = input.fields ?? [];
		let autoFields: string[] = [];
		if (schemaFields.length === 0) {
			if (Array.isArray(collection.schema)) {
				autoFields = (collection.schema as Array<{ name: string }>)
					.map((f) => f.name)
					.filter(Boolean);
			}
			// Fallback: auto-detect from first document
			if (autoFields.length === 0 && documents.length > 0) {
				const data = documents[0].data as Record<string, unknown>;
				autoFields = Object.keys(data ?? {});
			}
		}

		const fields = schemaFields.length > 0 ? schemaFields : autoFields;

		let content: string;
		let mimeType: string;
		let extension: string;
		let isBase64 = false;

		switch (input.format) {
			case "csv": {
				content = await buildCsvContent(documents, fields);
				mimeType = "text/csv";
				extension = "csv";
				break;
			}
			case "jsonl": {
				content = documents.map((doc) => JSON.stringify(doc.data)).join("\n");
				mimeType = "application/jsonl";
				extension = "jsonl";
				break;
			}
			case "xlsx": {
				const buffer = buildXlsxContent(documents, fields);
				content = buffer.toString("base64");
				mimeType =
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
				extension = "xlsx";
				isBase64 = true;
				break;
			}
			default: {
				content = buildJsonContent(documents, input.pretty);
				mimeType = "application/json";
				extension = "json";
				break;
			}
		}

		return {
			content,
			total: documents.length,
			format: input.format,
			filename: `${input.slug}-documents.${extension}`,
			mimeType,
			isBase64: isBase64 || undefined,
		};
	});
