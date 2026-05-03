"use client";

import { Button } from "@repo/ui/components/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const NPS_STORAGE_KEY = "aac_nps_last_shown";
const NPS_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
const SCORE_BUTTONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DETRACTOR_MAX = 6;
const PASSIVE_MAX = 8;

type ScoreBracket = "detractor" | "passive" | "promoter";

function getScoreBracket(score: number): ScoreBracket {
	if (score <= DETRACTOR_MAX) return "detractor";
	if (score <= PASSIVE_MAX) return "passive";
	return "promoter";
}

export function NpsModal() {
	const t = useTranslations("feedback.nps");
	const [visible, setVisible] = useState(false);
	const [selectedScore, setSelectedScore] = useState<number | null>(null);
	const [feedback, setFeedback] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const submitMutation = useMutation(
		orpc.feedback.submitNps.mutationOptions({
			onSuccess: () => {
				setSubmitted(true);
				localStorage.setItem(NPS_STORAGE_KEY, Date.now().toString());
			},
		}),
	);

	useEffect(() => {
		const lastShown = localStorage.getItem(NPS_STORAGE_KEY);
		if (lastShown) {
			const elapsed = Date.now() - Number(lastShown);
			if (elapsed < NPS_COOLDOWN_MS) return;
		}
		// Stagger display: show after a short delay on page load
		const timer = setTimeout(() => setVisible(true), 2000);
		return () => clearTimeout(timer);
	}, []);

	const handleSubmit = useCallback(() => {
		if (selectedScore === null) return;
		submitMutation.mutate({
			score: selectedScore,
			feedback: feedback || undefined,
		});
	}, [selectedScore, feedback, submitMutation]);

	const handleDismiss = useCallback(() => {
		setVisible(false);
		localStorage.setItem(NPS_STORAGE_KEY, Date.now().toString());
	}, []);

	if (!visible) return null;

	const bracket = selectedScore !== null ? getScoreBracket(selectedScore) : null;
	const followUpKey =
		bracket === "detractor"
			? "detractorFollowUp"
			: bracket === "passive"
				? "passiveFollowUp"
				: "promoterFollowUp";

	return (
		<div className="right-4 bottom-4 max-w-sm animate-in fade-in slide-in-from-bottom-4 fixed z-50 duration-300">
			<div className="p-5 shadow-xl rounded-2xl border bg-card text-card-foreground">
				{submitted ? (
					<div className="gap-3 flex flex-col items-center text-center">
						<span className="text-3xl">💜</span>
						<p className="font-semibold text-sm">{t("thanks")}</p>
						<p className="text-xs text-muted-foreground">{t("thanksDescription")}</p>
					</div>
				) : (
					<>
						<p className="mb-1 text-sm font-semibold leading-normal">{t("title")}</p>
						<p className="mb-4 text-xs leading-normal text-muted-foreground">
							{t("question")}
						</p>

						{/* Score buttons: 0-10 */}
						<div className="gap-1 mb-3 flex justify-between">
							{SCORE_BUTTONS.map((score) => (
								<button
									key={score}
									type="button"
									onClick={() => setSelectedScore(score)}
									className={`size-8 text-xs font-medium rounded-lg transition-colors ${
										selectedScore === score
											? "bg-primary text-primary-foreground"
											: "border border-border hover:bg-muted"
									}`}
								>
									{score}
								</button>
							))}
						</div>

						{/* Scale labels */}
						<div className="mb-4 flex justify-between text-[10px] text-muted-foreground">
							<span>{t("scaleStart")}</span>
							<span>{t("scaleEnd")}</span>
						</div>

						{/* Follow-up textarea */}
						{selectedScore !== null && (
							<div className="mb-4">
								<p className="mb-1.5 text-xs font-medium">{t(followUpKey)}</p>
								<textarea
									value={feedback}
									onChange={(e) => setFeedback(e.target.value)}
									placeholder={t("feedbackPlaceholder")}
									rows={3}
									maxLength={2000}
									className="p-2 text-xs w-full resize-none rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
								/>
							</div>
						)}

						<div className="gap-2 flex justify-end">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleDismiss}
								disabled={submitMutation.isPending}
							>
								{t("dismiss")}
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={handleSubmit}
								disabled={selectedScore === null || submitMutation.isPending}
								loading={submitMutation.isPending}
							>
								{t("submit")}
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
