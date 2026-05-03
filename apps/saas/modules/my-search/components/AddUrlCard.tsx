"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlobeIcon, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface AddUrlCardProps {
	organizationId: string;
	indexId: string;
}

export function AddUrlCard({ organizationId, indexId }: AddUrlCardProps) {
	const t = useTranslations("mySearch");
	const queryClient = useQueryClient();
	const [url, setUrl] = useState("");
	const [urlError, setUrlError] = useState<string | null>(null);

	const validateUrl = (value: string): boolean => {
		try {
			const parsed = new URL(value);
			if (!["http:", "https:"].includes(parsed.protocol)) {
				setUrlError(t("urlInvalidProtocol"));
				return false;
			}
			setUrlError(null);
			return true;
		} catch {
			setUrlError(t("urlInvalid"));
			return false;
		}
	};

	const addUrlMutation = useMutation(
		orpc.mySearch.addUrl.mutationOptions({
			onSuccess: () => {
				toast.success(t("addUrlCard.success"));
				setUrl("");
				setUrlError(null);
				void queryClient.invalidateQueries({
					queryKey: orpc.mySearch.listFiles.queryKey({
						input: { organizationId, indexId },
					}),
				});
			},
			onError: (err) => {
				toast.error(err.message || t("addUrlCard.error"));
			},
		}),
	);

	const handleSubmit = () => {
		const trimmed = url.trim();
		if (!trimmed) return;
		if (!validateUrl(trimmed)) return;
		addUrlMutation.mutate({ organizationId, indexId, url: trimmed });
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base gap-2 flex items-center">
					<GlobeIcon className="h-4 w-4 text-muted-foreground" />
					{t("addUrlCard.title")}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{t("addUrlCard.description")}</p>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="gap-2 flex items-center">
					<div className="relative flex-1">
						<LinkIcon className="left-3 h-4 w-4 pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="url"
							placeholder={t("urlPlaceholder")}
							value={url}
							onChange={(e) => {
								setUrl(e.target.value);
								if (urlError) setUrlError(null);
							}}
							onBlur={() => url.trim() && validateUrl(url.trim())}
							onKeyDown={handleKeyDown}
							disabled={addUrlMutation.isPending}
							className="pl-9"
						/>
					</div>
					<Button
						onClick={handleSubmit}
						disabled={!url.trim() || addUrlMutation.isPending}
						loading={addUrlMutation.isPending}
					>
						<GlobeIcon className="mr-2 h-4 w-4" />
						{t("addUrl")}
					</Button>
				</div>
				{urlError && <p className="text-xs text-destructive">{urlError}</p>}
			</CardContent>
		</Card>
	);
}
