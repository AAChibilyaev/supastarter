"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Textarea } from "@repo/ui/components/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface AIAskPanelProps {
	organizationId: string;
	indexId: string;
}

export function AIAskPanel({ organizationId, indexId }: AIAskPanelProps) {
	const t = useTranslations("mySearch.ask");
	const [question, setQuestion] = useState("");

	const askMutation = useMutation(orpc.mySearch.ask.mutationOptions({}));

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = question.trim();
		if (!trimmed) return;
		askMutation.mutate({ organizationId, id: indexId, question: trimmed });
	};

	const result = askMutation.data;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SparklesIcon className="h-4 w-4 text-primary" />
					{t("title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form onSubmit={handleSubmit} className="space-y-3">
					<Textarea
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder={t("placeholder")}
						rows={3}
						disabled={askMutation.isPending}
					/>
					<Button
						type="submit"
						disabled={!question.trim() || askMutation.isPending}
						loading={askMutation.isPending}
					>
						<SparklesIcon className="mr-2 h-4 w-4" />
						{t("submit")}
					</Button>
				</form>

				{askMutation.isError && (
					<p className="text-sm text-destructive">{t("noAnswer")}</p>
				)}

				{result && (
					<div className="space-y-4">
						{/* Answer */}
						<div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
							{result.answer}
						</div>

						{/* Sources */}
						{result.sources.length > 0 && (
							<div className="space-y-2">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
									{t("sources")}
								</p>
								<ul className="space-y-2">
									{result.sources.map((source, idx) => (
										<li
											key={source.chunkId}
											className="rounded-md border bg-background p-3 text-sm"
										>
											<p className="font-medium text-foreground">
												[{idx + 1}] {source.filename}
											</p>
											<p className="mt-1 text-muted-foreground line-clamp-3">
												{source.excerpt}
											</p>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
