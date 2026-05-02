"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { toastError } from "@repo/ui/components/toast";
import { useCreateSearchApiKeyMutation } from "@search/lib/api";
import { CheckIcon, CopyIcon, KeyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
	indexSlug: string;
	onCompleted: () => void;
}

export function OnboardingApiKeyStep({ indexSlug, onCompleted }: Props) {
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const createKey = useCreateSearchApiKeyMutation();
	const [rawKey, setRawKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const handleCreate = async () => {
		if (!activeOrganization) return;
		try {
			const result = await createKey.mutateAsync({
				organizationId: activeOrganization.id,
				slug: indexSlug,
				name: t("onboarding.apiKey.keyName"),
				scopes: ["search"],
			});
			setRawKey(result.rawKey);
		} catch {
			toastError(t("onboarding.apiKey.error"));
		}
	};

	const handleCopy = () => {
		if (!rawKey) return;
		navigator.clipboard.writeText(rawKey).then(
			() => {
				setCopied(true);
				toast.success(t("onboarding.apiKey.copied"));
				setTimeout(() => setCopied(false), 2000);
			},
			() => toast.error("Failed to copy"),
		);
	};

	return (
		<div className="gap-6 flex flex-col">
			{!rawKey ? (
				<Button onClick={handleCreate} loading={createKey.isPending}>
					<KeyIcon className="mr-2 size-4" />
					{t("onboarding.apiKey.createButton")}
				</Button>
			) : (
				<>
					<div className="gap-2 flex flex-col">
						<Label>{t("onboarding.apiKey.keyLabel")}</Label>
						<div className="gap-2 flex">
							<Input readOnly value={rawKey} className="font-mono text-sm" />
							<Button
								variant="outline"
								size="icon"
								onClick={handleCopy}
								title={t("onboarding.apiKey.copyButton")}
							>
								{copied ? (
									<CheckIcon className="size-4 text-green-500" />
								) : (
									<CopyIcon className="size-4" />
								)}
							</Button>
						</div>
					</div>

					<Button onClick={onCompleted}>{t("onboarding.apiKey.finish")}</Button>
				</>
			)}
		</div>
	);
}
