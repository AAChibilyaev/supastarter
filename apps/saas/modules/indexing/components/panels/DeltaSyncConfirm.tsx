"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useTranslations } from "next-intl";

interface DeltaSyncConfirmProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isLoading: boolean;
}

/**
 * Confirmation dialog shown before triggering a delta sync.
 * Explains that only changed documents will be processed.
 */
export function DeltaSyncConfirm({
	open,
	onOpenChange,
	onConfirm,
	isLoading,
}: DeltaSyncConfirmProps) {
	const t = useTranslations("indexing.delta");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("confirmTitle")}</DialogTitle>
					<DialogDescription>{t("confirmDescription")}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						{t("cancel")}
					</Button>
					<Button variant="primary" onClick={onConfirm} loading={isLoading}>
						{t("confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
