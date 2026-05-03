"use client";

import { Button } from "@repo/ui/components/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const CSAT_STORAGE_KEY = "aac_csat_last_shown";
const CSAT_COOLDOWN_DAYS = 90;

const SCORE_EMOJIS: Record<number, string> = {
	1: "😡",
	2: "😟",
	3: "😐",
	4: "🙂",
	5: "😍",
};

const SCORE_LABELS: Record<number, keyof IntlMessages["feedback"]["csat"]> = {
	1: "veryDissatisfied",
	2: "dissatisfied",
	3: "neutral",
	4: "satisfied",
	5: "verySatisfied",
};

export function CsatBanner({ onDismiss }: { onDismiss?: () => void }) {
	const t = useTranslations("feedback.csat");
	const [visible, setVisible] = useState(false);
	const [selectedScore, setSelectedScore] = useState<number | null>(null);
	const [submitted, setSubmitted] = useState(false);

	const submitMutation = useMutation(
		orpc.feedback.submitCsat.mutationOptions({
			onSuccess: () => {
				setSubmitted(true);
				localStorage.setItem(CSAT_STORAGE_KEY, Date.now().toString());
			},
		}),
	);

	useEffect(() => {
		const lastShown = localStorage.getItem(CSAT_STORAGE_KEY);
		if (lastShown) {
			const elapsed = Date.now() - Number(lastShown);
			const cooldownMs = CSAT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
			if (elapsed < cooldownMs) return;
		}
		// Stagger display: show after a short delay on page load
		const timer = setTimeout(() => setVisible(true), 2000);
		return () => clearTimeout(timer);
	}, []);

	const handleSubmit = () => {
		if (selectedScore === null) return;
		submitMutation.mutate({ score: selectedScore });
	};

	const handleSkip = () => {
		setVisible(false);
		onDismiss?.();
	};

	if (!visible) return null;

	return (
		<div className="right-4 bottom-4 max-w-sm animate-in fade-in slide-in-from-bottom-4 fixed z-50 duration-300">
			<div className="p-4 shadow-xl rounded-2xl border bg-card text-card-foreground">
				{submitted ? (
					<div className="gap-3 flex items-center">
						<span className="text-2xl">🎉</span>
						<p className="text-sm font-medium">{t("thankYou")}</p>
					</div>
				) : (
					<>
						<p className="mb-3 text-sm font-medium leading-normal">{t("question")}</p>
						<div className="gap-1 mb-4 flex justify-center">
							{[1, 2, 3, 4, 5].map((score) => (
								<button
									key={score}
									type="button"
									onClick={() => setSelectedScore(score)}
									className={`gap-0.5 px-2 py-1.5 text-xs flex flex-col items-center rounded-lg transition-colors ${
										selectedScore === score
											? "bg-primary/10 ring-1 ring-primary/30"
											: "hover:bg-muted"
									}`}
								>
									<span className="text-xl">{SCORE_EMOJIS[score]}</span>
									<span className="text-[10px] whitespace-nowrap text-muted-foreground">
										{t(SCORE_LABELS[score])}
									</span>
								</button>
							))}
						</div>
						<div className="gap-2 flex justify-end">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleSkip}
								disabled={submitMutation.isPending}
							>
								{t("skip")}
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={handleSubmit}
								disabled={selectedScore === null || submitMutation.isPending}
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
