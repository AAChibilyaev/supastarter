"use client";

import { Button } from "@repo/ui/components/button";
import { toastError } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { CreditCardIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

function BrandIcon({ brand }: { brand: string | null }) {
	const lower = (brand ?? "").toLowerCase();

	// Simple brand display: just show the brand name with an icon
	if (lower === "visa") {
		return (
			<span className="size-8 rounded bg-blue-600 font-bold text-white flex items-center justify-center text-[10px]">
				V
			</span>
		);
	}
	if (lower === "mastercard") {
		return (
			<span className="size-8 rounded bg-orange-500 font-bold text-white flex items-center justify-center text-[10px]">
				MC
			</span>
		);
	}
	if (lower === "amex" || lower === "american_express") {
		return (
			<span className="size-8 rounded bg-sky-600 font-bold text-white flex items-center justify-center text-[10px]">
				AE
			</span>
		);
	}
	if (lower === "discover") {
		return (
			<span className="size-8 rounded bg-orange-600 font-bold text-white flex items-center justify-center text-[10px]">
				D
			</span>
		);
	}

	// Fallback: generic card icon
	return <CreditCardIcon className="size-8 text-foreground/60" />;
}

export function PaymentMethodCard({ purchaseId }: { purchaseId: string }) {
	const t = useTranslations();

	const { data: methods = [], isLoading } = useQuery(
		orpc.payments.listPaymentMethods.queryOptions({
			input: { purchaseId },
		}),
	);

	const createCustomerPortalMutation = useMutation(
		orpc.payments.createCustomerPortalLink.mutationOptions(),
	);

	const handleManage = async () => {
		try {
			const { customerPortalLink } = await createCustomerPortalMutation.mutateAsync({
				purchaseId,
				redirectUrl: window.location.href,
			});
			window.location.href = customerPortalLink;
		} catch {
			toastError(t("settings.billing.createCustomerPortal.notifications.error.title"));
		}
	};

	if (isLoading) {
		return (
			<div className="p-6 text-sm rounded-lg border text-center text-foreground/60">
				{t("settings.billing.paymentMethod.loading")}
			</div>
		);
	}

	if (methods.length === 0) {
		return null;
	}

	const method = methods[0];

	return (
		<div className="p-4 rounded-lg border">
			<div className="flex items-center justify-between">
				<div className="gap-3 flex items-center">
					<BrandIcon brand={method.brand} />
					<div>
						<p className="font-medium text-sm">
							{method.brand ?? t("settings.billing.paymentMethod.card")}
						</p>
						<p className="text-xs text-foreground/60">
							{t("settings.billing.paymentMethod.maskedNumber", {
								last4: method.last4 ?? "••••",
							})}
							{method.expMonth && method.expYear && (
								<>
									{" — "}
									{t("settings.billing.paymentMethod.expiry", {
										month: String(method.expMonth).padStart(2, "0"),
										year: String(method.expYear).slice(-2),
									})}
								</>
							)}
						</p>
					</div>
				</div>
				<Button
					variant="secondary"
					size="sm"
					onClick={handleManage}
					loading={createCustomerPortalMutation.isPending}
				>
					<ExternalLinkIcon className="mr-2 size-4" />
					{t("settings.billing.paymentMethod.manage")}
				</Button>
			</div>
		</div>
	);
}
