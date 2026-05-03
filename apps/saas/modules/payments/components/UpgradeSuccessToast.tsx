"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Client component that shows a success toast when returning from Stripe Checkout
 * after a successful plan upgrade.
 *
 * Must be rendered inside Suspense boundaries (useSearchParams requirement).
 */
export function UpgradeSuccessToast() {
	const t = useTranslations("settings.billing");
	const searchParams = useSearchParams();
	const hasShown = useRef(false);

	useEffect(() => {
		if (hasShown.current) return;
		const upgradeSuccess = searchParams.get("upgrade_success");
		if (upgradeSuccess === "true") {
			hasShown.current = true;
			toast.success(t("upgradeSuccess"));

			// Clean up the URL param without full page reload
			const url = new URL(window.location.href);
			url.searchParams.delete("upgrade_success");
			window.history.replaceState({}, "", url.toString());
		}
	}, [searchParams, t]);

	return null;
}
