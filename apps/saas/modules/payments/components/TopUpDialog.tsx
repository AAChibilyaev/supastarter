"use client";

import { cn } from "@repo/ui";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useCreateTopup } from "../hooks/ai-wallet";
import { formatKopecks } from "../lib/format-kopecks";

const PRESETS_KOPECKS = [50_000, 100_000, 500_000, 1_000_000] as const;

export function TopUpDialog({
	organizationId,
	trigger,
}: {
	organizationId?: string;
	trigger?: React.ReactNode;
}) {
	const t = useTranslations();
	const locale = useLocale();
	const fmt = (amount: bigint | number | string) => formatKopecks(amount, { appLocale: locale });
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<number>(PRESETS_KOPECKS[1]);
	const [custom, setCustom] = useState<string>("");
	const mutation = useCreateTopup();

	const customKopecks = (() => {
		const n = Number(custom.replace(",", ".").trim());
		if (!Number.isFinite(n) || n <= 0) return null;
		return Math.round(n * 100);
	})();

	const finalKopecks = customKopecks ?? selected;

	const onConfirm = async () => {
		try {
			const res = await mutation.mutateAsync({
				amountKopecks: BigInt(finalKopecks),
				organizationId,
			});
			window.location.href = res.paymentLinkUrl;
		} catch {
			toast.error(t("settings.billing.aiCredits.topup.error"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? <Button>{t("settings.billing.aiCredits.topup.button")}</Button>}
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("settings.billing.aiCredits.topup.title")}</DialogTitle>
					<DialogDescription>{t("settings.billing.aiCredits.topup.description")}</DialogDescription>
				</DialogHeader>

				<div className="gap-2 grid grid-cols-2">
					{PRESETS_KOPECKS.map((amt) => (
						<Button
							key={amt}
							type="button"
							variant={!customKopecks && selected === amt ? "primary" : "outline"}
							className={cn("h-12 text-base")}
							onClick={() => {
								setSelected(amt);
								setCustom("");
							}}
						>
							{fmt(amt)}
						</Button>
					))}
				</div>

				<div className="gap-2 flex flex-col">
					<Label htmlFor="topup-custom">{t("settings.billing.aiCredits.topup.customAmount")}</Label>
					<Input
						id="topup-custom"
						type="text"
						inputMode="decimal"
						placeholder="2500"
						value={custom}
						onChange={(e) => setCustom(e.target.value)}
					/>
				</div>

				<DialogFooter className="gap-3 sm:justify-between flex flex-row items-center justify-between">
					<div className="text-sm text-foreground/70">
						{t("settings.billing.aiCredits.topup.summary", {
							amount: fmt(finalKopecks),
						})}
					</div>
					<Button onClick={onConfirm} loading={mutation.isPending}>
						{t("settings.billing.aiCredits.topup.confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
