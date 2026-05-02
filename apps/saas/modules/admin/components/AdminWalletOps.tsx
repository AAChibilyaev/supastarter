"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { toastError, toastPromise } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatKopecks } from "../../payments/lib/format-kopecks";

const LIST_LIMIT = 50;

export function AdminWalletOps() {
	const t = useTranslations("admin.wallet");
	const queryClient = useQueryClient();
	const [organizationSearch, setOrganizationSearch] = useState("");
	const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");
	const [amountRub, setAmountRub] = useState("");
	const [direction, setDirection] = useState<"credit" | "debit">("credit");
	const [reason, setReason] = useState("");

	const organizationsQuery = useQuery(
		orpc.admin.organizations.list.queryOptions({
			input: {
				limit: LIST_LIMIT,
				offset: 0,
				query: organizationSearch || undefined,
			},
		}),
	);

	const organizations = organizationsQuery.data?.organizations ?? [];
	const fallbackOrganizationId = organizationsQuery.data?.organizations?.[0]?.id ?? "";

	const effectiveOrganizationId = selectedOrganizationId || fallbackOrganizationId;

	const walletQuery = useQuery({
		...orpc.billingWallet.getWallet.queryOptions({
			input: {
				organizationId: effectiveOrganizationId || undefined,
			},
		}),
		enabled: Boolean(effectiveOrganizationId),
	});

	const transactionsQuery = useQuery({
		...orpc.billingWallet.listTransactions.queryOptions({
			input: {
				organizationId: effectiveOrganizationId || undefined,
				limit: 15,
			},
		}),
		enabled: Boolean(effectiveOrganizationId) && Boolean(walletQuery.data),
	});

	const adjustWalletMutation = useMutation(
		orpc.billingWallet.adminAdjust.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.billingWallet.getWallet.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.billingWallet.listTransactions.key(),
				});
				setAmountRub("");
				setReason("");
			},
		}),
	);

	const runAdjustment = () => {
		const wallet = walletQuery.data;
		if (!wallet?.id) {
			toastError(t("noWalletError"));
			return;
		}

		const amount = Number(amountRub.replace(",", "."));
		if (!Number.isFinite(amount) || amount <= 0) {
			toastError(t("invalidAmountError"));
			return;
		}

		if (reason.trim().length < 10) {
			toastError(t("shortReasonError"));
			return;
		}

		const amountKopecks = BigInt(Math.round(amount * 100));

		toastPromise(
			async () =>
				adjustWalletMutation.mutateAsync({
					walletId: wallet.id,
					amountKopecks,
					direction,
					reason: reason.trim(),
				}),
			{
				loading: t("applyingAdjustment"),
				success: t("adjustmentSuccess"),
				error: t("adjustmentError"),
			},
		);
	};

	return (
		<div className="gap-6 grid grid-cols-1">
			<Card>
				<CardHeader>
					<CardTitle>{t("manualAdjustment")}</CardTitle>
				</CardHeader>
				<CardContent className="gap-4 grid grid-cols-1">
					<Input
						value={organizationSearch}
						onChange={(event) => setOrganizationSearch(event.target.value)}
						placeholder={t("searchOrgPlaceholder")}
					/>

					<Select
						value={effectiveOrganizationId}
						onValueChange={setSelectedOrganizationId}
					>
						<SelectTrigger>
							<SelectValue placeholder={t("selectOrgPlaceholder")} />
						</SelectTrigger>
						<SelectContent>
							{organizations.map((organization) => (
								<SelectItem key={organization.id} value={organization.id}>
									{organization.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{walletQuery.isLoading ? (
						<Skeleton className="h-16 w-full" />
					) : walletQuery.data ? (
						<div className="p-3 text-sm rounded-md border">
							<p className="text-foreground/60">{t("currentBalance")}</p>
							<p className="font-semibold text-2xl">
								{formatKopecks(walletQuery.data.availableBalanceKopecks)}
							</p>
						</div>
					) : (
						<p className="text-sm text-foreground/60">{t("walletNotInitialized")}</p>
					)}

					<div className="gap-3 md:grid-cols-3 grid grid-cols-1">
						<Select
							value={direction}
							onValueChange={(value) => setDirection(value as "credit" | "debit")}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="credit">{t("creditLabel")}</SelectItem>
								<SelectItem value="debit">{t("debitLabel")}</SelectItem>
							</SelectContent>
						</Select>

						<Input
							value={amountRub}
							onChange={(event) => setAmountRub(event.target.value)}
							placeholder={t("amountPlaceholder")}
						/>
						<Button onClick={runAdjustment} loading={adjustWalletMutation.isPending}>
							{t("applyButton")}
						</Button>
					</div>

					<Input
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder={t("reasonPlaceholder")}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("latestTransactions")}</CardTitle>
				</CardHeader>
				<CardContent className="gap-2 grid grid-cols-1">
					{transactionsQuery.isLoading ? (
						Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={`txn-${index}`} className="h-10 w-full" />
						))
					) : (transactionsQuery.data ?? []).length === 0 ? (
						<p className="text-sm text-foreground/60">{t("noTransactions")}</p>
					) : (
						transactionsQuery.data?.map((transaction) => (
							<div
								key={transaction.id}
								className="p-3 text-sm flex items-center justify-between rounded-md border"
							>
								<div>
									<p className="font-medium">
										{transaction.direction.toUpperCase()}
									</p>
									<p className="text-foreground/60">{transaction.source}</p>
								</div>
								<div className="text-right">
									<p className="font-medium">
										{formatKopecks(transaction.amountKopecks)}
									</p>
									<p className="text-foreground/60">
										{new Date(transaction.createdAt).toLocaleString()}
									</p>
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}
