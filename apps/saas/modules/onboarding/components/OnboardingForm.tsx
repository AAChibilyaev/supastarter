"use client";
import { authClient } from "@repo/auth/client";
import { Progress } from "@repo/ui/components/progress";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { withQuery } from "ufo";

import { OnboardingAccountStep } from "./OnboardingAccountStep";

export function OnboardingForm() {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();

	const stepSearchParam = searchParams.get("step");
	const redirectTo = searchParams.get("redirectTo");
	const onboardingStep = stepSearchParam ? Number.parseInt(stepSearchParam, 10) : 1;

	// oxlint-disable-next-line no-unused-vars -- used for redirecting to the next step
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

	const steps = useMemo(() => {
		const allSteps: { component: React.ReactNode }[] = [
			{
				component: <OnboardingAccountStep onCompleted={() => onCompleted()} />,
			},
		];

		return allSteps;
	}, []); // oxlint-disable-line eslint-plugin-react-hooks/exhaustive-deps

	return (
		<div>
			<h1 className="font-bold text-xl md:text-2xl">{t("onboarding.title")}</h1>
			<p className="mt-2 mb-6 text-foreground/60">{t("onboarding.message")}</p>

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

			{steps[onboardingStep - 1].component}
		</div>
	);
}
