"use client";

import { Button } from "@repo/ui/components/button";
import { ChatBubble, ChatBubbleMessage } from "@repo/ui/components/chat/chat-bubble";
import { ChatInput } from "@repo/ui/components/chat/chat-input";
import { ChatMessageList } from "@repo/ui/components/chat/chat-message-list";
import {
	ExpandableChatHeader,
	ExpandableChatBody,
	ExpandableChatFooter,
} from "@repo/ui/components/chat/expandable-chat";
import MessageLoading from "@repo/ui/components/chat/message-loading";
import { cn } from "@repo/ui/lib";
import {
	ArrowRightIcon,
	CameraIcon,
	ClockIcon,
	ImageIcon,
	KeyboardIcon,
	MessageSquareIcon,
	MicIcon,
	PlusIcon,
	SearchIcon,
	SparklesIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	mode?: SearchMode;
	timestamp: number;
}

interface ChatSession {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: number;
	updatedAt: number;
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const STORAGE_KEY = "aacsearch-chat-sessions";
const MAX_SESSIONS = 20;

const MODES: { key: SearchMode; icon: typeof KeyboardIcon; label: string }[] = [
	{ key: "text", icon: KeyboardIcon, label: "Text" },
	{ key: "voice", icon: MicIcon, label: "Voice" },
	{ key: "photo", icon: CameraIcon, label: "Photo" },
	{ key: "image", icon: ImageIcon, label: "Image" },
	{ key: "chat", icon: MessageSquareIcon, label: "AI Chat" },
];

const MODE_COLORS: Record<SearchMode, string> = {
	text: "text-foreground",
	voice: "text-foreground",
	photo: "text-foreground",
	image: "text-foreground",
	chat: "text-foreground",
};

const MODE_PLACEHOLDERS: Record<SearchMode, string> = {
	text: "Ask about search features...",
	voice: "Ask about voice search...",
	photo: "Ask about visual search...",
	image: "Ask about image search...",
	chat: "Ask me anything...",
};

const WELCOME_MESSAGE =
	"I'm your AACsearch AI assistant. I can help you understand search features, compare plans, find integrations, or troubleshoot issues. What can I help you with?";

const SUGGESTED_QUESTIONS = [
	{ icon: "💡", text: "What can AACsearch do?" },
	{ icon: "💰", text: "Compare pricing plans" },
	{ icon: "🔧", text: "How to integrate?" },
	{ icon: "⚡", text: "Migration guide" },
	{ icon: "🔍", text: "Search API overview" },
];

interface RichResponse {
	text: string;
	suggestions?: string[];
	cta?: { label: string; action: string };
}

const RESPONSES: Record<string, RichResponse[]> = {
	general: [
		{
			text: "💡 **AACsearch** is a multimodal search engine that understands text, voice, and images. It's designed for products that need more than a basic search box.\n\n• **Full-text + semantic** hybrid search\n• **<50ms** response time\n• **SOC 2** compliant & secure\n• **Built-in analytics** & relevance tuning",
			suggestions: [
				"How does semantic search work?",
				"What's the pricing?",
				"Show me a demo",
			],
			cta: { label: "📖 Read docs", action: "docs" },
		},
	],
	pricing: [
		{
			text: "💰 We offer three plans:\n\n**Free** — $0/mo • 1K documents • Basic search\n**Team** — $69/seat/mo • Semantic search • SSO\n**Enterprise** — Custom • White-label • Private cloud\n\nAll plans include a 14-day free trial with full features.",
			suggestions: ["What's included in Free?", "Enterprise vs Team?", "Can I self-host?"],
			cta: { label: "🚀 Start free trial", action: "signup" },
		},
	],
	integration: [
		{
			text: "🔧 Integration is straightforward:\n\n1️⃣ Create an API key in your dashboard\n2️⃣ Index documents via REST API\n3️⃣ Add the search widget to your frontend\n\n```\ncurl -X POST https://api.aacsearch.com/index \\\n  -H 'Authorization: Bearer YOUR_KEY'\n```\n\nWe have SDKs for React, Vue, Python, and more.",
			suggestions: ["React widget setup", "Python SDK guide", "API reference"],
			cta: { label: "📖 Full API docs", action: "docs" },
		},
	],
	migration: [
		{
			text: "⚡ Migration from your current search provider takes **less than 1 hour** for a standard index.\n\n• **Import** your documents via REST API or SDK\n• **Configure** relevance tuning & filters\n• **Switch** your frontend to AACsearch widget\n\nWe provide migration tooling and dedicated support for Enterprise plans.",
			suggestions: [
				"Migrate from Algolia?",
				"Migrate from Meilisearch?",
				"Data format requirements",
			],
			cta: { label: "📖 Migration guide", action: "docs" },
		},
	],
	semantic: [
		{
			text: '🧠 **Hybrid search** combines keyword matching with semantic understanding:\n\n• **Keyword**: Exact matches, fast & precise\n• **Semantic**: Understands meaning & context\n• **AI-reranking**: Smart result ordering\n\nThis means a search for "budget-friendly sneakers" finds relevant results even if the exact words aren\'t in the document.',
			suggestions: [
				"How to tune relevance?",
				"Multi-language support?",
				"Vector search details",
			],
		},
	],
};

/* ═══════════════════════════════════════════════════
   STORAGE
   ═══════════════════════════════════════════════════ */

function loadSessions(): ChatSession[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveSessions(sessions: ChatSession[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
	} catch {
		/* quota exceeded — silently fail */
	}
}

function generateId(): string {
	return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 2) return "Yesterday";
	return `${days}d ago`;
}

function groupSessionsByDate(
	sessions: ChatSession[],
): { label: string; sessions: ChatSession[] }[] {
	const groups: { label: string; sessions: ChatSession[] }[] = [];
	const now = Date.now();
	const today = new Date(now).setHours(0, 0, 0, 0);
	const yesterday = today - 86400000;
	const thisWeek = today - 6 * 86400000;

	const todaySessions = sessions.filter((s) => s.updatedAt >= today);
	const yesterdaySessions = sessions.filter(
		(s) => s.updatedAt >= yesterday && s.updatedAt < today,
	);
	const weekSessions = sessions.filter((s) => s.updatedAt >= thisWeek && s.updatedAt < yesterday);
	const olderSessions = sessions.filter((s) => s.updatedAt < thisWeek);

	if (todaySessions.length) groups.push({ label: "Today", sessions: todaySessions });
	if (yesterdaySessions.length) groups.push({ label: "Yesterday", sessions: yesterdaySessions });
	if (weekSessions.length) groups.push({ label: "This week", sessions: weekSessions });
	if (olderSessions.length) groups.push({ label: "Earlier", sessions: olderSessions });

	return groups;
}

/* ═══════════════════════════════════════════════════
   RESPONSE GENERATOR
   ═══════════════════════════════════════════════════ */

function generateResponse(query: string, mode: SearchMode): RichResponse | null {
	const q = query.toLowerCase();

	// Match against topics
	if (
		q.includes("pric") ||
		q.includes("cost") ||
		q.includes("plan") ||
		q.includes("pricing") ||
		q.includes("free") ||
		q.includes("enterprise")
	) {
		return RESPONSES.pricing[0];
	}
	if (q.includes("migrat") || q.includes("switch") || q.includes("from") || q.includes("move")) {
		return RESPONSES.migration[0];
	}
	if (
		q.includes("integrat") ||
		q.includes("api") ||
		q.includes("sdk") ||
		q.includes("setup") ||
		q.includes("widget") ||
		q.includes("code") ||
		q.includes("implement")
	) {
		return RESPONSES.integration[0];
	}
	if (
		q.includes("semantic") ||
		q.includes("vector") ||
		q.includes("relevance") ||
		q.includes("hybrid") ||
		q.includes("ai search") ||
		q.includes("understand")
	) {
		return RESPONSES.semantic[0];
	}
	if (
		q.includes("what") ||
		q.includes("can") ||
		q.includes("feature") ||
		q.includes("capability") ||
		q.includes("about") ||
		q.includes("hello") ||
		q.includes("hi")
	) {
		return RESPONSES.general[0];
	}

	// Mode-specific fallback
	const modeResponses: Record<SearchMode, RichResponse> = {
		text: {
			text: `🔍 Searching for "${query}" across text indexes... I found relevant matches in your knowledge base. Here's what I'd recommend:\n\n• Use **hybrid search** for best results\n• Configure **filters** for precise queries\n• Check the **Analytics** dashboard for query insights`,
			suggestions: [
				"How to improve search relevance?",
				"Filter syntax guide",
				"Analytics overview",
			],
		},
		voice: {
			text: `🎤 Voice search for "${query}"... AACsearch can process voice queries and match them against your indexed content. This is currently in **private beta**.\n\nInterested in early access? Let me know!`,
			suggestions: [
				"Sign up for voice beta",
				"How voice search works",
				"Supported languages",
			],
		},
		photo: {
			text: `📷 Analyzing "${query}" using visual recognition... AACsearch's **visual search** can find products, screenshots, and documents by image content. Coming soon!`,
			suggestions: [
				"Visual search use cases",
				"Image indexing format",
				"Notify me when ready",
			],
		},
		image: {
			text: `🖼️ Looking for visually similar content to "${query}"... Our **image search** compares embeddings to find the most relevant visual matches. Coming soon!`,
			suggestions: ["Image search applications", "Supported formats", "Get early access"],
		},
		chat: {
			text: `💬 Let me think about "${query}"... Based on my knowledge of AACsearch:\n\nAACsearch is a multimodal search platform that helps you find anything across your data — text, voice, images, and photos. Key strengths:\n\n• Hybrid relevance (keyword + semantic)\n• <50ms response time\n• SOC 2 compliance\n• Built-in analytics\n\nWhat specific aspect would you like to explore?`,
			suggestions: [
				"Compare with other search engines",
				"Performance benchmarks",
				"Security & compliance",
			],
		},
	};

	return modeResponses[mode];
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

interface AiAssistantChatProps {
	visible: boolean;
}

export function AiAssistantChat({ visible }: AiAssistantChatProps) {
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [activeMode, setActiveMode] = useState<SearchMode>("chat");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
	const [view, setView] = useState<"chat" | "history">("chat");

	const inputRef = useRef<HTMLTextAreaElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const msgIdCounter = useRef(0);

	const hasMessages = messages.length > 0;

	const currentSession = useMemo(
		() => sessions.find((s) => s.id === currentSessionId) ?? null,
		[sessions, currentSessionId],
	);

	// ─── Load sessions on mount ────────────────────────
	useEffect(() => {
		const saved = loadSessions();
		setSessions(saved);
		// Resume last session or create new
		if (saved.length > 0) {
			const last = saved[0];
			setCurrentSessionId(last.id);
			setMessages(last.messages);
		}
	}, []);

	// ─── Persist messages to session ───────────────────
	const persistSession = useCallback(
		(newMessages: ChatMessage[], title?: string) => {
			setSessions((prev) => {
				const ts = Date.now();
				const existing = prev.find((s) => s.id === currentSessionId);
				const sessionTitle =
					title ??
					existing?.title ??
					newMessages.find((m) => m.role === "user")?.text.slice(0, 60) ??
					"New chat";

				const updated: ChatSession[] = prev.map((s) =>
					s.id === currentSessionId
						? { ...s, messages: newMessages, title: sessionTitle, updatedAt: ts }
						: s,
				);

				// If no existing session, create one
				if (!existing && currentSessionId) {
					updated.unshift({
						id: currentSessionId,
						title: sessionTitle,
						messages: newMessages,
						createdAt: ts,
						updatedAt: ts,
					});
				}

				saveSessions(updated);
				return updated;
			});
		},
		[currentSessionId],
	);

	// ─── Auto-focus input ─────────────────────────────
	useEffect(() => {
		if (open && inputRef.current && view === "chat") {
			setTimeout(() => inputRef.current?.focus(), 350);
		}
	}, [open, view]);

	// ─── Auto-scroll ──────────────────────────────────
	useEffect(() => {
		if (scrollRef.current) {
			requestAnimationFrame(() => {
				scrollRef.current!.scrollTo({
					top: scrollRef.current!.scrollHeight,
					behavior: "smooth",
				});
			});
		}
	}, [messages, isLoading, view]);

	// ─── Message helpers ──────────────────────────────
	const addMessage = useCallback(
		(role: "user" | "assistant", text: string, mode?: SearchMode) => {
			const msg: ChatMessage = {
				id: `msg-${++msgIdCounter.current}`,
				role,
				text,
				mode,
				timestamp: Date.now(),
			};
			setMessages((prev) => {
				const next = [...prev, msg];
				const title = role === "user" ? text.slice(0, 60) : undefined;
				// Defer persist to avoid re-render loops
				requestAnimationFrame(() => persistSession(next, title));
				return next;
			});
		},
		[persistSession],
	);

	const simulateResponse = useCallback(
		(query: string, mode: SearchMode) => {
			setIsLoading(true);
			const delay = 800 + Math.random() * 700;
			setTimeout(() => {
				const rich = generateResponse(query, mode);
				const text = rich?.text ?? `I'll search for "${query}" and get back to you.`;
				addMessage("assistant", text, mode);
				setIsLoading(false);
			}, delay);
		},
		[addMessage],
	);

	// ─── Actions ──────────────────────────────────────
	const startNewChat = useCallback(() => {
		const id = generateId();
		setCurrentSessionId(id);
		setMessages([]);
		setView("chat");
		setActiveMode("chat");
		setInput("");
		setTimeout(() => inputRef.current?.focus(), 350);
	}, []);

	const selectSession = useCallback((session: ChatSession) => {
		setCurrentSessionId(session.id);
		setMessages(session.messages);
		setView("chat");
		setActiveMode("chat");
		setInput("");
	}, []);

	const deleteSession = useCallback(
		(e: React.MouseEvent, sessionId: string) => {
			e.stopPropagation();
			setSessions((prev) => {
				const updated = prev.filter((s) => s.id !== sessionId);
				saveSessions(updated);
				return updated;
			});
			if (currentSessionId === sessionId) {
				startNewChat();
			}
		},
		[currentSessionId, startNewChat],
	);

	const handleSubmit = useCallback(
		(e?: React.FormEvent) => {
			e?.preventDefault();
			if (!input.trim() || submitting) return;
			setSubmitting(true);
			const query = input.trim();
			addMessage("user", query, activeMode);
			setInput("");
			simulateResponse(query, activeMode);
			setTimeout(() => setSubmitting(false), 100);
		},
		[input, submitting, activeMode, addMessage, simulateResponse],
	);

	const handleModeClick = useCallback((mode: SearchMode) => {
		setActiveMode(mode);
		setInput("");
		setTimeout(() => inputRef.current?.focus(), 50);
	}, []);

	const handleSuggestedClick = useCallback(
		(text: string) => {
			addMessage("user", text, activeMode);
			simulateResponse(text, activeMode);
		},
		[activeMode, addMessage, simulateResponse],
	);

	const openHistory = useCallback(() => setView("history"), []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	/* ─── RENDER ─────────────────────────────────────── */

	// ── Mobile Chat Panel (full-screen overlay) ───────────
	const mobileChatPanel = (
		<div
			className={cn(
				"inset-0 sm:hidden fixed z-40 flex-col overflow-hidden bg-card",
				open ? "flex" : "hidden",
			)}
		>
			<ExpandableChatHeader>
				<div className="gap-2 min-w-0 flex flex-1 items-center">
					<div className="size-7 relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
						<SparklesIcon className="size-3.5 text-muted-foreground" />
						<span className="inset-0 animate-pulse absolute rounded-full bg-primary/[0.06]" />
					</div>
					{view === "history" ? (
						<>
							<span className="text-sm font-light text-foreground">History</span>
							<button
								type="button"
								onClick={() => setView("chat")}
								className="size-7 text-xs ml-auto flex items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-muted-foreground"
							>
								← Back
							</button>
						</>
					) : (
						<>
							<span className="text-sm font-light truncate text-foreground">
								{hasMessages
									? (currentSession?.title?.slice(0, 24) ?? "Chat")
									: "AI Assistant"}
							</span>
							<div className="gap-0.5 ml-auto flex items-center">
								{MODES.map(({ key, icon: Icon }) => (
									<button
										key={key}
										type="button"
										onClick={() => handleModeClick(key)}
										className={cn(
											"size-7 flex items-center justify-center rounded-md transition-colors",
											activeMode === key
												? "bg-muted text-foreground"
												: "text-muted-foreground/40 hover:bg-muted/40 hover:text-muted-foreground",
										)}
										aria-label={`Search by ${key}`}
									>
										<Icon className="size-3.5" />
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={openHistory}
								className="size-7 flex items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
								aria-label="Chat history"
							>
								<ClockIcon className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={startNewChat}
								className="size-7 flex items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
								aria-label="New chat"
							>
								<PlusIcon className="size-3.5" />
							</button>
						</>
					)}
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="size-7 flex items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
						aria-label="Close assistant"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			</ExpandableChatHeader>

			{view === "history" ? (
				<ExpandableChatBody>
					{sessions.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<ClockIcon className="size-8 mb-3 text-muted-foreground/30" />
							<p className="text-sm font-light text-muted-foreground/50">
								No chat history yet
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{groupSessionsByDate(sessions).map((group) => (
								<div key={group.label}>
									<h4 className="font-medium tracking-wider mb-2 px-1 text-[10px] text-muted-foreground/50 uppercase">
										{group.label}
									</h4>
									<div className="space-y-1">
										{group.sessions.map((session) => (
											<button
												key={session.id}
												type="button"
												onClick={() => selectSession(session)}
												className={cn(
													"group gap-3 px-3 py-2.5 flex w-full items-center rounded-lg text-left transition-colors",
													session.id === currentSessionId
														? "bg-muted"
														: "hover:bg-muted/50",
												)}
											>
												<MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
												<div className="min-w-0 flex-1">
													<p className="text-sm font-light truncate text-foreground">
														{session.title}
													</p>
													<p className="font-light mt-0.5 text-[10px] text-muted-foreground/50">
														{session.messages.length} messages &middot;{" "}
														{formatTimestamp(session.updatedAt)}
													</p>
												</div>
												<button
													type="button"
													onClick={(e) => deleteSession(e, session.id)}
													className="size-6 flex shrink-0 items-center justify-center rounded-md text-muted-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:text-muted-foreground"
													aria-label="Delete chat"
												>
													<Trash2Icon className="size-3" />
												</button>
											</button>
										))}
									</div>
								</div>
							))}
						</div>
					)}
					<div className="mt-4">
						<Button
							variant="outline"
							size="sm"
							onClick={startNewChat}
							className="w-full rounded-lg"
						>
							<PlusIcon className="mr-1.5 size-3.5" /> New Chat
						</Button>
					</div>
				</ExpandableChatBody>
			) : (
				<>
					<ExpandableChatBody>
						{/* Capabilities grid — mobile only */}
						{!hasMessages && (
							<div className="space-y-3 sm:hidden">
								<div className="gap-2 grid grid-cols-2">
									{MODES.slice(0, 4).map(({ key, icon: Icon }) => (
										<button
											key={key}
											type="button"
											onClick={() => {
												setActiveMode(key);
												setOpen(true);
												setView("chat");
											}}
											className={cn(
												"gap-1.5 p-3 flex flex-col items-start rounded-xl border text-left transition-all active:scale-[0.98]",
												activeMode === key
													? "border-border bg-muted/60"
													: "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30",
											)}
											aria-label={`Search by ${key}`}
										>
											<div className="gap-2 flex items-center">
												<Icon className="size-4 shrink-0 text-muted-foreground/70" />
												<span className="text-sm font-light text-foreground">
													{key === "text"
														? "Text"
														: key === "voice"
															? "Voice"
															: key === "photo"
																? "Photo"
																: "Image"}
												</span>
											</div>
											<span className="font-light leading-tight text-[11px] text-muted-foreground/50">
												{key === "text"
													? "Search docs & website"
													: key === "voice"
														? "Voice-powered search"
														: key === "photo"
															? "Find by photo"
															: "Visual similarity"}
											</span>
										</button>
									))}
								</div>
								{MODES.slice(4).map(({ key, icon: Icon }) => (
									<button
										key={key}
										type="button"
										onClick={() => {
											setActiveMode(key);
											setOpen(true);
											setView("chat");
										}}
										className={cn(
											"gap-3 p-3 flex items-center rounded-xl border text-left transition-all active:scale-[0.98]",
											activeMode === key
												? "border-border bg-muted/60"
												: "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30",
										)}
										aria-label={`Search by ${key}`}
									>
										<Icon className="size-5 shrink-0 text-muted-foreground/70" />
										<div>
											<div className="text-sm font-light text-foreground">
												AI Chat
											</div>
											<div className="font-light text-[11px] text-muted-foreground/50">
												Ask anything about your data
											</div>
										</div>
									</button>
								))}
							</div>
						)}

						{/* Welcome message + messages */}
						<ChatMessageList>
							<div className="space-y-4">
								<ChatBubble variant="received" layout="ai">
									<ChatBubbleMessage variant="received" layout="ai">
										<div className="space-y-3">
											<div className="gap-2 flex items-center">
												<div className="size-6 relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
													<SparklesIcon className="size-3 text-muted-foreground" />
												</div>
												<span className="text-xs font-medium text-foreground/80">
													AACsearch Assistant
												</span>
											</div>
											<p className="text-sm font-light leading-relaxed text-muted-foreground">
												{WELCOME_MESSAGE}
											</p>
										</div>
									</ChatBubbleMessage>
								</ChatBubble>
							</div>
							{messages.map((msg) => (
								<ChatBubble
									key={msg.id}
									variant={msg.role === "user" ? "sent" : "received"}
									layout={msg.role === "user" ? "default" : "ai"}
								>
									<ChatBubbleMessage
										variant={msg.role === "user" ? "sent" : "received"}
										layout={msg.role === "user" ? "default" : "ai"}
									>
										{msg.mode && msg.role === "user" && (
											<div className="mb-1 gap-1 flex items-center">
												<span className="font-medium text-[10px] text-muted-foreground/50">
													{MODES.find((m) => m.key === msg.mode)?.label}
												</span>
											</div>
										)}
										<p
											className={cn(
												"text-sm font-light leading-relaxed whitespace-pre-wrap",
												msg.role === "assistant" && "text-muted-foreground",
											)}
										>
											{msg.text}
										</p>
									</ChatBubbleMessage>
								</ChatBubble>
							))}
							{isLoading && (
								<ChatBubble variant="received" layout="ai">
									<ChatBubbleMessage variant="received" layout="ai" isLoading />
								</ChatBubble>
							)}
							{!hasMessages && (
								<div className="gap-2 pt-2 flex flex-col">
									{SUGGESTED_QUESTIONS.map((q) => (
										<button
											key={q.text}
											type="button"
											onClick={() => handleSuggestedClick(q.text)}
											className="gap-2 px-3.5 py-2.5 text-sm font-light flex items-center rounded-lg border border-border/60 bg-muted/20 text-left text-muted-foreground/80 transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
										>
											<span className="text-base">{q.icon}</span>
											<span>{q.text}</span>
										</button>
									))}
								</div>
							)}
						</ChatMessageList>
					</ExpandableChatBody>
					<ExpandableChatFooter>
						<form onSubmit={handleSubmit} className="gap-2 flex items-end">
							<div className="relative flex-1">
								<ChatInput
									ref={inputRef}
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder={MODE_PLACEHOLDERS[activeMode]}
									className="min-h-10 px-3 py-2 text-sm font-light rounded-lg border border-border/60 bg-muted/30 placeholder:text-muted-foreground/50 focus:border-muted-foreground/30 focus:outline-none"
								/>
							</div>
							<Button
								type="submit"
								size="icon"
								variant="primary"
								disabled={!input.trim() || isLoading}
								className="size-10 flex shrink-0 items-center justify-center rounded-lg"
							>
								<ArrowRightIcon className="size-4" />
							</Button>
						</form>
					</ExpandableChatFooter>
				</>
			)}
		</div>
	);

	// ── Desktop Container (floating toggle + panel) ────────
	const desktopContainer = (
		<div className="sm:block bottom-6 right-6 fixed z-50 hidden">
			<div
				className={cn(
					"right-0 shadow-xl shadow-black/10 backdrop-blur-xl ease-out absolute bottom-[calc(100%+12px)] flex origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300",
					open
						? "pointer-events-auto visible scale-100 opacity-100"
						: "pointer-events-none invisible scale-95 opacity-0",
					"h-[600px] max-h-[600px] w-[440px]",
				)}
			>
				<div className="gap-2 px-4 py-3 flex shrink-0 items-center border-b border-border">
					<div className="size-7 relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
						<SparklesIcon className="size-3.5 text-muted-foreground" />
						<span className="inset-0 animate-pulse absolute rounded-full bg-primary/[0.06]" />
					</div>
					{view === "history" ? (
						<>
							<span className="text-sm font-light text-foreground">History</span>
							<button
								type="button"
								onClick={() => setView("chat")}
								className="size-7 text-xs ml-auto flex items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-muted-foreground"
							>
								← Back
							</button>
						</>
					) : (
						<>
							<span className="text-sm font-light text-foreground">
								{hasMessages
									? (currentSession?.title?.slice(0, 24) ?? "Chat")
									: "AI Assistant"}
							</span>
							<div className="gap-0.5 ml-auto flex items-center">
								{MODES.map(({ key, icon: Icon }) => (
									<button
										key={key}
										type="button"
										onClick={() => handleModeClick(key)}
										className={cn(
											"size-7 flex items-center justify-center rounded-md transition-colors",
											activeMode === key
												? "bg-muted text-foreground"
												: "text-muted-foreground/40 hover:bg-muted/40 hover:text-muted-foreground",
										)}
										aria-label={`Search by ${key}`}
									>
										<Icon className="size-3.5" />
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={openHistory}
								className="size-7 flex items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
								aria-label="Chat history"
							>
								<ClockIcon className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={startNewChat}
								className="size-7 flex items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
								aria-label="New chat"
							>
								<PlusIcon className="size-3.5" />
							</button>
						</>
					)}
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="size-7 flex items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
						aria-label="Close"
					>
						<XIcon className="size-4" />
					</button>
				</div>

				{view === "history" ? (
					<div className="p-4 flex-1 overflow-y-auto">
						{sessions.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center text-center">
								<ClockIcon className="size-8 mb-3 text-muted-foreground/30" />
								<p className="text-sm font-light text-muted-foreground/50">
									No chat history yet
								</p>
							</div>
						) : (
							<div className="space-y-6">
								{groupSessionsByDate(sessions).map((group) => (
									<div key={group.label}>
										<h4 className="font-medium tracking-wider mb-2 px-1 text-[10px] text-muted-foreground/50 uppercase">
											{group.label}
										</h4>
										<div className="space-y-1">
											{group.sessions.map((session) => (
												<button
													key={session.id}
													type="button"
													onClick={() => selectSession(session)}
													className={cn(
														"group gap-3 px-3 py-2.5 flex w-full items-center rounded-lg text-left transition-colors",
														session.id === currentSessionId
															? "bg-muted"
															: "hover:bg-muted/50",
													)}
												>
													<MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
													<div className="min-w-0 flex-1">
														<p className="text-sm font-light truncate text-foreground">
															{session.title}
														</p>
														<p className="font-light mt-0.5 text-[10px] text-muted-foreground/50">
															{session.messages.length} messages ·{" "}
															{formatTimestamp(session.updatedAt)}
														</p>
													</div>
													<button
														type="button"
														onClick={(e) =>
															deleteSession(e, session.id)
														}
														className="size-6 flex shrink-0 items-center justify-center rounded-md text-muted-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:text-muted-foreground"
														aria-label="Delete chat"
													>
														<Trash2Icon className="size-3" />
													</button>
												</button>
											))}
										</div>
									</div>
								))}
							</div>
						)}
						<div className="mt-4">
							<Button
								variant="outline"
								size="sm"
								onClick={startNewChat}
								className="w-full rounded-lg"
							>
								<PlusIcon className="mr-1.5 size-3.5" /> New Chat
							</Button>
						</div>
					</div>
				) : (
					<>
						<div ref={scrollRef} className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
							<div className="space-y-4">
								<ChatBubble variant="received" layout="ai">
									<ChatBubbleMessage variant="received" layout="ai">
										<div className="space-y-3">
											<div className="gap-2 flex items-center">
												<div className="size-6 relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
													<SparklesIcon className="size-3 text-muted-foreground" />
												</div>
												<span className="text-xs font-medium text-foreground/80">
													AACsearch Assistant
												</span>
											</div>
											<p className="text-sm font-light leading-relaxed text-muted-foreground">
												{WELCOME_MESSAGE}
											</p>
										</div>
									</ChatBubbleMessage>
								</ChatBubble>
							</div>
							{messages.map((msg) => (
								<ChatBubble
									key={msg.id}
									variant={msg.role === "user" ? "sent" : "received"}
									layout={msg.role === "user" ? "default" : "ai"}
								>
									<ChatBubbleMessage
										variant={msg.role === "user" ? "sent" : "received"}
										layout={msg.role === "user" ? "default" : "ai"}
									>
										{msg.mode && msg.role === "user" && (
											<div className="mb-1 gap-1 flex items-center">
												<span className="font-medium text-[10px] text-muted-foreground/50">
													{MODES.find((m) => m.key === msg.mode)?.label}
												</span>
											</div>
										)}
										<p
											className={cn(
												"text-sm font-light leading-relaxed whitespace-pre-wrap",
												msg.role === "assistant" && "text-muted-foreground",
											)}
										>
											{msg.text}
										</p>
									</ChatBubbleMessage>
								</ChatBubble>
							))}
							{isLoading && (
								<ChatBubble variant="received" layout="ai">
									<ChatBubbleMessage variant="received" layout="ai" isLoading />
								</ChatBubble>
							)}
							{!hasMessages && (
								<div className="gap-2 pt-2 flex flex-col">
									{SUGGESTED_QUESTIONS.map((q) => (
										<button
											key={q.text}
											type="button"
											onClick={() => handleSuggestedClick(q.text)}
											className="gap-2 px-3.5 py-2.5 text-sm font-light flex items-center rounded-lg border border-border/60 bg-muted/20 text-left text-muted-foreground/80 transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
										>
											<span className="text-base">{q.icon}</span>
											<span>{q.text}</span>
										</button>
									))}
								</div>
							)}
						</div>
						<div className="p-3 shrink-0 border-t border-border">
							<form onSubmit={handleSubmit} className="gap-2 flex items-end">
								<div className="relative flex-1">
									<ChatInput
										ref={inputRef}
										value={input}
										onChange={(e) => setInput(e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder={MODE_PLACEHOLDERS[activeMode]}
										className="min-h-10 px-3 py-2 text-sm font-light rounded-lg border border-border/60 bg-muted/30 placeholder:text-muted-foreground/50 focus:border-muted-foreground/30 focus:outline-none"
									/>
								</div>
								<Button
									type="submit"
									size="icon"
									variant="primary"
									disabled={!input.trim() || isLoading}
									className="size-10 flex shrink-0 items-center justify-center rounded-lg"
								>
									<ArrowRightIcon className="size-4" />
								</Button>
							</form>
						</div>
					</>
				)}
			</div>

			{/* Desktop toggle pill */}
			<div
				className={cn(
					"ease-in-out transition-all duration-500",
					visible
						? "translate-y-0 opacity-100"
						: "translate-y-8 pointer-events-none opacity-0",
				)}
			>
				<button
					type="button"
					onClick={() => {
						setOpen(!open);
						if (!open) setView("chat");
					}}
					className={cn(
						"gap-3 px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl hover:shadow-xl hover:shadow-black/10 sm:px-5 sm:py-3 ml-auto flex items-center rounded-2xl border border-border/60 bg-card/90 transition-all duration-300 hover:border-border",
						open && "pointer-events-none opacity-0",
					)}
				>
					<div className="size-8 relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
						<SparklesIcon className="size-4 text-muted-foreground" />
						<span className="inset-0 animate-pulse absolute rounded-full bg-primary/[0.06]" />
					</div>
					<span className="text-sm font-light whitespace-nowrap text-muted-foreground/70">
						Ask AI...
					</span>
					{sessions.length > 0 && (
						<span className="size-5 font-medium flex items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">
							{sessions.length > 9 ? "9+" : sessions.length}
						</span>
					)}
					<span className="gap-0.5 px-1.5 py-0.5 font-medium sm:inline-flex hidden shrink-0 items-center rounded-md border border-border/50 bg-muted/40 text-[10px] text-muted-foreground/60">
						<KeyboardIcon className="size-2.5" />
						<span>K</span>
					</span>
				</button>
			</div>
		</div>
	);

	// ── Mobile Bottom Bar ────────────────────────────────
	const mobileBottomBar = (
		<div className="bottom-0 left-0 right-0 sm:hidden px-2 py-2 fixed z-[60] flex touch-manipulation items-center border-t border-border bg-card pb-[env(safe-area-inset-bottom,8px)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none">
			<button
				type="button"
				onClick={() => window.dispatchEvent(new CustomEvent("aacsearch:toggle-menu"))}
				className="size-11 flex shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-muted-foreground/60 transition-colors active:scale-95 active:bg-muted/60"
				aria-label="Open menu"
				style={{ WebkitTapHighlightColor: "transparent" }}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
				>
					<line x1="4" y1="6" x2="20" y2="6" />
					<line x1="4" y1="12" x2="20" y2="12" />
					<line x1="4" y1="18" x2="20" y2="18" />
				</svg>
			</button>
			<div className="mx-1.5 h-7 w-px shrink-0 bg-border/60" />

			{/* Main Ask AI trigger */}
			<button
				type="button"
				onClick={() => {
					setOpen(true);
					setView("chat");
				}}
				className="gap-2 px-2.5 py-2 flex flex-1 cursor-pointer touch-manipulation items-center truncate rounded-lg transition-colors active:bg-muted/40"
				style={{ WebkitTapHighlightColor: "transparent" }}
			>
				<div className="size-8 relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 via-primary/8 to-transparent">
					<SparklesIcon className="size-4 text-primary" />
				</div>
				<div className="gap-1 min-w-0 flex items-center truncate">
					<span className="text-sm font-light whitespace-nowrap text-muted-foreground/90">
						Ask AI
					</span>
				</div>
				{sessions.length > 0 && (
					<span className="size-5 font-medium ml-auto flex shrink-0 items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground">
						{sessions.length > 9 ? "9+" : sessions.length}
					</span>
				)}
			</button>

			<div className="mx-1 h-6 w-px shrink-0 bg-border/40" />

			{/* Clickable mode chips */}
			<div className="gap-0.5 flex items-center overflow-x-auto">
				{MODES.map(({ key, icon: Icon }) => (
					<button
						key={key}
						type="button"
						onClick={() => {
							setActiveMode(key);
							setOpen(true);
							setView("chat");
						}}
						className={cn(
							"px-2 py-1 gap-0.5 flex cursor-pointer touch-manipulation flex-col items-center justify-center rounded-lg transition-colors active:scale-95",
							activeMode === key
								? "bg-muted text-foreground"
								: "text-muted-foreground/50 active:text-foreground",
						)}
						aria-label={`Search by ${key}`}
						style={{ WebkitTapHighlightColor: "transparent" }}
					>
						<Icon className="size-4" />
						<span className="font-light text-[9px] leading-none">
							{key === "text"
								? "Text"
								: key === "voice"
									? "Voice"
									: key === "photo"
										? "Photo"
										: key === "image"
											? "Image"
											: "Chat"}
						</span>
					</button>
				))}
			</div>
		</div>
	);

	return (
		<>
			{mobileChatPanel}
			{desktopContainer}
			{mobileBottomBar}
		</>
	);
}
