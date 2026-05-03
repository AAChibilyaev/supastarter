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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@repo/ui/components/sheet";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { orpcClient } from "@shared/lib/orpc-client";
import {
	BotIcon,
	ClipboardIcon,
	DownloadIcon,
	FileJsonIcon,
	FileTextIcon,
	HistoryIcon,
	PlusIcon,
	SearchIcon,
	SendIcon,
	SquareIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import "streamdown/styles.css";
import { useAiChatSessions, type ChatSession } from "../hooks/use-ai-chat-sessions";

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

// ── Helpers ─────────────────────────────────────────────────────────────

function sessionToMarkdown(session: ChatSession): string {
	const lines: string[] = [];
	lines.push(`# ${session.title}`);
	lines.push("");
	lines.push(`> Exported on ${new Date(session.createdAt).toISOString().split("T")[0]}`);
	lines.push("");

	for (const msg of session.messages) {
		const role = msg.role === "user" ? "**You**" : "**AI**";
		lines.push(`${role}:`);
		lines.push("");
		lines.push(msg.text);
		lines.push("");
	}
	return lines.join("\n");
}

function sessionToJson(session: ChatSession): string {
	return JSON.stringify(
		{
			title: session.title,
			exportedAt: new Date().toISOString(),
			messages: session.messages.map((m) => ({
				role: m.role,
				text: m.text,
				timestamp: new Date(m.timestamp).toISOString(),
			})),
		},
		null,
		2,
	);
}

function downloadFile(content: string, filename: string, mimeType: string) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

// ── History Sidebar ────────────────────────────────────────────────────

function HistorySidebar({
	sessions,
	activeSessionId,
	onSelect,
	onDelete,
	onNewChat,
	onExportMarkdown,
	onExportJson,
	onCopy,
}: {
	sessions: ReturnType<typeof useAiChatSessions>["sessions"];
	activeSessionId: string | null;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
	onNewChat: () => void;
	onExportMarkdown: (session: ChatSession) => void;
	onExportJson: (session: ChatSession) => void;
	onCopy: (session: ChatSession) => void;
}) {
	const t = useTranslations("ai.chat");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredSessions = useMemo(() => {
		if (!searchQuery.trim()) return sessions;
		const q = searchQuery.toLowerCase();
		return sessions.filter(
			(s) =>
				s.title.toLowerCase().includes(q) ||
				s.messages.some((m) => m.text.toLowerCase().includes(q)),
		);
	}, [sessions, searchQuery]);

	return (
		<div className="flex h-full flex-col">
			<div className="px-4 py-3 flex items-center justify-between border-b">
				<span className="font-medium text-sm">{t("history") ?? "History"}</span>
				<Button variant="ghost" size="icon" className="size-7" onClick={onNewChat}>
					<PlusIcon className="size-3.5" />
				</Button>
			</div>

			{/* Search */}
			<div className="px-3 py-2 border-b">
				<div className="relative">
					<SearchIcon className="left-2.5 size-3.5 absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t("searchHistory") ?? "Search conversations..."}
						className="py-1.5 pr-2.5 pl-7 text-xs w-full rounded-md border bg-background focus:ring-1 focus:ring-primary focus:outline-hidden"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{filteredSessions.length === 0 ? (
					<div className="px-4 py-8 text-sm text-center text-muted-foreground">
						{searchQuery
							? "No matching conversations"
							: (t("noSessions") ?? "No conversations yet")}
					</div>
				) : (
					filteredSessions.map((session) => (
						<div
							key={session.id}
							className={cn(
								"group px-3 py-2.5 flex cursor-pointer items-center justify-between border-b transition-colors hover:bg-muted/50",
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
								<p className="text-sm font-medium truncate">{session.title}</p>
								<p className="text-xs text-muted-foreground">
									{t("messages", { count: session.messages.length })}
								</p>
							</div>
							<div className="gap-0.5 flex shrink-0 items-center opacity-0 group-hover:opacity-100">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="size-7"
											onClick={(e) => e.stopPropagation()}
										>
											<DownloadIcon className="size-3.5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												onExportMarkdown(session);
											}}
										>
											<FileTextIcon className="mr-2 size-3.5" />
											{t("exportMarkdown") ?? "Export as Markdown"}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												onExportJson(session);
											}}
										>
											<FileJsonIcon className="mr-2 size-3.5" />
											{t("exportJson") ?? "Export as JSON"}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												onCopy(session);
											}}
										>
											<ClipboardIcon className="mr-2 size-3.5" />
											{t("copyToClipboard") ?? "Copy to clipboard"}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Button
									variant="ghost"
									size="icon"
									className="size-7"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(session.id);
									}}
								>
									<Trash2Icon className="size-3.5 text-destructive" />
								</Button>
							</div>
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

	const handleExportMarkdown = useCallback(
		async (session: ChatSession) => {
			const slug = session.title
				.replace(/[^a-zA-Z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.toLowerCase();
			downloadFile(sessionToMarkdown(session), `aacsearch-chat-${slug}.md`, "text/markdown");
			toastSuccess(t("exportedSuccess") ?? "Exported successfully");
		},
		[t],
	);

	const handleExportJson = useCallback(
		async (session: ChatSession) => {
			const slug = session.title
				.replace(/[^a-zA-Z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.toLowerCase();
			downloadFile(sessionToJson(session), `aacsearch-chat-${slug}.json`, "application/json");
			toastSuccess(t("exportedSuccess") ?? "Exported successfully");
		},
		[t],
	);

	const handleCopy = useCallback(
		async (session: ChatSession) => {
			const ok = await copyToClipboard(sessionToMarkdown(session));
			if (ok) {
				toastSuccess(t("copiedToClipboard") ?? "Copied to clipboard");
			} else {
				toastError("Failed to copy");
			}
		},
		[t],
	);

	// Scroll to bottom on new messages
	useEffect(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
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
			<div className="w-64 md:block hidden shrink-0 border-r">
				<HistorySidebar
					sessions={sessions}
					activeSessionId={activeSessionId}
					onSelect={handleSelectSession}
					onDelete={handleDeleteSession}
					onNewChat={handleNewChat}
					onExportMarkdown={handleExportMarkdown}
					onExportJson={handleExportJson}
					onCopy={handleCopy}
				/>
			</div>

			{/* Main Chat Area */}
			<div className="min-w-0 flex flex-1 flex-col">
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
									<SheetTitle className="text-sm">
										{t("history") ?? "History"}
									</SheetTitle>
								</SheetHeader>
								<HistorySidebar
									sessions={sessions}
									activeSessionId={activeSessionId}
									onSelect={handleSelectSession}
									onDelete={handleDeleteSession}
									onNewChat={handleNewChat}
									onExportMarkdown={handleExportMarkdown}
									onExportJson={handleExportJson}
									onCopy={handleCopy}
								/>
							</SheetContent>
						</Sheet>

						<BotIcon className="size-4 text-primary" />
						<span className="font-medium text-sm">
							{activeSession?.title ?? t("title") ?? "AI Chatbot"}
						</span>
						{activeSession && (
							<Badge variant="secondary" className="text-xs font-mono">
								{t("messages", { count: activeSession.messages.length })}
							</Badge>
						)}
					</div>

					{/* Header actions */}
					<div className="gap-1 flex items-center">
						{activeSession && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="size-8"
										onClick={() => handleCopy(activeSession)}
									>
										<ClipboardIcon className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{t("copyToClipboard") ?? "Copy to clipboard"}
								</TooltipContent>
							</Tooltip>
						)}
						{activeSession && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="size-8">
										<DownloadIcon className="size-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() =>
											activeSession && handleExportMarkdown(activeSession)
										}
									>
										<FileTextIcon className="mr-2 size-3.5" />
										{t("exportMarkdown") ?? "Export as Markdown"}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											activeSession && handleExportJson(activeSession)
										}
									>
										<FileJsonIcon className="mr-2 size-3.5" />
										{t("exportJson") ?? "Export as JSON"}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5"
							onClick={handleNewChat}
						>
							<PlusIcon className="size-3.5" />
							<span className="text-xs">{t("newChat") ?? "New"}</span>
						</Button>
					</div>
				</div>

				{/* Messages Area */}
				<ChatMessageList ref={messagesContainerRef} className="flex-1 overflow-y-auto">
					{messages.length === 0 && (
						<div className="gap-6 flex h-full flex-col items-center justify-center">
							<BotIcon className="size-12 text-muted-foreground/20" />
							<p className="max-w-md text-sm text-center text-muted-foreground">
								{t("placeholder") ??
									"Ask anything about AACsearch, your indexed data, or get help with integration."}
							</p>
							<div className="max-w-lg gap-3 sm:grid-cols-2 grid w-full grid-cols-1">
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
							<ChatBubble
								key={message.id ?? idx}
								variant={isUser ? "sent" : "received"}
							>
								<ChatBubbleAvatar
									fallback={isUser ? "U" : "AI"}
									className="size-8"
								/>
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
								t("inputPlaceholder") ??
								"Ask about AACsearch or your indexed data..."
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
