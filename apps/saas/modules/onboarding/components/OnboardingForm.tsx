"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { authClient } from "@repo/auth/client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Progress } from "@repo/ui/components/progress";
import { cn } from "@repo/ui/lib";
import { useRouter } from "@shared/hooks/router";
import { clearCache } from "@shared/lib/cache";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { withQuery } from "ufo";

import { OnboardingAccountStep } from "./OnboardingAccountStep";
import { OnboardingAddDocumentsStep } from "./OnboardingAddDocumentsStep";
import { OnboardingApiKeyStep } from "./OnboardingApiKeyStep";
import { OnboardingCreateIndexStep } from "./OnboardingCreateIndexStep";
import { OnboardingInstallWidgetStep } from "./OnboardingInstallWidgetStep";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface StepDef {
	id: number;
	labelKey: string;
	component: React.ReactNode;
	canSkip: boolean;
}

// ---------------------------------------------------------------------------
// Step indicator sub-component
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
	const t = useTranslations("onboarding");

	const stepLabels = [
		{ step: 1, label: t("stepLabel_one") },
		{ step: 2, label: t("stepLabel_two") },
		{ step: 3, label: t("stepLabel_three") },
		{ step: 4, label: t("stepLabel_four") },
		{ step: 5, label: t("stepLabel_five") },
	];

	return (
		<nav aria-label={t("step", { step: currentStep, total: 5 })} className="mb-8">
			<ol className="gap-0 flex items-center justify-between">
				{stepLabels.map((item, index) => {
					const isCompleted = item.step < currentStep;
					const isCurrent = item.step === currentStep;
					const isUpcoming = item.step > currentStep;

					return (
						<li key={item.step} className="gap-2 flex flex-1 flex-col items-center">
							{/* Dot row */}
							<div className="gap-0 flex w-full items-center">
								{/* Connector line before this step */}
								{index > 0 && (
									<div
										className={cn(
											"h-0.5 flex-1",
											isCompleted ? "bg-primary" : "bg-border",
										)}
									/>
								)}

								{/* Step dot */}
								<div
									className={cn(
										"size-8 text-xs font-semibold flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
										isCurrent &&
											"border-primary bg-primary text-primary-foreground",
										isCompleted &&
											"border-emerald-500 bg-emerald-500 text-white",
										isUpcoming && "border-border text-muted-foreground",
									)}
								>
									{isCompleted ? (
										<CheckIcon className="size-3.5" />
									) : (
										<span>{item.step}</span>
									)}
								</div>

								{/* Connector line after this step */}
								{index < stepLabels.length - 1 && (
									<div
										className={cn(
											"h-0.5 flex-1",
											isCompleted ? "bg-primary" : "bg-border",
										)}
									/>
								)}
							</div>

							{/* Label below dot */}
							<span
								className={cn(
									"mt-1.5 sm:block text-xs font-medium hidden text-center",
									isCurrent && "text-foreground",
									isCompleted && "text-emerald-600",
									isUpcoming && "text-muted-foreground",
								)}
							>
								{item.label}
							</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function OnboardingForm() {
	const t = useTranslations();
	const tOnboarding = useTranslations("onboarding");
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

	const handleSkip = (targetStep: number) => {
		if (targetStep > 5) {
			onCompleted();
		} else {
			setStep(targetStep);
		}
	};

	const steps = useMemo<StepDef[]>(
		() => [
			{
				id: 1,
				labelKey: "onboarding.title",
				canSkip: false,
				component: <OnboardingAccountStep onCompleted={() => setStep(2)} />,
			},
			{
				id: 2,
				labelKey: "onboarding.createIndex.title",
				canSkip: true,
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
				id: 3,
				labelKey: "onboarding.addDocuments.title",
				canSkip: true,
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
				id: 4,
				labelKey: "onboarding.installWidget.title",
				canSkip: true,
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
				id: 5,
				labelKey: "onboarding.apiKey.title",
				canSkip: true,
				component: (
					<OnboardingApiKeyStep indexSlug={indexSlug} onCompleted={() => onCompleted()} />
				),
			},
		],
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

	const currentStep = steps[onboardingStep - 1];

	return (
		<div>
			{/* Step indicator */}
			<StepIndicator currentStep={onboardingStep} />

			{/* Step title and description */}
			<h1 className="font-bold text-xl md:text-2xl">{stepTitle}</h1>
			<p className="mt-2 mb-6 text-foreground/60">{stepDescription}</p>

			{/* Progress bar */}
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

			{/* Current step content with transition */}
			<div className="min-h-[280px]">
				<div
					key={onboardingStep}
					className="animate-in fade-in slide-in-from-right-2 duration-300"
				>
					{currentStep?.component}
				</div>
			</div>

			{/* Skip button for skippable steps */}
			{currentStep?.canSkip && onboardingStep < steps.length && (
				<div className="mt-6 pt-4 flex justify-center border-t">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<button
								type="button"
								className="text-sm cursor-pointer text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
							>
								{tOnboarding("skipConfirmTitle")}
							</button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{tOnboarding("skipConfirmTitle")}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{tOnboarding("skipConfirmDescription")}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>
									{tOnboarding("skipConfirmCancel")}
								</AlertDialogCancel>
								<AlertDialogAction onClick={() => handleSkip(onboardingStep + 1)}>
									{tOnboarding("skipConfirmAction")}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			)}
		</div>
	);
}
