"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCardIcon, PlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaymentMethodsCardProps {
	organizationId?: string;
}

const BRAND_LABELS: Record<string, string> = {
	visa: "Visa",
	mastercard: "Mastercard",
	amex: "American Express",
	discover: "Discover",
	diners: "Diners Club",
	jcb: "JCB",
	unionpay: "UnionPay",
	unknown: "Card",
};

function CardBrandLabel({ brand }: { brand: string }) {
	return <span>{BRAND_LABELS[brand.toLowerCase()] ?? brand}</span>;
}

function formatExpiry(month: number, year: number): string {
	return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export function PaymentMethodsCard({ organizationId }: PaymentMethodsCardProps) {
	const t = useTranslations();
	const qc = useQueryClient();
	const { confirm } = useConfirmationAlert();

	const { data, isLoading } = useQuery(
		orpc.payments.listPaymentMethods.queryOptions({
			input: { organizationId },
		}),
	);

	const addLinkMutation = useMutation(
		orpc.payments.addPaymentMethodLink.mutationOptions({
			onError: () => {
				toastError(t("settings.billing.paymentMethods.addCardError"));
			},
		}),
	);

	const setDefaultMutation = useMutation(
		orpc.payments.setDefaultPaymentMethod.mutationOptions({
			onSuccess: () => {
				void qc.invalidateQueries({
					queryKey: orpc.payments.listPaymentMethods.queryKey(),
				});
			},
			onError: () => {
				toastError(t("settings.billing.paymentMethods.actionError"));
			},
		}),
	);

	const deleteMutation = useMutation(
		orpc.payments.deletePaymentMethod.mutationOptions({
			onSuccess: () => {
				void qc.invalidateQueries({
					queryKey: orpc.payments.listPaymentMethods.queryKey(),
				});
				toastSuccess(t("settings.billing.paymentMethods.delete"));
			},
			onError: () => {
				toastError(t("settings.billing.paymentMethods.actionError"));
			},
		}),
	);

	const handleAddCard = async () => {
		const { url } = await addLinkMutation.mutateAsync({
			organizationId,
			redirectUrl: window.location.href,
		});
		window.location.href = url;
	};

	const handleSetDefault = (paymentMethodId: string) => {
		void setDefaultMutation.mutate({ paymentMethodId, organizationId });
	};

	const handleDelete = (paymentMethodId: string) => {
		confirm({
			title: t("settings.billing.paymentMethods.deleteConfirmTitle"),
			message: t("settings.billing.paymentMethods.deleteConfirmMessage"),
			confirmLabel: t("settings.billing.paymentMethods.delete"),
			destructive: true,
			onConfirm: () => deleteMutation.mutate({ paymentMethodId }),
		});
	};

	const paymentMethods = data?.paymentMethods ?? [];

	return (
		<Card>
			<CardHeader className="gap-4 flex flex-row items-center justify-between">
				<CardTitle className="font-medium text-base">
					{t("settings.billing.paymentMethods.title")}
				</CardTitle>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void handleAddCard()}
					loading={addLinkMutation.isPending}
				>
					<PlusIcon className="mr-2 size-4" />
					{t("settings.billing.paymentMethods.addCard")}
				</Button>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				) : paymentMethods.length === 0 ? (
					<div className="gap-3 py-8 flex flex-col items-center justify-center text-center">
						<CreditCardIcon className="size-8 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							{t("settings.billing.paymentMethods.empty")}
						</p>
					</div>
				) : (
					<ul className="divide-y divide-border">
						{paymentMethods.map((pm) => (
							<li
								key={pm.id}
								className="gap-4 py-3 first:pt-0 last:pb-0 flex items-center justify-between"
							>
								<div className="gap-3 min-w-0 flex items-center">
									<CreditCardIcon className="size-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0">
										<p className="text-sm font-medium leading-none">
											<CardBrandLabel brand={pm.brand} />
											{" •••• "}
											{pm.last4}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{formatExpiry(pm.expMonth, pm.expYear)}
										</p>
									</div>
									{pm.isDefault && (
										<Badge status="success" className="shrink-0">
											{t("settings.billing.paymentMethods.default")}
										</Badge>
									)}
								</div>
								<div className="gap-2 flex shrink-0 items-center">
									{!pm.isDefault && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleSetDefault(pm.id)}
											loading={
												setDefaultMutation.isPending &&
												setDefaultMutation.variables?.paymentMethodId ===
													pm.id
											}
										>
											<StarIcon className="mr-1 size-4" />
											{t("settings.billing.paymentMethods.setDefault")}
										</Button>
									)}
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(pm.id)}
										loading={
											deleteMutation.isPending &&
											deleteMutation.variables?.paymentMethodId === pm.id
										}
										className="text-destructive hover:text-destructive"
									>
										<Trash2Icon className="size-4" />
										<span className="sr-only">
											{t("settings.billing.paymentMethods.delete")}
										</span>
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
