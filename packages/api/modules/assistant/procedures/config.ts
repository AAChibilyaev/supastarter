import { db } from "@repo/database";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { requireOrganizationAdmin, requireOrganizationMember } from "../../search/lib/access";
import { clearConnectorCache } from "../connectors/registry";

export const assistantConfigSchema = z.object({
	enabled: z.boolean().default(false),
	assistantName: z.string().default(""),
	escalationWebhookUrl: z.string().optional(),
	escalationEmailTo: z.string().optional(),
	workingHoursStart: z.number().int().min(0).max(23).default(9),
	workingHoursEnd: z.number().int().min(0).max(23).default(21),
	omsBaseUrl: z.string().optional(),
	omsApiKey: z.string().optional(),
	loyaltyBaseUrl: z.string().optional(),
	loyaltyApiKey: z.string().optional(),
});

export type AssistantConfig = z.infer<typeof assistantConfigSchema>;

export const getAssistantConfigProcedure = protectedProcedure
	.input(z.object({ organizationId: z.string() }))
	.output(assistantConfigSchema)
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationMember(input.organizationId, user.id);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		const meta = JSON.parse((org?.metadata as string | null) ?? "{}") as Record<
			string,
			unknown
		>;
		return assistantConfigSchema.parse(meta.assistantConfig ?? {});
	});

export const saveAssistantConfigProcedure = protectedProcedure
	.input(
		z.object({
			organizationId: z.string(),
			config: assistantConfigSchema,
		}),
	)
	.output(z.object({ ok: z.boolean() }))
	.handler(async ({ input, context: { user } }) => {
		await requireOrganizationAdmin(input.organizationId, user);

		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
			select: { metadata: true },
		});

		const meta = JSON.parse((org?.metadata as string | null) ?? "{}") as Record<
			string,
			unknown
		>;

		await db.organization.update({
			where: { id: input.organizationId },
			data: { metadata: JSON.stringify({ ...meta, assistantConfig: input.config }) },
		});

		clearConnectorCache(input.organizationId);

		return { ok: true };
	});
