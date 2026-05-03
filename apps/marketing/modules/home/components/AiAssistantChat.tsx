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
	ImageIcon,
	KeyboardIcon,
	MessageSquareIcon,
	MicIcon,
	SearchIcon,
	SparklesIcon,
	XIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

interface AiAssistantChatProps {
	visible: boolean;
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	mode?: SearchMode;
}

const MODES: { key: SearchMode; icon: typeof KeyboardIcon; label: string }[] = [
	{ key: "text", icon: KeyboardIcon, label: "Text" },
	{ key: "voice", icon: MicIcon, label: "Voice" },
	{ key: "photo", icon: CameraIcon, label: "Photo" },
	{ key: "image", icon: ImageIcon, label: "Image" },
	{ key: "chat", icon: MessageSquareIcon, label: "AI Chat" },
];

const MODE_ACTIVE_COLORS: Record<SearchMode, string> = {
	text: "text-foreground",
	voice: "text-cyan-400",
	photo: "text-purple-400",
	image: "text-amber-400",
	chat: "text-green-400",
};

const MODE_PLACEHOLDERS: Record<SearchMode, string> = {
	text: "Search with text...",
	voice: "Search with voice...",
	photo: "Find this photo...",
	image: "Find similar images...",
	chat: "Ask AI anything...",
};

const WELCOME_MESSAGE =
	"I'm your AI search assistant. I can help you find anything across your data — by text, voice, images, or photos. Ask me anything or pick a search mode above.";

const EXAMPLE_PROMPTS = [
	"Search products by image",
	"Find documents with voice",
	"What changed in billing?",
	"Show me my knowledge base",
	"Compare products visually",
];

const AI_RESPONSES: Record<SearchMode, (query: string) => string> = {
	text: (q) =>
		`🔍 Searching for "${q}" across all text indexes... I found relevant matches in your knowledge base and documentation. Open Dashboard for full results.`,
	voice: (q) =>
		`🎤 Voice search for "${q}"... Processing your audio query. I'll match it against your indexed documents and return results in the dashboard.`,
	photo: (q) =>
		`📷 Analyzing "${q}" using visual recognition... I'm comparing image features against your indexed media. Results will appear in your dashboard.`,
	image: (q) =>
		`🖼️ Looking for visually similar content to "${q}"... Scanning image embeddings across your data. Open dashboard to see matches.`,
	chat: (q) =>
		`💬 Let me think about "${q}"... I've searched across your connected data sources — documents, images, and metadata. Here's a summary of what I found.`,
};

