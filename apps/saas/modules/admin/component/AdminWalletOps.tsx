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
import { useMemo, useState } from "react";

import { formatKopecks } from "../../payments/lib/format-kopecks";

const LIST_LIMIT = 50;

export function AdminWalletOps() {
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

	const effectiveOrganizationId = useMemo(() => {
		if (selectedOrganizationId) {
			return selectedOrganizationId;
		}

		return organizations[0]?.id ?? "";
	}, [organizations, selectedOrganizationId]);

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
			toastError("Select an organization with initialized wallet first.");
			return;
		}

		const amount = Number(amountRub.replace(",", "."));
		if (!Number.isFinite(amount) || amount <= 0) {
			toastError("Amount must be a positive number.");
			return;
		}

		if (reason.trim().length < 10) {
			toastError("Reason must be at least 10 characters.");
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
				loading: "Applying adjustment...",
				success: "Wallet adjusted successfully.",
				error: "Failed to adjust wallet.",
			},
		);
	};

	return (
		<div className="gap-6 grid grid-cols-1">
			<Card>
				<CardHeader>
					<CardTitle>Manual wallet adjustment</CardTitle>
				</CardHeader>
				<CardContent className="gap-4 grid grid-cols-1">
					<Input
						value={organizationSearch}
						onChange={(event) => setOrganizationSearch(event.target.value)}
						placeholder="Search organization..."
					/>

					<Select
						value={effectiveOrganizationId}
						onValueChange={setSelectedOrganizationId}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select organization" />
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
							<p className="text-foreground/60">Current balance</p>
							<p className="font-semibold text-2xl">
								{formatKopecks(walletQuery.data.availableBalanceKopecks)}
							</p>
						</div>
					) : (
						<p className="text-sm text-foreground/60">
							Wallet is not initialized for selected organization.
						</p>
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
								<SelectItem value="credit">Credit</SelectItem>
								<SelectItem value="debit">Debit</SelectItem>
							</SelectContent>
						</Select>

						<Input
							value={amountRub}
							onChange={(event) => setAmountRub(event.target.value)}
							placeholder="Amount (RUB)"
						/>
						<Button onClick={runAdjustment} loading={adjustWalletMutation.isPending}>
							Apply
						</Button>
					</div>

					<Input
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder="Reason (minimum 10 chars)"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Latest wallet transactions</CardTitle>
				</CardHeader>
				<CardContent className="gap-2 grid grid-cols-1">
					{transactionsQuery.isLoading ? (
						Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={`txn-${index}`} className="h-10 w-full" />
						))
					) : (transactionsQuery.data ?? []).length === 0 ? (
						<p className="text-sm text-foreground/60">No transactions found.</p>
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
