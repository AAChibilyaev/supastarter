"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, MailCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useRef, useState } from "react";

const STORAGE_KEY = "aacsearch_roadmap_email_captured";

interface EmailCaptureModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onComplete: () => void;
	onSkip: () => void;
}

export function EmailCaptureModal({
	open,
	onOpenChange,
	onComplete,
	onSkip,
}: EmailCaptureModalProps) {
	const t = useTranslations("roadmap.emailCapture");
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = useCallback(
		async (e: FormEvent) => {
			e.preventDefault();

			if (!email.trim()) return;

			setStatus("loading");
			setErrorMessage("");

			try {
				const response = await fetch("/api/newsletter/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: email.trim(), source: "roadmap_vote" }),
				});

				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.error || "Failed to subscribe");
				}

				setStatus("success");
				try {
					localStorage.setItem(STORAGE_KEY, "true");
				} catch {
					// localStorage may be full or disabled
				}

				setTimeout(() => {
					onComplete();
					onOpenChange(false);
				}, 2000);
			} catch (err) {
				setStatus("error");
				setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
			}
		},
		[email, onComplete, onOpenChange],
	);

	const handleSkip = useCallback(() => {
		try {
			localStorage.setItem(STORAGE_KEY, "true");
		} catch {
			// localStorage may be full or disabled
		}
		onSkip();
		onOpenChange(false);
	}, [onSkip, onOpenChange]);

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed z-50" />
				<Dialog.Content className="max-w-md p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/40 bg-background">
					<Dialog.Close className="right-4 top-4 p-1 absolute rounded-lg text-muted-foreground transition-colors hover:text-foreground">
						<X className="size-4" />
					</Dialog.Close>

					{status === "success" ? (
						<div className="gap-4 py-6 flex flex-col items-center text-center">
							<div className="size-12 bg-green-500/10 flex items-center justify-center rounded-full">
								<MailCheck className="size-6 text-green-500" />
							</div>
							<Dialog.Title className="text-xl font-semibold tracking-tight">
								{t("success")}
							</Dialog.Title>
						</div>
					) : (
						<>
							<Dialog.Title className="text-xl font-semibold tracking-tight">
								{t("title")}
							</Dialog.Title>
							<p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>

							<form onSubmit={handleSubmit} className="mt-6 space-y-4">
								<input
									ref={inputRef}
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder={t("placeholder")}
									required
									disabled={status === "loading"}
									className="px-4 py-2.5 text-sm w-full rounded-xl border border-border/40 bg-accent/5 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50"
								/>

								{status === "error" && <p className="text-xs text-red-500">{errorMessage}</p>}

								<button
									type="submit"
									disabled={status === "loading" || !email.trim()}
									className="gap-2 px-4 py-2.5 text-sm font-semibold flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{status === "loading" && <Loader2 className="size-4 animate-spin" />}
									{t("subscribeAndVote")}
								</button>

								<button
									type="button"
									onClick={handleSkip}
									disabled={status === "loading"}
									className="text-xs w-full text-center text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
								>
									{t("skipAndVote")}
								</button>
							</form>

							<p className="mt-4 text-xs text-muted-foreground/60">{t("privacy")}</p>
						</>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export function hasEmailCaptureBeenPrompted(): boolean {
	if (typeof window === "undefined") return true;
	try {
		return localStorage.getItem(STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}