export function AiAssistantChat({ visible }: AiAssistantChatProps) {
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [activeMode, setActiveMode] = useState<SearchMode>("text");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const msgIdCounter = useRef(0);

	const hasMessages = messages.length > 0;

	// Auto-focus input when panel opens
	useEffect(() => {
		if (open && inputRef.current) {
			setTimeout(() => inputRef.current?.focus(), 350);
		}
	}, [open]);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		if (scrollRef.current) {
			requestAnimationFrame(() => {
				scrollRef.current!.scrollTo({
					top: scrollRef.current!.scrollHeight,
					behavior: "smooth",
				});
			});
		}
	}, [messages, isLoading]);

	const addMessage = useCallback((role: "user" | "assistant", text: string, mode?: SearchMode) => {
		const id = `msg-${++msgIdCounter.current}`;
		setMessages((prev) => [...prev, { id, role, text, mode }]);
	}, []);

	const simulateResponse = useCallback(
		(query: string, mode: SearchMode) => {
			setIsLoading(true);
			const delay = 600 + Math.random() * 600;
			setTimeout(() => {
				const responder = AI_RESPONSES[mode];
				addMessage("assistant", responder(query), mode);
				setIsLoading(false);
			}, delay);
		},
		[addMessage],
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

	const handleChipClick = useCallback(
		(prompt: string) => {
			addMessage("user", prompt, activeMode);
			setInput("");
			simulateResponse(prompt, activeMode);
		},
		[activeMode, addMessage, simulateResponse],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	return (
		<div
			className={cn(
				"fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6",
				"transition-all duration-500 ease-in-out",
				visible
					? "opacity-100 translate-y-0"
					: "opacity-0 translate-y-8 pointer-events-none",
			)}
		>
			{/* ─── Chat Panel ────────────────────────────────── */}
			<div
				className={cn(
					"absolute bottom-[calc(100%+12px)] right-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 ease-out origin-bottom-right",
					open
						? "pointer-events-auto visible scale-100 opacity-100"
						: "pointer-events-none invisible scale-95 opacity-0",
					"h-[520px] w-[calc(100vw-32px)] sm:h-[560px] sm:w-[420px]",
				)}
			>
				{/* Header */}
				<div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
					<div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
						<SparklesIcon className="size-3.5 text-primary" />
						<span className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.06]" />
					</div>
					<span className="text-sm font-light text-foreground">AI Assistant</span>

					{/* Mode icons — just visual switch */}
					<div className="ml-auto flex items-center gap-0.5">
						{MODES.map(({ key, icon: Icon }) => (
							<button
								key={key}
								type="button"
								onClick={() => handleModeClick(key)}
								className={cn(
									"flex size-7 items-center justify-center rounded-md transition-colors",
									activeMode === key
										? `${MODE_ACTIVE_COLORS[key]} bg-muted`
										: "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40",
								)}
								aria-label={`Search by ${key}`}
							>
								<Icon className="size-3.5" />
							</button>
						))}
					</div>

					<button
						type="button"
						onClick={() => setOpen(false)}
						className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-muted-foreground"
						aria-label="Close assistant"
					>
						<XIcon className="size-4" />
					</button>
				</div>

				{/* Body — chat history */}
				<div
					ref={scrollRef}
					className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
				>
					{/* Welcome message — always first */}
					<div className="space-y-4">
						<ChatBubble variant="received" layout="ai">
							<ChatBubbleMessage variant="received" layout="ai">
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<div className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5">
											<SparklesIcon className="size-3 text-primary" />
										</div>
										<span className="text-xs font-medium text-foreground/80">
											AACsearch Assistant
										</span>
									</div>
									<p className="text-sm font-light text-muted-foreground leading-relaxed">
										{WELCOME_MESSAGE}
									</p>
								</div>
							</ChatBubbleMessage>
						</ChatBubble>
					</div>

					{/* Messages history */}
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
									<div className="mb-1 flex items-center gap-1">
										<span
											className={cn(
												"text-[10px] font-medium",
												MODE_ACTIVE_COLORS[msg.mode],
											)}
										>
											{MODES.find((m) => m.key === msg.mode)?.label}
										</span>
									</div>
								)}
								<p className="text-sm font-light leading-relaxed">
									{msg.text}
								</p>
							</ChatBubbleMessage>
						</ChatBubble>
					))}

					{/* Loading dots */}
					{isLoading && (
						<ChatBubble variant="received" layout="ai">
							<ChatBubbleMessage variant="received" layout="ai" isLoading />
						</ChatBubble>
					)}

					{/* Example prompts — only show before first message */}
					{!hasMessages && (
						<div className="flex flex-wrap gap-2 pt-2">
							{EXAMPLE_PROMPTS.map((prompt) => (
								<button
									key={prompt}
									type="button"
									onClick={() => handleChipClick(prompt)}
									className="inline-flex cursor-pointer items-center rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-light text-muted-foreground/70 transition-all hover:border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground"
								>
									<SearchIcon className="mr-1.5 size-3" />
									{prompt}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Footer — input */}
				<div className="shrink-0 border-t border-border p-3">
					<form onSubmit={handleSubmit} className="flex items-end gap-2">
						<div className="relative flex-1">
							{/* Mode indicator */}
							<div className="pointer-events-none absolute bottom-full left-0 mb-1 flex items-center gap-1 px-1">
								<span
									className={cn(
										"text-[10px] font-medium transition-colors",
										MODE_ACTIVE_COLORS[activeMode],
									)}
								>
									{MODES.find((m) => m.key === activeMode)?.label}
								</span>
							</div>
							<ChatInput
								ref={inputRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder={MODE_PLACEHOLDERS[activeMode]}
								className="min-h-10 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-light placeholder:text-muted-foreground/50 focus:border-muted-foreground/30 focus:outline-none"
							/>
						</div>
						<Button
							type="submit"
							size="icon"
							variant="primary"
							disabled={!input.trim() || isLoading}
							className="flex size-10 shrink-0 items-center justify-center rounded-lg"
						>
							<ArrowRightIcon className="size-4" />
						</Button>
					</form>
				</div>
			</div>

			{/* ─── Toggle Pill ────────────────────────────────── */}
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className={cn(
					"ml-auto flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-black/10 sm:px-5 sm:py-3",
					open && "opacity-0 pointer-events-none",
				)}
			>
				<div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
					<SparklesIcon className="size-4 text-primary" />
					<span className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.06]" />
				</div>
				<span className="text-sm font-light text-muted-foreground/70 whitespace-nowrap">
					Ask AI...
				</span>
				<span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 sm:inline-flex">
					<KeyboardIcon className="size-2.5" />
					<span>K</span>
				</span>
			</button>
		</div>
	);
}
