"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { CopyIcon, Share2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface ShareIndexDialogProps {
	indexId: string;
	orgId: string;
	slug: string;
	children?: React.ReactNode;
}

/**
 * Dialog to generate a shareable link for a personal search index.
 * Calls POST /api/share/generate to create an HMAC-signed token.
 * No DB model needed — anyone with the link can view without auth.
 */
export function ShareIndexDialog({ indexId, orgId, slug, children }: ShareIndexDialogProps) {
	const [open, setOpen] = useState(false);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);
	const [copied, setCopied] = useState(false);

	const generateShareLink = useCallback(async () => {
		setGenerating(true);
		try {
			const baseUrl = process.env.NEXT_PUBLIC_SAAS_URL || "http://localhost:3000";
			const res = await fetch(`${baseUrl}/api/share/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ indexId, orgId, slug }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? "Failed to generate share link");
			}

			const data: { token: string } = await res.json();
			setShareUrl(`${baseUrl}/share/${data.token}`);
		} catch (err) {
			toastError(err instanceof Error ? err.message : "Could not generate share link");
		} finally {
			setGenerating(false);
		}
	}, [indexId, orgId, slug]);

	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			setOpen(newOpen);
			if (newOpen) {
				void generateShareLink();
			} else {
				setShareUrl(null);
				setCopied(false);
			}
		},
		[generateShareLink],
	);

	const handleCopy = useCallback(async () => {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			toastSuccess("Link copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toastSuccess("Link copied to clipboard!");
		}
	}, [shareUrl]);

	const trigger = useMemo(
		() =>
			children ?? (
				<Button variant="outline" size="sm">
					<Share2Icon className="mr-2 size-4" />
					Share
				</Button>
			),
		[children],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Share Search Index</DialogTitle>
					<DialogDescription>
						Anyone with this link can view your search index. The link expires in 30 days.
					</DialogDescription>
				</DialogHeader>

				{generating && !shareUrl && (
					<div className="py-8 text-sm text-center text-muted-foreground">
						Generating share link...
					</div>
				)}

				{shareUrl && (
					<div className="gap-2 flex items-center">
						<Input value={shareUrl} readOnly className="font-mono text-sm flex-1" />
						<Button variant="secondary" size="icon" onClick={handleCopy} title="Copy link">
							<CopyIcon className="size-4" />
						</Button>
					</div>
				)}

				<DialogFooter className="text-xs text-muted-foreground">
					{copied ? "Copied!" : "You can regenerate the link by reopening this dialog."}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
