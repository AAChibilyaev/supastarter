"use client";

import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { ArrowRightIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface Props {
	indexSlug: string;
	onCompleted: () => void;
}

export function OnboardingInstallWidgetStep({ indexSlug, onCompleted }: Props) {
	const t = useTranslations();

	const baseUrl =
		typeof window !== "undefined"
			? window.location.origin
			: (process.env.NEXT_PUBLIC_SAAS_URL ?? "https://app.aacsearch.com");

	const snippet = `<script
  src="${baseUrl}/api/widget/widget.js"
  data-base-url="${baseUrl}"
  data-api-key="ss_search_YOUR_KEY"
  data-index-slug="${indexSlug}"
  data-container="#aac-search"
  data-theme="auto"
></script>
<div id="aac-search"></div>`;

	const handleCopy = () => {
		navigator.clipboard.writeText(snippet).then(
			() => toast.success(t("onboarding.installWidget.copied")),
			() => toast.error("Failed to copy"),
		);
	};

	return (
		<div className="gap-6 flex flex-col">
			<div className="gap-2 flex flex-col">
				<Label htmlFor="widget-snippet">{t("onboarding.installWidget.snippetLabel")}</Label>
				<Textarea
					id="widget-snippet"
					readOnly
					value={snippet}
					rows={9}
					spellCheck={false}
					className="font-mono text-sm resize-y bg-muted"
				/>
			</div>

			<div className="gap-3 flex">
				<Button variant="outline" onClick={handleCopy}>
					<CopyIcon className="mr-2 size-4" />
					{t("onboarding.installWidget.copyButton")}
				</Button>
				<Button onClick={onCompleted}>
					{t("onboarding.installWidget.next")}
					<ArrowRightIcon className="ml-2 size-4" />
				</Button>
				<Button variant="ghost" onClick={onCompleted}>
					{t("onboarding.installWidget.skip")}
				</Button>
			</div>
		</div>
	);
}
