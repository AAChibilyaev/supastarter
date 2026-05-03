export interface ChatClientOptions {
	baseUrl: string;
	apiKey: string;
	indexSlug: string;
	locale?: string;
}

export interface ConversationStartOptions {
	entryPoint?: "home" | "catalog" | "search_results" | "product_card";
	productId?: string;
	productTitle?: string;
	categorySlug?: string;
	searchQuery?: string;
	userToken?: string;
	locale?: string;
}

export interface StreamChunk {
	type: "text_delta" | "tool_start" | "tool_end" | "done" | "error";
	content?: string;
	toolName?: string;
	error?: string;
}

export class ChatClient {
	private readonly opts: ChatClientOptions;
	private readonly sessionId: string;

	constructor(opts: ChatClientOptions) {
		this.opts = opts;
		this.sessionId =
			typeof crypto !== "undefined" && crypto.randomUUID
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}

	async startConversation(options: ConversationStartOptions = {}): Promise<string> {
		const res = await fetch(`${this.opts.baseUrl}/api/assistant/conversation`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.opts.apiKey}`,
			},
			body: JSON.stringify({
				indexSlug: this.opts.indexSlug,
				sessionId: this.sessionId,
				entryPoint: options.entryPoint,
				productContext: options.productId
					? { productId: options.productId, productTitle: options.productTitle, categorySlug: options.categorySlug }
					: undefined,
				searchContext: options.searchQuery ? { query: options.searchQuery } : undefined,
				userToken: options.userToken,
				locale: options.locale ?? this.opts.locale ?? "ru",
			}),
		});

		if (!res.ok) {
			throw new Error(`Failed to start conversation: ${res.status}`);
		}

		const data = (await res.json()) as { conversationId: string };
		return data.conversationId;
	}

	async *sendMessage(
		conversationId: string,
		message: string,
		signal?: AbortSignal,
	): AsyncGenerator<StreamChunk> {
		const res = await fetch(`${this.opts.baseUrl}/api/assistant/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.opts.apiKey}`,
				Accept: "text/event-stream",
			},
			body: JSON.stringify({
				conversationId,
				message,
				indexSlug: this.opts.indexSlug,
				sessionId: this.sessionId,
				locale: this.opts.locale ?? "ru",
			}),
			signal,
		});

		if (!res.ok || !res.body) {
			yield { type: "error", error: `Request failed: ${res.status}` };
			return;
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const raw = line.slice(6).trim();
						if (raw === "[DONE]") {
							yield { type: "done" };
							return;
						}
						try {
							const chunk = JSON.parse(raw) as StreamChunk;
							yield chunk;
						} catch {
							// ignore malformed chunks
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	getSessionId(): string {
		return this.sessionId;
	}
}
