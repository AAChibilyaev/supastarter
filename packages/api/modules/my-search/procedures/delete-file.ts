import { ORPCError } from "@orpc/client";
import { getPersonalSearchIndexById, removeFileFromIndex } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAccess } from "../lib/access";

export const deleteFile = protectedProcedure
	.route({
		method: "DELETE",
		path: "/my-search/indexes/{indexId}/files/{fileId}",
		tags: ["My Search"],
		summary: "Delete file from personal search index",
		description: "Removes a file entry from a personal search index.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			indexId: z.string(),
			fileId: z.string(),
		}),
	)
	.output(z.void())
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAccess(input.organizationId, user.id);

		// Verify index access
		const index = await getPersonalSearchIndexById(input.organizationId, input.indexId);
		if (!index) {
			throw new ORPCError("NOT_FOUND", { message: "Search index not found" });
		}

		await removeFileFromIndex(input.indexId, input.fileId);
	});
