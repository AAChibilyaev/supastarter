"use client";

import {
	ChatBubble,
	ChatBubbleAvatar,
	ChatBubbleMessage,
} from "@repo/ui/components/chat/chat-bubble";
import { ChatMessageList } from "@repo/ui/components/chat/chat-message-list";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Separator } from "@repo/ui/components/separator";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import {
	MessageSquareIcon,
	CalendarIcon,
	ChevronRightIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
	organizationId: string;
}

function formatDate(d: Date | string | undefined | null) {
	if (!d) return "";
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleString("ru", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AssistantHistoryPanel({ organizationId }: Props) {
	const t = useTranslations("search.assistant");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { data, isLoading } = useQuery(
		orpc.assistant.getHistory.queryOptions({
			input: { organizationId, limit: 50 },
		}),
	);

	const { data: selectedData, isLoading: selectedLoading } = useQuery({
		...orpc.assistant.getHistory.queryOptions({
			input: { organizationId, conversationId: selectedId ?? "", limit: 100 },
		}),
		enabled: !!selectedId,
	});

	const conversations = data?.conversations ?? [];
	const selectedConversation = selectedData?.conversations?.[0] ?? null;

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[...Array(5)].map((_, i) => (
					<Skeleton key={i} className="h-20 rounded-lg" />
				))}
			</div>
		);
	}

	if (conversations.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-16 text-center">
					<MessageSquareIcon className="mb-4 size-12 text-muted-foreground/30" />
					<p className="font-medium">{t("history.empty")}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<MessageSquareIcon className="size-4" />
						{t("history.title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<ScrollArea className="h-[600px]">
						{conversations.map((conv, idx) => {
							const msgs = (conv as unknown as { messages?: { role: string; content: string }[] }).messages ?? [];
							const firstMsg = msgs.find((m) => m.role === "user");
							const preview = (firstMsg?.content ?? "—").slice(0, 80);

							return (
								<div key={conv.id}>
									{idx > 0 && <Separator />}
									<button
										type="button"
										className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
										onClick={() => setSelectedId(conv.id)}
									>
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center gap-2">
												<Badge variant="secondary" className="text-xs capitalize">
													{conv.status}
												</Badge>
												<span className="text-xs capitalize text-muted-foreground">
													{conv.mode?.replace(/_/g, " ")}
												</span>
											</div>
											<p className="truncate text-sm">{preview}</p>
											<div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
												<span className="flex items-center gap-1">
													<CalendarIcon className="size-3" />
													{formatDate(conv.startedAt)}
												</span>
												<span>
													{conv.messageCount} {t("history.messages")}
												</span>
											</div>
										</div>
										<ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
									</button>
								</div>
							);
						})}
					</ScrollArea>
				</CardContent>
			</Card>

			<Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
				<SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
					<SheetHeader className="border-b pb-3">
						<SheetTitle className="flex items-center gap-2 text-sm">
							<MessageSquareIcon className="size-4" />
							{t("history.title")}
						</SheetTitle>
					</SheetHeader>

					<div className="flex flex-1 flex-col overflow-hidden">
						{selectedLoading ? (
							<div className="space-y-3 p-4">
								{[...Array(4)].map((_, i) => (
									<Skeleton key={i} className="h-12 rounded-lg" />
								))}
							</div>
						) : selectedConversation ? (
							<ChatMessageList smooth className="flex-1">
								{(
									(selectedConversation as unknown as {
										messages?: { role: string; content: string }[];
									}).messages ?? []
								)
									.filter((m) => m.role === "user" || m.role === "assistant")
									.map((message, idx) => {
										const isUser = message.role === "user";
										return (
											<ChatBubble key={idx} variant={isUser ? "sent" : "received"}>
												<ChatBubbleAvatar
													fallback={isUser ? "U" : "AI"}
													className="size-7"
												/>
												<ChatBubbleMessage variant={isUser ? "sent" : "received"}>
													<span className="whitespace-pre-wrap text-sm">
														{message.content}
													</span>
												</ChatBubbleMessage>
											</ChatBubble>
										);
									})}
							</ChatMessageList>
						) : null}

						<div className="border-t p-3">
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => setSelectedId(null)}
							>
								{t("history.view")}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
