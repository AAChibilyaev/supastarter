"use client";

import { Button } from "@repo/ui/components/button";
import {
	ChatBubble,
	ChatBubbleMessage,
} from "@repo/ui/components/chat/chat-bubble";
import { ChatInput } from "@repo/ui/components/chat/chat-input";
import { cn } from "@repo/ui/lib";
import MessageLoading from "@repo/ui/components/chat/message-loading";
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
			suggestions: ["How does semantic search work?", "What's the pricing?", "Show me a demo"],
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
			suggestions: ["Migrate from Algolia?", "Migrate from Meilisearch?", "Data format requirements"],
			cta: { label: "📖 Migration guide", action: "docs" },
		},
	],
	semantic: [
		{
			text: "🧠 **Hybrid search** combines keyword matching with semantic understanding:\n\n• **Keyword**: Exact matches, fast & precise\n• **Semantic**: Understands meaning & context\n• **AI-reranking**: Smart result ordering\n\nThis means a search for \"budget-friendly sneakers\" finds relevant results even if the exact words aren't in the document.",
			suggestions: ["How to tune relevance?", "Multi-language support?", "Vector search details"],
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

function groupSessionsByDate(sessions: ChatSession[]): { label: string; sessions: ChatSession[] }[] {
	const groups: { label: string; sessions: ChatSession[] }[] = [];
	const now = Date.now();
	const today = new Date(now).setHours(0, 0, 0, 0);
	const yesterday = today - 86400000;
	const thisWeek = today - 6 * 86400000;

	const todaySessions = sessions.filter((s) => s.updatedAt >= today);
	const yesterdaySessions = sessions.filter((s) => s.updatedAt >= yesterday && s.updatedAt < today);
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
	if (q.includes("pric") || q.includes("cost") || q.includes("plan") || q.includes("pricing") || q.includes("free") || q.includes("enterprise")) {
		return RESPONSES.pricing[0];
	}
	if (q.includes("migrat") || q.includes("switch") || q.includes("from") || q.includes("move")) {
		return RESPONSES.migration[0];
	}
	if (q.includes("integrat") || q.includes("api") || q.includes("sdk") || q.includes("setup") || q.includes("widget") || q.includes("code") || q.includes("implement")) {
		return RESPONSES.integration[0];
	}
	if (q.includes("semantic") || q.includes("vector") || q.includes("relevance") || q.includes("hybrid") || q.includes("ai search") || q.includes("understand")) {
		return RESPONSES.semantic[0];
	}
	if (q.includes("what") || q.includes("can") || q.includes("feature") || q.includes("capability") || q.includes("about") || q.includes("hello") || q.includes("hi")) {
		return RESPONSES.general[0];
	}

	// Mode-specific fallback
	const modeResponses: Record<SearchMode, RichResponse> = {
		text: {
			text: `🔍 Searching for "${query}" across text indexes... I found relevant matches in your knowledge base. Here's what I'd recommend:\n\n• Use **hybrid search** for best results\n• Configure **filters** for precise queries\n• Check the **Analytics** dashboard for query insights`,
			suggestions: ["How to improve search relevance?", "Filter syntax guide", "Analytics overview"],
		},
		voice: {
			text: `🎤 Voice search for "${query}"... AACsearch can process voice queries and match them against your indexed content. This is currently in **private beta**.\n\nInterested in early access? Let me know!`,
			suggestions: ["Sign up for voice beta", "How voice search works", "Supported languages"],
		},
		photo: {
			text: `📷 Analyzing "${query}" using visual recognition... AACsearch's **visual search** can find products, screenshots, and documents by image content. Coming soon!`,
			suggestions: ["Visual search use cases", "Image indexing format", "Notify me when ready"],
		},
		image: {
			text: `🖼️ Looking for visually similar content to "${query}"... Our **image search** compares embeddings to find the most relevant visual matches. Coming soon!`,
			suggestions: ["Image search applications", "Supported formats", "Get early access"],
		},
		chat: {
			text: `💬 Let me think about "${query}"... Based on my knowledge of AACsearch:\n\nAACsearch is a multimodal search platform that helps you find anything across your data — text, voice, images, and photos. Key strengths:\n\n• Hybrid relevance (keyword + semantic)\n• <50ms response time\n• SOC 2 compliance\n• Built-in analytics\n\nWhat specific aspect would you like to explore?`,
			suggestions: ["Compare with other search engines", "Performance benchmarks", "Security & compliance"],
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
					title ?? existing?.title ?? newMessages.find((m) => m.role === "user")?.text.slice(0, 60) ?? "New chat";

				const updated: ChatSession[] = prev
					.map((s) =>
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

	const selectSession = useCallback(
		(session: ChatSession) => {
			setCurrentSessionId(session.id);
			setMessages(session.messages);
			setView("chat");
			setActiveMode("chat");
			setInput("");
		},
		[],
	);

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
				"fixed inset-0 z-50 flex flex-col overflow-hidden bg-card sm:hidden transition-all duration-300 ease-out",
				open
					? "pointer-events-auto visible opacity-100"
					: "pointer-events-none invisible opacity-0",
			)}
		>
			{/* Header */}
			<div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3.5">
				<div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
					<SparklesIcon className="size-3.5 text-muted-foreground" />
					<span className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.06]" />
				</div>
				{view === "history" ? (
					<>
						<span className="text-sm font-light text-foreground">History</span>
						<button type="button" onClick={() => setView("chat")}
							className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground/50 text-xs transition-colors hover:text-muted-foreground">← Back</button>
					</>
				) : (
					<>
						<span className="text-sm font-light text-foreground">
							{hasMessages ? currentSession?.title?.slice(0, 24) ?? "Chat" : "AI Assistant"}
						</span>
						<div className="ml-auto flex items-center gap-0.5">
							{MODES.map(({ key, icon: Icon }) => (
								<button key={key} type="button" onClick={() => handleModeClick(key)}
									className={cn("flex size-7 items-center justify-center rounded-md transition-colors",
										activeMode === key ? "bg-muted text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40")}
									aria-label={`Search by ${key}`}>
									<Icon className="size-3.5" />
								</button>
							))}
						</div>
						<button type="button" onClick={openHistory}
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
							aria-label="Chat history"><ClockIcon className="size-3.5" /></button>
						<button type="button" onClick={startNewChat}
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
							aria-label="New chat"><PlusIcon className="size-3.5" /></button>
					</>
				)}
				<button type="button" onClick={() => setOpen(false)}
					className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
					aria-label="Close assistant"><XIcon className="size-4" /></button>
			</div>

			{view === "history" ? (
				<div className="flex-1 overflow-y-auto p-4">
					{sessions.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-center">
							<ClockIcon className="size-8 text-muted-foreground/30 mb-3" />
							<p className="text-sm font-light text-muted-foreground/50">No chat history yet</p>
						</div>
					) : (
						<div className="space-y-6">{groupSessionsByDate(sessions).map((group) => (
							<div key={group.label}>
								<h4 className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
								<div className="space-y-1">{group.sessions.map((session) => (
									<button key={session.id} type="button" onClick={() => selectSession(session)}
										className={cn("group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
											session.id === currentSessionId ? "bg-muted" : "hover:bg-muted/50")}>
										<MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-light text-foreground truncate">{session.title}</p>
											<p className="text-[10px] font-light text-muted-foreground/50 mt-0.5">{session.messages.length} messages · {formatTimestamp(session.updatedAt)}</p>
										</div>
										<button type="button" onClick={(e) => deleteSession(e, session.id)}
											className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
											aria-label="Delete chat"><Trash2Icon className="size-3" /></button>
									</button>
								))}</div>
							</div>
						))}</div>
					)}
					<div className="mt-4"><Button variant="outline" size="sm" onClick={startNewChat} className="w-full rounded-lg"><PlusIcon className="mr-1.5 size-3.5" /> New Chat</Button></div>
				</div>
			) : (
				<>
					<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
						<div className="space-y-4">
							<ChatBubble variant="received" layout="ai">
								<ChatBubbleMessage variant="received" layout="ai">
									<div className="space-y-3">
										<div className="flex items-center gap-2">
											<div className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
												<SparklesIcon className="size-3 text-muted-foreground" />
											</div>
											<span className="text-xs font-medium text-foreground/80">AACsearch Assistant</span>
										</div>
										<p className="text-sm font-light text-muted-foreground leading-relaxed">{WELCOME_MESSAGE}</p>
									</div>
								</ChatBubbleMessage>
							</ChatBubble>
						</div>
						{messages.map((msg) => (
							<ChatBubble key={msg.id} variant={msg.role === "user" ? "sent" : "received"} layout={msg.role === "user" ? "default" : "ai"}>
								<ChatBubbleMessage variant={msg.role === "user" ? "sent" : "received"} layout={msg.role === "user" ? "default" : "ai"}>
									{msg.mode && msg.role === "user" && (
										<div className="mb-1 flex items-center gap-1">
											<span className="text-[10px] font-medium text-muted-foreground/50">{MODES.find((m) => m.key === msg.mode)?.label}</span>
										</div>
									)}
									<p className={cn("text-sm font-light leading-relaxed whitespace-pre-wrap", msg.role === "assistant" && "text-muted-foreground")}>{msg.text}</p>
								</ChatBubbleMessage>
							</ChatBubble>
						))}
						{isLoading && (
							<ChatBubble variant="received" layout="ai">
								<ChatBubbleMessage variant="received" layout="ai" isLoading />
							</ChatBubble>
						)}
						{!hasMessages && (
							<div className="flex flex-col gap-2 pt-2">
								{SUGGESTED_QUESTIONS.map((q) => (
									<button key={q.text} type="button" onClick={() => handleSuggestedClick(q.text)}
										className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2.5 text-left text-sm font-light text-muted-foreground/80 transition-all hover:border-border hover:bg-muted/40 hover:text-foreground">
										<span className="text-base">{q.icon}</span>
										<span>{q.text}</span>
									</button>
								))}
							</div>
						)}
					</div>
					<div className="shrink-0 border-t border-border p-3">
						<form onSubmit={handleSubmit} className="flex items-end gap-2">
							<div className="relative flex-1">
								<ChatInput ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
									onKeyDown={handleKeyDown} placeholder={MODE_PLACEHOLDERS[activeMode]}
									className="min-h-10 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-light placeholder:text-muted-foreground/50 focus:border-muted-foreground/30 focus:outline-none" />
							</div>
							<Button type="submit" size="icon" variant="primary" disabled={!input.trim() || isLoading}
								className="flex size-10 shrink-0 items-center justify-center rounded-lg"><ArrowRightIcon className="size-4" /></Button>
						</form>
					</div>
				</>
			)}
		</div>
	);

	// ── Desktop Container (floating toggle + panel) ────────
	const desktopContainer = (
		<div className="hidden sm:block fixed bottom-6 right-6 z-50">
			<div
				className={cn(
					"absolute bottom-[calc(100%+12px)] right-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 ease-out origin-bottom-right",
					open ? "pointer-events-auto visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0",
					"w-[440px] h-[600px] max-h-[600px]",
				)}
			>
				<div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
					<div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
						<SparklesIcon className="size-3.5 text-muted-foreground" />
						<span className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.06]" />
					</div>
					{view === "history" ? (
						<><span className="text-sm font-light text-foreground">History</span>
							<button type="button" onClick={() => setView("chat")}
								className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground/50 text-xs transition-colors hover:text-muted-foreground">← Back</button></>
					) : (
						<><span className="text-sm font-light text-foreground">{hasMessages ? currentSession?.title?.slice(0, 24) ?? "Chat" : "AI Assistant"}</span>
							<div className="ml-auto flex items-center gap-0.5">{MODES.map(({ key, icon: Icon }) => (
								<button key={key} type="button" onClick={() => handleModeClick(key)}
									className={cn("flex size-7 items-center justify-center rounded-md transition-colors",
										activeMode === key ? "bg-muted text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40")}
									aria-label={`Search by ${key}`}><Icon className="size-3.5" /></button>
							))}</div>
							<button type="button" onClick={openHistory}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
								aria-label="Chat history"><ClockIcon className="size-3.5" /></button>
							<button type="button" onClick={startNewChat}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
								aria-label="New chat"><PlusIcon className="size-3.5" /></button>
						</>
					)}
					<button type="button" onClick={() => setOpen(false)}
						className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
						aria-label="Close"><XIcon className="size-4" /></button>
				</div>

				{view === "history" ? (
					<div className="flex-1 overflow-y-auto p-4">
						{sessions.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center">
								<ClockIcon className="size-8 text-muted-foreground/30 mb-3" />
								<p className="text-sm font-light text-muted-foreground/50">No chat history yet</p>
							</div>
						) : (
							<div className="space-y-6">{groupSessionsByDate(sessions).map((group) => (
								<div key={group.label}>
									<h4 className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 px-1">{group.label}</h4>
									<div className="space-y-1">{group.sessions.map((session) => (
										<button key={session.id} type="button" onClick={() => selectSession(session)}
											className={cn("group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
												session.id === currentSessionId ? "bg-muted" : "hover:bg-muted/50")}>
											<MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
											<div className="flex-1 min-w-0">
												<p className="text-sm font-light text-foreground truncate">{session.title}</p>
												<p className="text-[10px] font-light text-muted-foreground/50 mt-0.5">{session.messages.length} messages · {formatTimestamp(session.updatedAt)}</p>
											</div>
											<button type="button" onClick={(e) => deleteSession(e, session.id)}
												className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
												aria-label="Delete chat"><Trash2Icon className="size-3" /></button>
										</button>
									))}</div>
								</div>
							))}</div>
						)}
						<div className="mt-4"><Button variant="outline" size="sm" onClick={startNewChat} className="w-full rounded-lg"><PlusIcon className="mr-1.5 size-3.5" /> New Chat</Button></div>
					</div>
				) : (
					<>
						<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
							<div className="space-y-4">
								<ChatBubble variant="received" layout="ai">
									<ChatBubbleMessage variant="received" layout="ai">
										<div className="space-y-3">
											<div className="flex items-center gap-2">
												<div className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50"><SparklesIcon className="size-3 text-muted-foreground" /></div>
												<span className="text-xs font-medium text-foreground/80">AACsearch Assistant</span>
											</div>
											<p className="text-sm font-light text-muted-foreground leading-relaxed">{WELCOME_MESSAGE}</p>
										</div>
									</ChatBubbleMessage>
								</ChatBubble>
							</div>
							{messages.map((msg) => (
								<ChatBubble key={msg.id} variant={msg.role === "user" ? "sent" : "received"} layout={msg.role === "user" ? "default" : "ai"}>
									<ChatBubbleMessage variant={msg.role === "user" ? "sent" : "received"} layout={msg.role === "user" ? "default" : "ai"}>
										{msg.mode && msg.role === "user" && <div className="mb-1 flex items-center gap-1"><span className="text-[10px] font-medium text-muted-foreground/50">{MODES.find((m) => m.key === msg.mode)?.label}</span></div>}
										<p className={cn("text-sm font-light leading-relaxed whitespace-pre-wrap", msg.role === "assistant" && "text-muted-foreground")}>{msg.text}</p>
									</ChatBubbleMessage>
								</ChatBubble>
							))}
							{isLoading && <ChatBubble variant="received" layout="ai"><ChatBubbleMessage variant="received" layout="ai" isLoading /></ChatBubble>}
							{!hasMessages && (
								<div className="flex flex-col gap-2 pt-2">
									{SUGGESTED_QUESTIONS.map((q) => (
										<button key={q.text} type="button" onClick={() => handleSuggestedClick(q.text)}
											className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2.5 text-left text-sm font-light text-muted-foreground/80 transition-all hover:border-border hover:bg-muted/40 hover:text-foreground">
											<span className="text-base">{q.icon}</span>
											<span>{q.text}</span>
										</button>
									))}
								</div>
							)}
						</div>
						<div className="shrink-0 border-t border-border p-3">
							<form onSubmit={handleSubmit} className="flex items-end gap-2">
								<div className="relative flex-1">
									<ChatInput ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
										onKeyDown={handleKeyDown} placeholder={MODE_PLACEHOLDERS[activeMode]}
										className="min-h-10 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-light placeholder:text-muted-foreground/50 focus:border-muted-foreground/30 focus:outline-none" />
								</div>
								<Button type="submit" size="icon" variant="primary" disabled={!input.trim() || isLoading}
									className="flex size-10 shrink-0 items-center justify-center rounded-lg"><ArrowRightIcon className="size-4" /></Button>
							</form>
						</div>
					</>
				)}
			</div>

			{/* Desktop toggle pill */}
			<div className={cn("transition-all duration-500 ease-in-out",
					visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none")}>
				<button type="button" onClick={() => { setOpen(!open); if (!open) setView("chat"); }}
					className={cn("ml-auto flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-black/10 sm:px-5 sm:py-3",
						open && "opacity-0 pointer-events-none")}>
					<div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
						<SparklesIcon className="size-4 text-muted-foreground" />
						<span className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.06]" />
					</div>
					<span className="text-sm font-light text-muted-foreground/70 whitespace-nowrap">Ask AI...</span>
					{sessions.length > 0 && (
						<span className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
							{sessions.length > 9 ? "9+" : sessions.length}
						</span>
					)}
					<span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 sm:inline-flex">
						<KeyboardIcon className="size-2.5" /><span>K</span>
					</span>
				</button>
			</div>
		</div>
	);

	// ── Mobile Bottom Bar ────────────────────────────────
	const mobileBottomBar = (
		<div className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-center border-t border-border bg-card/95 backdrop-blur-xl px-2 py-1.5 pb-[env(safe-area-inset-bottom,8px)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
			<button type="button"
				onClick={() => window.dispatchEvent(new CustomEvent("aacsearch:toggle-menu"))}
				className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 active:bg-muted/60 transition-colors"
				aria-label="Open menu">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
					<line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
				</svg>
			</button>
			<div className="mx-1.5 h-7 w-px shrink-0 bg-border/60" />

			{/* Main Ask AI trigger */}
			<button type="button" onClick={() => { setOpen(true); setView("chat"); }}
				className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 transition-colors active:bg-muted/40 truncate">
				<div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 via-primary/8 to-transparent">
					<SparklesIcon className="size-4 text-primary" />
				</div>
				<div className="flex items-center gap-1 min-w-0 truncate">
					<span className="text-sm font-light text-muted-foreground/90 whitespace-nowrap">Ask AI</span>
				</div>
				{sessions.length > 0 && (
					<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-medium text-muted-foreground ml-auto">
						{sessions.length > 9 ? "9+" : sessions.length}
					</span>
				)}
			</button>

			<div className="mx-1 h-6 w-px shrink-0 bg-border/40" />

			{/* Clickable mode chips */}
			<div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
				{MODES.map(({ key, icon: Icon }) => (
					<button key={key} type="button"
						onClick={() => { setActiveMode(key); setOpen(true); setView("chat"); }}
						className={cn("flex flex-col items-center justify-center rounded-lg transition-colors active:scale-95 px-2 py-1 gap-0.5",
							activeMode === key ? "bg-muted text-foreground" : "text-muted-foreground/50 active:text-foreground")}
						aria-label={`Search by ${key}`}>
						<Icon className="size-4" />
						<span className="text-[9px] font-light leading-none">{key === "text" ? "Text" : key === "voice" ? "Voice" : key === "photo" ? "Photo" : key === "image" ? "Image" : "Chat"}</span>
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
