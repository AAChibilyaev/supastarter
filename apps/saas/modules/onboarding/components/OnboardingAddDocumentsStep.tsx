"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
	indexSlug: string;
	onCompleted: () => void;
}

export function OnboardingAddDocumentsStep({ indexSlug, onCompleted }: Props) {
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const [raw, setRaw] = useState("");

	const importMutation = useMutation(orpc.search.importDocuments.mutationOptions());

	const handleImport = async () => {
		if (!activeOrganization) return;

		let parsed: Record<string, unknown>[];
		try {
			const value = JSON.parse(raw);
			if (!Array.isArray(value) || value.length === 0) {
				throw new Error("not array");
			}
			parsed = value as Record<string, unknown>[];
		} catch {
			toastError(t("onboarding.addDocuments.parseError"));
			return;
		}

		try {
			await importMutation.mutateAsync({
				organizationId: activeOrganization.id,
				slug: indexSlug,
				documents: parsed,
			});
			toastSuccess(t("onboarding.addDocuments.success"));
			onCompleted();
		} catch {
			toastError(t("onboarding.addDocuments.error"));
		}
	};

	return (
		<div className="gap-6 flex flex-col">
			<div className="gap-2 flex flex-col">
				<Label htmlFor="documents-input">{t("onboarding.addDocuments.pasteLabel")}</Label>
				<Textarea
					id="documents-input"
					value={raw}
					onChange={(e) => setRaw(e.target.value)}
					placeholder={t("onboarding.addDocuments.placeholder")}
					rows={8}
					spellCheck={false}
					className="font-mono text-sm resize-y bg-muted"
				/>
			</div>

			<div className="gap-3 flex">
				<Button
					onClick={handleImport}
					loading={importMutation.isPending}
					disabled={!raw.trim()}
				>
					{t("onboarding.addDocuments.importButton")}
					<ArrowRightIcon className="ml-2 size-4" />
				</Button>
				<Button variant="ghost" onClick={onCompleted}>
					{t("onboarding.addDocuments.skip")}
				</Button>
			</div>
		</div>
	);
}
