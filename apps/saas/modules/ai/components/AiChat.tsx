"use client";

import { useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError } from "@repo/ui/components/toast";
import { orpcClient } from "@shared/lib/orpc-client";
import {
	ArrowUpIcon,
	CodeIcon,
	EllipsisIcon,
	LightbulbIcon,
	MailIcon,
	TrendingUpIcon,
} from "lucide-react";

import "streamdown/styles.css";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

const PROMPT_SUGGESTIONS = [
	{
		icon: CodeIcon,
		text: "Help me debug a React component",
		prompt: "Help me debug a React component",
	},
	{
		icon: MailIcon,
		text: "Write a professional email",
		prompt: "Write a professional email",
	},
	{
		icon: LightbulbIcon,
		text: "Explain how to optimize database queries",
		prompt: "Explain how to optimize database queries",
	},
	{
		icon: TrendingUpIcon,
		text: "Summarize the latest AI trends",
		prompt: "Summarize the latest AI trends",
	},
] as const;

export function AiChat() {
	const [input, setInput] = useState("");
	const messagesContainerRef = useRef<HTMLDivElement>(null);

	const { messages, status, sendMessage } = useChat({
		id: "local-chat",
		transport: {
			async sendMessages(options) {
				return eventIteratorToStream(
					await orpcClient.ai.stream(
						{
							messages: options.messages,
						},
						{ signal: options.abortSignal },
					),
				);
			},
			reconnectToStream() {
				throw new Error("Unsupported");
			},
		},
	});

	const handleSubmit = async (
		e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		e.preventDefault();

		const text = input.trim();
		if (!text) {
			return;
		}
		setInput("");

		try {
			await sendMessage({
				text,
			});
		} catch {
			toastError("Failed to send message");
			setInput(text);
		}
	};

	useEffect(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
		}
	}, [messages.length, status]);

	return (
		<div className="max-w-3xl mx-auto flex h-[calc(100vh-10rem)] flex-col">
			<div
				ref={messagesContainerRef}
				className="gap-4 py-8 flex flex-1 flex-col overflow-y-auto"
			>
				{messages.length === 0 && (
					<div className="gap-6 flex flex-1 flex-col items-center justify-center">
						<div className="gap-4 sm:grid-cols-2 grid w-full grid-cols-1">
							{PROMPT_SUGGESTIONS.map((suggestion, index) => {
								const Icon = suggestion.icon;
								return (
									<Button
										key={index}
										type="button"
										variant="outline"
										onClick={async () => {
											try {
												await sendMessage({
													text: suggestion.prompt,
												});
											} catch {
												toastError("Failed to send message");
											}
										}}
										disabled={status === "streaming"}
										className="group gap-2 p-4 h-auto rounded-2xl bg-card text-center"
									>
										<Icon className="size-6 text-primary" />
										<span className="text-sm text-foreground">
											{suggestion.text}
										</span>
									</Button>
								);
							})}
						</div>
					</div>
				)}

				{messages.map((message, index) => (
					<div
						key={index}
						className={cn(
							"gap-2 flex flex-col",
							message.role === "user" ? "items-end" : "items-start",
						)}
					>
						<div
							className={cn(
								"max-w-2xl gap-2 px-4 py-2 flex items-center rounded-lg text-foreground **:max-w-full",
								message.role === "user"
									? "bg-primary/10 whitespace-pre-wrap"
									: "prose prose-sm dark:prose-invert bg-muted",
							)}
						>
							{message.parts?.map((part, index) =>
								part.type === "text" ? (
									message.role === "user" ? (
										<span key={index}>{part.text}</span>
									) : (
										<Streamdown
											key={index}
											animated
											isAnimating={
												status === "streaming" &&
												message.parts != null &&
												index === message.parts.length - 1
											}
											className="wrap-break-words"
										>
											{part.text}
										</Streamdown>
									)
								) : null,
							)}
						</div>
					</div>
				))}

				{(status === "streaming" || status === "submitted") && (
					<div className="flex justify-start">
						<div className="max-w-2xl gap-2 px-4 py-2 flex items-center rounded-lg bg-secondary/10 text-foreground">
							<EllipsisIcon className="size-6 animate-pulse" />
						</div>
					</div>
				)}
			</div>

			<form
				onSubmit={handleSubmit}
				className="text-lg relative shrink-0 rounded-2xl bg-card focus-within:ring focus-within:ring-primary focus-within:outline-none"
			>
				<Textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Chat with your AI..."
					className="min-h-8 p-6 pr-14 rounded-2xl border bg-card shadow-none focus:outline-hidden focus-visible:ring-0"
					onKeyDown={async (e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							await handleSubmit(e);
						}
					}}
				/>

				<Button
					type="submit"
					size="icon"
					variant="primary"
					className="right-3 bottom-3 absolute"
					disabled={!input.trim() || status === "streaming"}
				>
					<ArrowUpIcon className="size-4" />
				</Button>
			</form>
		</div>
	);
}
