"use client";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { authClient } from "@repo/auth/client";
import { Progress } from "@repo/ui/components/progress";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { withQuery } from "ufo";

import { OnboardingAccountStep } from "./OnboardingAccountStep";
import { OnboardingAddDocumentsStep } from "./OnboardingAddDocumentsStep";
import { OnboardingApiKeyStep } from "./OnboardingApiKeyStep";
import { OnboardingCreateIndexStep } from "./OnboardingCreateIndexStep";
import { OnboardingInstallWidgetStep } from "./OnboardingInstallWidgetStep";

export function OnboardingForm() {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [indexSlug, setIndexSlug] = useState("");
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id;
	const recordEventMutation = useMutation(orpc.onboarding.recordEvent.mutationOptions());

	const stepSearchParam = searchParams.get("step");
	const redirectTo = searchParams.get("redirectTo");
	const onboardingStep = stepSearchParam ? Number.parseInt(stepSearchParam, 10) : 1;

	const setStep = (step: number) => {
		router.replace(
			withQuery(window.location.search ?? "", {
				step,
			}),
		);
	};

	const onCompleted = async () => {
		await authClient.updateUser({
			onboardingComplete: true,
		});

		await clearCache();
		router.replace(redirectTo ?? "/");
	};

	const recordEvent = (eventType: string) => {
		if (!organizationId) return;
		recordEventMutation.mutate({
			organizationId,
			eventType,
		});
	};

	const steps = useMemo(
		() => {
			const allSteps: { component: React.ReactNode }[] = [
				{
					component: <OnboardingAccountStep onCompleted={() => setStep(2)} />,
				},
				{
					component: (
						<OnboardingCreateIndexStep
							onCompleted={(slug) => {
								setIndexSlug(slug);
								setStep(3);
							}}
						/>
					),
				},
				{
					component: (
						<OnboardingAddDocumentsStep
							indexSlug={indexSlug}
							onCompleted={() => {
								recordEvent("FIRST_DOCUMENT");
								setStep(4);
							}}
						/>
					),
				},
				{
					component: (
						<OnboardingInstallWidgetStep
							indexSlug={indexSlug}
							onCompleted={() => {
								recordEvent("WIDGET_EMBEDDED");
								setStep(5);
							}}
						/>
					),
				},
				{
					component: (
						<OnboardingApiKeyStep indexSlug={indexSlug} onCompleted={() => onCompleted()} />
					),
				},
			];
			return allSteps;
		},
		[indexSlug], // oxlint-disable-line eslint-plugin-react-hooks/exhaustive-deps
	);

	const stepTitle = (() => {
		switch (onboardingStep) {
			case 2:
				return t("onboarding.createIndex.title");
			case 3:
				return t("onboarding.addDocuments.title");
			case 4:
				return t("onboarding.installWidget.title");
			case 5:
				return t("onboarding.apiKey.title");
			default:
				return t("onboarding.title");
		}
	})();

	const stepDescription = (() => {
		switch (onboardingStep) {
			case 2:
				return t("onboarding.createIndex.description");
			case 3:
				return t("onboarding.addDocuments.description");
			case 4:
				return t("onboarding.installWidget.description");
			case 5:
				return t("onboarding.apiKey.description");
			default:
				return t("onboarding.message");
		}
	})();

	return (
		<div>
			<h1 className="font-bold text-xl md:text-2xl">{stepTitle}</h1>
			<p className="mt-2 mb-6 text-foreground/60">{stepDescription}</p>

			{steps.length > 1 && (
				<div className="mb-6 gap-3 flex items-center">
					<Progress value={(onboardingStep / steps.length) * 100} className="h-2" />
					<span className="text-xs shrink-0 text-foreground/60">
						{t("onboarding.step", {
							step: onboardingStep,
							total: steps.length,
						})}
					</span>
				</div>
			)}

			{steps[onboardingStep - 1]?.component}
		</div>
	);
}
