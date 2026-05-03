"use client";

import { useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import { cn } from "@repo/ui";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	ChatBubble,
	ChatBubbleAvatar,
	ChatBubbleMessage,
} from "@repo/ui/components/chat/chat-bubble";
import { ChatInput } from "@repo/ui/components/chat/chat-input";
import { ChatMessageList } from "@repo/ui/components/chat/chat-message-list";
import MessageLoading from "@repo/ui/components/chat/message-loading";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@repo/ui/components/sheet";
import { toastError } from "@repo/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { orpcClient } from "@shared/lib/orpc-client";
import {
	BotIcon,
	HistoryIcon,
	PlusIcon,
	SearchIcon,
	SendIcon,
	SquareIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import "streamdown/styles.css";

import { useAiChatSessions } from "../hooks/use-ai-chat-sessions";

// ── Suggested Prompts ──────────────────────────────────────────────────

const PROMPT_SUGGESTIONS = [
	{
		icon: SearchIcon,
		text: "Compare pricing plans",
		prompt: "Compare the pricing plans available for AACsearch",
	},
	{
		icon: BotIcon,
		text: "How to integrate?",
		prompt: "How do I integrate AACsearch into my application?",
	},
	{
		icon: HistoryIcon,
		text: "Migration guide",
		prompt: "What's the migration guide from Algolia to AACsearch?",
	},
	{
		icon: SearchIcon,
		text: "SDK docs",
		prompt: "Show me the SDK documentation and available client libraries",
	},
];

// ── History Sidebar ────────────────────────────────────────────────────

function HistorySidebar({
	sessions,
	activeSessionId,
	onSelect,
	onDelete,
	onNewChat,
}: {
	sessions: ReturnType<typeof useAiChatSessions>["sessions"];
	activeSessionId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	onNewChat: () => void;
}) {
	const t = useTranslations("ai.chat");

	return (
		<div className="flex h-full flex-col">
			<div className="px-4 py-3 flex items-center justify-between border-b">
				<span className="font-medium text-sm">{t("history") ?? "History"}</span>
				<Button variant="ghost" size="icon" className="size-7" onClick={onNewChat}>
					<PlusIcon className="size-3.5" />
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto">
				{sessions.length === 0 ? (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						{t("noSessions") ?? "No conversations yet"}
					</div>
				) : (
					sessions.map((session) => (
						<div
							key={session.id}
							className={cn(
								"group px-3 py-2.5 flex items-center justify-between border-b hover:bg-muted/50 cursor-pointer transition-colors",
								session.id === activeSessionId && "bg-muted",
							)}
							onClick={() => onSelect(session.id)}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === "Enter") onSelect(session.id);
							}}
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{session.title}</p>
								<p className="text-xs text-muted-foreground">
									{session.messages.length} messages
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="size-7 opacity-0 group-hover:opacity-100 shrink-0"
								onClick={(e) => {
									e.stopPropagation();
									onDelete(session.id);
								}}
							>
								<Trash2Icon className="size-3.5 text-destructive" />
							</Button>
						</div>
					))
				)}
			</div>
		</div>
	);
}

// ── Main AiChat Component ──────────────────────────────────────────────

