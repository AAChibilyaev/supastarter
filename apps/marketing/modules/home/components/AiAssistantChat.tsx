"use client";

import { Button } from "@repo/ui/components/button";
import {
	ChatBubble,
	ChatBubbleMessage,
} from "@repo/ui/components/chat/chat-bubble";
import { ChatInput } from "@repo/ui/components/chat/chat-input";
import { cn } from "@repo/ui/lib";
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
import { useTranslations } from "next-intl";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

interface AiAssistantChatProps {
	visible: boolean;
	onModeSelect: (mode: SearchMode) => void;
}

const MODES: { key: SearchMode; icon: typeof KeyboardIcon }[] = [
	{ key: "text", icon: KeyboardIcon },
	{ key: "voice", icon: MicIcon },
	{ key: "photo", icon: CameraIcon },
	{ key: "image", icon: ImageIcon },
	{ key: "chat", icon: MessageSquareIcon },
];

const MODE_ACTIVE_COLORS: Record<SearchMode, string> = {
	text: "text-foreground",
	voice: "text-cyan-400",
	photo: "text-purple-400",
	image: "text-amber-400",
	chat: "text-green-400",
};

const EXAMPLE_PROMPTS = [
	"Search products by image",
	"Find documents with voice",
	"Ask about billing changes",
	"Search my knowledge base",
	"Compare products visually",
];

const WELCOME_MESSAGE =
	"I'm your AI search assistant. I can help you find anything across your data — by text, voice, images, or photos. Ask me anything or pick a search mode above.";

export function AiAssistantChat({ visible, onModeSelect }: AiAssistantChatProps) {
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [activeMode, setActiveMode] = useState<SearchMode>("text");
	const [isHovered, setIsHovered] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open && inputRef.current) {
			setTimeout(() => inputRef.current?.focus(), 300);
		}
	}, [open]);

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!input.trim()) return;
		onModeSelect(activeMode);
		setInput("");
	};

	const handleModeClick = (mode: SearchMode) => {
		setActiveMode(mode);
		onModeSelect(mode);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

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
			{/* Chat panel */}
			<div
				className={cn(
					"absolute bottom-[calc(100%+12px)] right-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 ease-out origin-bottom-right",
					open
						? "pointer-events-auto visible scale-100 opacity-100"
						: "pointer-events-none invisible scale-95 opacity-0",
					"h-[480px] w-[calc(100vw-32px)] sm:h-[520px] sm:w-[400px]",
				)}
			>
				{/* Header */}
				<div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
					<div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
						<SparklesIcon className="size-3.5 text-primary" />
						<span className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.06]" />
					</div>
					<span className="text-sm font-light text-foreground">AI Assistant</span>

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

				{/* Body */}
				<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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

					<div className="flex flex-wrap gap-2 pt-2">
						{EXAMPLE_PROMPTS.map((prompt) => (
							<button
								key={prompt}
								type="button"
								onClick={() => {
									setInput(prompt);
									setTimeout(() => inputRef.current?.focus(), 50);
								}}
								className="inline-flex cursor-pointer items-center rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-light text-muted-foreground/70 transition-all hover:border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground"
							>
								<SearchIcon className="mr-1.5 size-3" />
								{prompt}
							</button>
						))}
					</div>
				</div>

				{/* Footer */}
				<div className="shrink-0 border-t border-border p-3">
					<form onSubmit={handleSubmit} className="flex items-end gap-2">
						<ChatInput
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask me anything..."
							className="min-h-10 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm font-light placeholder:text-muted-foreground/50 focus:border-muted-foreground/30 focus:outline-none"
						/>
						<Button
							type="submit"
							size="icon"
							variant="primary"
							disabled={!input.trim()}
							className="flex size-10 shrink-0 items-center justify-center rounded-lg"
						>
							<ArrowRightIcon className="size-4" />
						</Button>
					</form>
				</div>
			</div>

			{/* Toggle pill button */}
			<button
				type="button"
				onClick={() => setOpen(!open)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
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
