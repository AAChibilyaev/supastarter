"use client";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { useRouter } from "@shared/hooks/router";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Client component that shows a success alert when returning from Stripe Checkout
 * after a successful plan upgrade and redirects to the dashboard after 3 seconds.
 *
 * Must be rendered inside Suspense boundaries (useSearchParams requirement).
 */
export function UpgradeSuccessToast() {
	const t = useTranslations("settings.billing");
	const router = useRouter();
	const searchParams = useSearchParams();
	const [visible, setVisible] = useState(false);
	const [countdown, setCountdown] = useState(3);
	const hasShown = useRef(false);

	const upgradeSuccess = searchParams.get("upgrade_success") === "true";
	const planName = searchParams.get("plan");

	useEffect(() => {
		if (!upgradeSuccess || hasShown.current) return;
		hasShown.current = true;
		setVisible(true);

		// Start countdown and redirect
		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer);

					// Clean up the URL param without full page reload
					const url = new URL(window.location.href);
					url.searchParams.delete("upgrade_success");
					url.searchParams.delete("plan");
					window.history.replaceState({}, "", url.toString());

					router.push("/");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [upgradeSuccess, router]);

	if (!visible || !upgradeSuccess) return null;

	return (
		<Alert className="mb-6 border-border bg-muted">
			<AlertTitle className="text-lg font-semibold text-muted-foreground">
				{t("upgradeSuccessTitle")}
			</AlertTitle>
			<AlertDescription className="text-muted-foreground">
				{planName ? t("upgradeSuccessWithPlan", { plan: planName }) : t("upgradeSuccess")}
				<span className="ml-2 text-sm text-muted-foreground">
					{t("redirectingIn", { seconds: countdown })}
				</span>
			</AlertDescription>
		</Alert>
	);
}