export function AiChat() {
	const t = useTranslations("ai.chat");
	const [input, setInput] = useState("");
	const [historyOpen, setHistoryOpen] = useState(false);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// ── Session Management ─────────────────────────────────────────

	const {
		sessions,
		activeSession,
		activeSessionId,
		activeMessages,
		isLoaded,
		createSession,
		deleteSession,
		addMessage,
		switchSession,
	} = useAiChatSessions();

	// ── Chat Streaming ──────────────────────────────────────────────

	const { messages, status, sendMessage, setMessages } = useChat({
		id: activeSessionId ?? "new",
		messages: activeMessages.map((m) => ({
			id: m.id,
			role: m.role,
			parts: [{ type: "text" as const, text: m.text }],
		})),
		transport: {
			async sendMessages(options) {
				return eventIteratorToStream(
					await orpcClient.ai.stream(
						{
							messages: options.messages.map((m) => ({
								id: m.id,
								role: m.role,
								parts: m.parts,
							})),
						},
						{ signal: options.abortSignal },
					),
				);
			},
			reconnectToStream() {
				throw new Error("Unsupported");
			},
		},
		onFinish({ message }) {
			// Persist assistant message to session
			if (activeSessionId) {
				const text =
					message.parts
						?.filter((p) => p.type === "text")
						.map((p) => (p as { type: "text"; text: string }).text)
						.join("") ?? "";
				if (text) {
					addMessage(activeSessionId, { role: "assistant", text });
				}
			}
		},
	});

	// Persist user messages to session
	const prevMsgCountRef = useRef(messages.length);
	useEffect(() => {
		if (!activeSessionId || messages.length <= prevMsgCountRef.current) return;
		const lastMsg = messages[messages.length - 1];
		if (lastMsg?.role === "user") {
			const text =
				lastMsg.parts
					?.filter((p) => p.type === "text")
					.map((p) => (p as { type: "text"; text: string }).text)
					.join("") ?? "";
			if (text) {
				addMessage(activeSessionId, { role: "user", text });
			}
		}
		prevMsgCountRef.current = messages.length;
	}, [messages, activeSessionId, addMessage]);

	// ── Handlers ───────────────────────────────────────────────────

	const handleSubmit = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;
			setInput("");

			try {
				await sendMessage({ text: trimmed });
			} catch {
				toastError(t("failedToSend") ?? "Failed to send message");
				setInput(trimmed);
			}
		},
		[sendMessage, t],
	);

	const handleNewChat = useCallback(() => {
		createSession();
		setMessages([]);
		setHistoryOpen(false);
	}, [createSession, setMessages]);

	const handleSelectSession = useCallback(
		(sessionId: string) => {
			switchSession(sessionId);
			setHistoryOpen(false);
		},
		[switchSession],
	);

	const handleDeleteSession = useCallback(
		(sessionId: string) => {
			deleteSession(sessionId);
		},
		[deleteSession],
	);

	// Scroll to bottom on new messages
	useEffect(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight;
		}
	}, [messages.length, status]);

	const isStreaming = status === "streaming" || status === "submitted";

	if (!isLoaded) {
		return (
			<div className="flex h-[calc(100vh-10rem)] items-center justify-center">
				<div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="relative flex h-[calc(100vh-10rem)] flex-row">
			{/* History Sidebar (desktop) */}
			<div className="hidden w-64 shrink-0 border-r md:block">
				<HistorySidebar
					sessions={sessions}
					activeSessionId={activeSessionId}
					onSelect={handleSelectSession}
					onDelete={handleDeleteSession}
					onNewChat={handleNewChat}
				/>
			</div>

			{/* Main Chat Area */}
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Header */}
				<div className="px-4 py-3 flex items-center justify-between border-b">
					<div className="gap-2 flex items-center">
						{/* History toggle (mobile) */}
						<Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
							<SheetTrigger asChild>
								<Button variant="ghost" size="icon" className="size-8 md:hidden">
									<HistoryIcon className="size-4" />
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="w-72 p-0">
								<SheetHeader className="px-4 py-3 border-b">
									<SheetTitle className="text-sm">{t("history") ?? "History"}</SheetTitle>
								</SheetHeader>
								<HistorySidebar
									sessions={sessions}
									activeSessionId={activeSessionId}
									onSelect={handleSelectSession}
									onDelete={handleDeleteSession}
									onNewChat={handleNewChat}
								/>
							</SheetContent>
						</Sheet>

						<BotIcon className="size-4 text-primary" />
						<span className="font-medium text-sm">
							{activeSession?.title ?? "AI Chatbot"}
						</span>
						{activeSession && (
							<Badge variant="secondary" className="text-xs font-mono">
								{activeSession.messages.length} msg
							</Badge>
						)}
					</div>
					<Button variant="ghost" size="sm" className="gap-1.5" onClick={handleNewChat}>
						<PlusIcon className="size-3.5" />
						<span className="text-xs">{t("newChat") ?? "New"}</span>
					</Button>
				</div>

				{/* Messages Area */}
				<ChatMessageList ref={messagesContainerRef} className="flex-1 overflow-y-auto">
					{messages.length === 0 && (
						<div className="flex h-full flex-col items-center justify-center gap-6">
							<BotIcon className="size-12 text-muted-foreground/20" />
							<p className="max-w-md text-center text-sm text-muted-foreground">
								{t("placeholder") ?? "Ask anything about AACsearch, your indexed data, or get help with integration."}
							</p>
							<div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
								{PROMPT_SUGGESTIONS.map((suggestion, index) => {
									const Icon = suggestion.icon;
									return (
										<Button
											key={index}
											type="button"
											variant="outline"
											onClick={() => handleSubmit(suggestion.prompt)}
											disabled={isStreaming}
											className="gap-2 p-4 h-auto rounded-2xl text-left"
										>
											<Icon className="size-5 shrink-0 text-primary" />
											<span className="text-sm">{suggestion.text}</span>
										</Button>
									);
								})}
							</div>
						</div>
					)}

					{messages.map((message, idx) => {
						const isUser = message.role === "user";
						const parts = message.parts;
						return (
							<ChatBubble key={message.id ?? idx} variant={isUser ? "sent" : "received"}>
								<ChatBubbleAvatar fallback={isUser ? "U" : "AI"} className="size-8" />
								<ChatBubbleMessage variant={isUser ? "sent" : "received"}>
									{parts?.map((part, partIdx) =>
										part.type === "text" ? (
											isUser ? (
												<span key={partIdx} className="whitespace-pre-wrap">
													{part.text}
												</span>
											) : (
												<Streamdown
													key={partIdx}
													animated
													isAnimating={
														isStreaming &&
														idx === messages.length - 1 &&
														parts != null &&
														partIdx === parts.length - 1
													}
													className="wrap-break-words prose prose-sm dark:prose-invert max-w-none"
												>
													{part.text}
												</Streamdown>
											)
										) : null,
									)}
								</ChatBubbleMessage>
							</ChatBubble>
						);
					})}

					{isStreaming && (messages.at(-1)?.role === "user" || messages.length === 0) && (
						<ChatBubble variant="received">
							<ChatBubbleAvatar fallback="AI" className="size-8" />
							<ChatBubbleMessage isLoading>
								<MessageLoading />
							</ChatBubbleMessage>
						</ChatBubble>
					)}
				</ChatMessageList>

				{/* Input */}
				<div className="gap-2 p-3 flex items-end border-t">
					<div className="relative flex-1 rounded-lg border bg-background focus-within:ring-1 focus-within:ring-primary">
						<ChatInput
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder={
								t("inputPlaceholder") ?? "Ask about AACsearch or your indexed data..."
							}
							disabled={isStreaming}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									void handleSubmit(e.currentTarget.value);
								}
							}}
							className="pr-8 min-h-[42px] border-0 focus-visible:ring-0"
						/>
					</div>
					<Button
						size="icon"
						variant="primary"
						className="size-[42px] shrink-0"
						disabled={!input.trim() || isStreaming}
						onClick={() => void handleSubmit(input)}
					>
						{isStreaming ? (
							<SquareIcon className="size-4 animate-pulse" />
						) : (
							<SendIcon className="size-4" />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
