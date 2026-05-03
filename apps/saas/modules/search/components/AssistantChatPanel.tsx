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
import { toastError } from "@repo/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { orpcClient } from "@shared/lib/orpc-client";
import {
	PlusIcon,
	SendIcon,
	MicIcon,
	MicOffIcon,
	Volume2Icon,
	VolumeXIcon,
	SquareIcon,
	BotIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import "streamdown/styles.css";

interface Props {
	organizationId: string;
	locale?: string;
}

export function AssistantChatPanel({ organizationId, locale = "ru" }: Props) {
	const t = useTranslations("search.assistant.chat");

	const [conversationId, setConversationId] = useState<string | null>(null);
	const [ttsEnabled, setTtsEnabled] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const { messages, status, sendMessage, setMessages } = useChat({
		id: conversationId ?? "new",
		transport: {
			async sendMessages(options) {
				const userMsg = options.messages.at(-1);
				const text =
					(
						userMsg?.parts?.find((p) => p.type === "text") as
							| { type: "text"; text: string }
							| undefined
					)?.text ?? "";

				let convId = conversationId;
				if (!convId) {
					try {
						const conv = await orpcClient.assistant.createConversation({
							organizationId,
							locale,
						});
						convId = (conv as { conversationId: string }).conversationId;
						setConversationId(convId);
					} catch {
						throw new Error("Failed to create conversation");
					}
				}

				return eventIteratorToStream(
					await orpcClient.assistant.stream(
						{
							message: text,
							organizationId,
							conversationId: convId ?? undefined,
							locale,
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
			if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
			const text =
				message.parts
					?.filter((p) => p.type === "text")
					.map((p) => (p as { type: "text"; text: string }).text)
					.join("") ?? "";
			if (!text) return;
			window.speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ""));
			utterance.lang = locale;
			window.speechSynthesis.speak(utterance);
		},
	});

	const handleSend = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;
			if (inputRef.current) inputRef.current.value = "";
			try {
				await sendMessage({ text: trimmed });
			} catch {
				toastError("Failed to send message");
			}
		},
		[sendMessage],
	);

	const startNewChat = () => {
		setConversationId(null);
		setMessages([]);
		window.speechSynthesis?.cancel();
	};

	const toggleTts = () => {
		if (ttsEnabled) window.speechSynthesis?.cancel();
		setTtsEnabled((v) => !v);
	};

	const startVoice = () => {
		if (typeof window === "undefined") return;
		const SR =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
		if (!SR) return;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
		const recognition = new SR();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.lang = locale;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.interimResults = false;
		setIsListening(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		recognition.onresult = (event: any) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const transcript = String(event.results[0][0].transcript);
			if (inputRef.current) inputRef.current.value = transcript;
		};
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.onerror = () => setIsListening(false);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		recognition.onend = () => setIsListening(false);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		recognition.start();
	};

	const isStreaming = status === "streaming" || status === "submitted";

	return (
		<div className="shadow-sm flex h-[calc(100vh-16rem)] flex-col rounded-lg border bg-background">
			{/* Header */}
			<div className="px-4 py-3 flex items-center justify-between border-b">
				<div className="gap-2 flex items-center">
					<BotIcon className="size-4 text-primary" />
					<span className="font-medium text-sm">{t("title")}</span>
					{conversationId && (
						<Badge variant="secondary" className="text-xs font-mono">
							{conversationId.slice(-6)}
						</Badge>
					)}
				</div>
				<div className="gap-1 flex items-center">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={toggleTts}
								className={cn("size-8", ttsEnabled && "text-primary")}
							>
								{ttsEnabled ? (
									<Volume2Icon className="size-4" />
								) : (
									<VolumeXIcon className="size-4" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>{ttsEnabled ? t("speakOff") : t("speakOn")}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={startNewChat}
								className="size-8"
							>
								<PlusIcon className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("newChat")}</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{/* Messages */}
			<ChatMessageList smooth className="flex-1">
				{messages.length === 0 && (
					<div className="gap-3 flex h-full flex-col items-center justify-center text-center">
						<BotIcon className="size-10 text-muted-foreground/30" />
						<p className="max-w-xs text-sm text-muted-foreground">{t("placeholder")}</p>
					</div>
				)}

				{messages.map((message, idx) => {
					const isUser = message.role === "user";
					const parts = message.parts;

					return (
						<ChatBubble key={idx} variant={isUser ? "sent" : "received"}>
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
						placeholder={t("placeholder")}
						disabled={isStreaming}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								void handleSend(e.currentTarget.value);
							}
						}}
						className="pr-8 min-h-[42px] border-0 focus-visible:ring-0"
					/>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className={cn(
									"right-1 bottom-1 size-7 absolute",
									isListening && "animate-pulse text-destructive",
								)}
								onClick={startVoice}
								disabled={isStreaming}
								type="button"
							>
								{isListening ? (
									<MicOffIcon className="size-3" />
								) : (
									<MicIcon className="size-3" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t("voice")}</TooltipContent>
					</Tooltip>
				</div>
				<Button
					size="icon"
					variant="primary"
					className="size-[42px] shrink-0"
					disabled={isStreaming}
					onClick={() => {
						if (inputRef.current) void handleSend(inputRef.current.value);
					}}
				>
					{isStreaming ? (
						<SquareIcon className="size-4 animate-pulse" />
					) : (
						<SendIcon className="size-4" />
					)}
				</Button>
			</div>
		</div>
	);
}
