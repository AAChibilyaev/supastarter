import { db } from "../client";

export interface CreateConversationInput {
	organizationId: string;
	userId?: string | null;
	sessionId: string;
	mode?: string;
	entryPoint?: string | null;
	metadata?: Record<string, unknown>;
}

export interface AppendMessageInput {
	conversationId: string;
	role: "user" | "assistant" | "tool";
	content: string;
	toolName?: string | null;
	toolCalls?: unknown;
	citations?: unknown;
	latencyMs?: number | null;
	inputTokens?: number | null;
	outputTokens?: number | null;
}

export async function createConversation(input: CreateConversationInput) {
	return db.assistantConversation.create({
		data: {
			organizationId: input.organizationId,
			userId: input.userId ?? null,
			sessionId: input.sessionId,
			mode: input.mode ?? "product_consultation",
			entryPoint: input.entryPoint ?? null,
			metadata: (input.metadata ?? {}) as never,
		},
	});
}

export async function getConversation(id: string, messageLimit = 20) {
	return db.assistantConversation.findUnique({
		where: { id },
		include: {
			messages: {
				orderBy: { createdAt: "desc" },
				take: messageLimit,
			},
		},
	});
}

export async function listConversations(
	organizationId: string,
	filters?: {
		userId?: string;
		status?: string;
		limit?: number;
		offset?: number;
	},
) {
	return db.assistantConversation.findMany({
		where: {
			organizationId,
			...(filters?.userId ? { userId: filters.userId } : {}),
			...(filters?.status ? { status: filters.status } : {}),
		},
		orderBy: { lastMessageAt: "desc" },
		take: filters?.limit ?? 50,
		skip: filters?.offset ?? 0,
	});
}

export async function appendMessage(input: AppendMessageInput) {
	const [message] = await db.$transaction([
		db.assistantMessage.create({
			data: {
				conversationId: input.conversationId,
				role: input.role,
				content: input.content,
				toolName: input.toolName ?? null,
				toolCalls: input.toolCalls as never,
				citations: input.citations as never,
				latencyMs: input.latencyMs ?? null,
				inputTokens: input.inputTokens ?? null,
				outputTokens: input.outputTokens ?? null,
			},
		}),
		db.assistantConversation.update({
			where: { id: input.conversationId },
			data: { messageCount: { increment: 1 } },
		}),
	]);
	return message;
}

export async function resolveConversation(id: string) {
	return db.assistantConversation.update({
		where: { id },
		data: { status: "resolved", resolvedAt: new Date() },
	});
}

export async function escalateConversation(
	id: string,
	escalationMeta: Record<string, unknown>,
) {
	return db.assistantConversation.update({
		where: { id },
		data: {
			status: "escalated",
			escalatedAt: new Date(),
			metadata: escalationMeta as never,
		},
	});
}

export async function getConversationHistory(id: string, limit = 10) {
	const messages = await db.assistantMessage.findMany({
		where: { conversationId: id },
		orderBy: { createdAt: "asc" },
		take: limit,
	});
	return messages;
}

export async function updateConversationMetadata(
	id: string,
	patch: Record<string, unknown>,
) {
	const conversation = await db.assistantConversation.findUnique({
		where: { id },
		select: { metadata: true },
	});
	const existing = (conversation?.metadata as Record<string, unknown>) ?? {};
	return db.assistantConversation.update({
		where: { id },
		data: { metadata: { ...existing, ...patch } as never },
	});
}

export async function getAssistantAnalytics(
	organizationId: string,
	from: Date,
	to: Date,
) {
	const [total, resolved, escalated, conversations] = await Promise.all([
		db.assistantConversation.count({ where: { organizationId, startedAt: { gte: from, lte: to } } }),
		db.assistantConversation.count({ where: { organizationId, status: "resolved", startedAt: { gte: from, lte: to } } }),
		db.assistantConversation.count({ where: { organizationId, status: "escalated", startedAt: { gte: from, lte: to } } }),
		db.assistantConversation.findMany({
			where: { organizationId, startedAt: { gte: from, lte: to } },
			select: { messageCount: true, mode: true },
		}),
	]);

	const avgTurns =
		conversations.length > 0
			? conversations.reduce((s: number, c: { messageCount: number }) => s + c.messageCount, 0) / conversations.length
			: 0;

	const modeDistribution: Record<string, number> = {};
	for (const c of conversations) {
		modeDistribution[c.mode] = (modeDistribution[c.mode] ?? 0) + 1;
	}

	return {
		totalConversations: total,
		resolutionRate: total > 0 ? resolved / total : 0,
		escalationRate: total > 0 ? escalated / total : 0,
		avgTurnsToResolution: avgTurns,
		modeDistribution,
	};
}
