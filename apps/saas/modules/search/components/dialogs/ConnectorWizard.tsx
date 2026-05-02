"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { toastSuccess } from "@repo/ui/components/toast";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useSearchIndexesQuery } from "../../lib/api";

interface ConnectorWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	source: "prestashop" | "bitrix" | "directApi";
	organizationId: string;
	indexSlug?: string;
}

const STEP_KEYS = [
	"stepGenerateToken",
	"stepDownloadModule",
	"stepConfigure",
	"stepTestConnection",
	"stepRunSync",
];

const SOURCE_LABELS: Record<string, string> = {
	prestashop: "PrestaShop",
	bitrix: "1C-Bitrix",
	directApi: "Direct API",
};

export function ConnectorWizard({
	open,
	onOpenChange,
	source,
	organizationId,
	indexSlug,
}: ConnectorWizardProps) {
	const t = useTranslations();
	const [step, setStep] = useState(1);
	const [rawKey, setRawKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<"idle" | "success" | "failed">("idle");
	const [syncing, setSyncing] = useState(false);

	const sourceLabel = SOURCE_LABELS[source];
	const { data: indexes } = useSearchIndexesQuery(organizationId);

	const handleClose = () => {
		onOpenChange(false);
		setStep(1);
		setRawKey(null);
		setCopied(false);
		setTestResult("idle");
	};

	const handleGenerateToken = async () => {
		// Use provided indexSlug or fetch the first available index
		const targetSlug = indexSlug || indexes?.[0]?.slug || "";
		if (!targetSlug) {
			throw new Error(t("search.connector.wizard.noIndex"));
		}
		try {
			const result = await orpc.search.createConnectorToken.call({
				organizationId,
				slug: targetSlug,
				name: `${sourceLabel} Connector`,
			});
			setRawKey(result.rawKey);
			setStep(2);
		} catch (error: unknown) {
			const msg =
				error instanceof Error ? error.message : t("search.connector.wizard.tokenFailed");
			throw new Error(msg);
		}
	};

	const handleCopyToken = async () => {
		if (!rawKey) return;
		try {
			await navigator.clipboard.writeText(rawKey);
			setCopied(true);
		} catch {
			// Fallback
		}
	};

	const handleTestConnection = async () => {
		setTesting(true);
		setTestResult("idle");
		try {
			const tokens = await orpc.search.listConnectorTokens.call({
				organizationId,
			});
			const activeToken = tokens.find((token) => !token.revokedAt);
			if (activeToken) {
				setTestResult("success");
			} else {
				setTestResult("failed");
			}
		} catch {
			setTestResult("failed");
		} finally {
			setTesting(false);
		}
	};

	const handleRunSync = () => {
		setSyncing(true);
		toastSuccess(t("search.connector.syncTriggerHint"));
		setSyncing(false);
		handleClose();
	};

	const apiUrl =
		typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-2xl max-h-[92vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="break-words">
						{t("search.connector.wizardTitle", { source: sourceLabel })}
					</DialogTitle>
					<DialogDescription className="break-words">
						{t("search.connector.subtitle")}
					</DialogDescription>
				</DialogHeader>

				{/* Step indicator — numbered dots with connector lines; active step label only */}
				<div className="-mx-1 px-1">
					<div className="gap-1 flex items-center justify-between">
						{STEP_KEYS.map((_, i) => {
							const stepNum = i + 1;
							const isActive = stepNum === step;
							const isDone = stepNum < step;
							return (
								<div
									key={stepNum}
									className="flex flex-1 items-center first:flex-none last:flex-none"
								>
									<div
										className={`size-8 text-sm font-medium flex shrink-0 items-center justify-center rounded-full transition-colors ${
											isActive
												? "bg-primary text-primary-foreground"
												: isDone
													? "bg-primary/20 text-primary"
													: "bg-muted text-muted-foreground"
										}`}
										aria-label={t(`search.connector.${STEP_KEYS[i]}` as never)}
										title={t(`search.connector.${STEP_KEYS[i]}` as never)}
									>
										{isDone ? "✓" : stepNum}
									</div>
									{i < STEP_KEYS.length - 1 && (
										<div
											className={`mx-1 min-w-2 h-px flex-1 ${
												isDone ? "bg-primary/40" : "bg-muted-foreground/20"
											}`}
										/>
									)}
								</div>
							);
						})}
					</div>
					<p className="mt-2 text-xs font-medium text-center text-foreground">
						{t("search.connector.stepCounter", {
							current: step,
							total: STEP_KEYS.length,
						})}
						<span className="ml-2 text-muted-foreground">
							{t(`search.connector.${STEP_KEYS[step - 1]}` as never)}
						</span>
					</p>
				</div>

				{/* Step 1: Generate Token */}
				{step === 1 && (
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.connector.stepGenerateToken")}
								</CardTitle>
								<CardDescription>
									{t("search.connector.tokenGenerated")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{rawKey ? (
									<div className="space-y-3">
										<div className="gap-2 flex">
											<Input
												value={rawKey}
												readOnly
												className="font-mono text-xs"
											/>
											<Button
												variant="outline"
												size="sm"
												onClick={handleCopyToken}
											>
												{copied
													? t("search.connector.tokenCopied")
													: t("search.apiKeys.copy")}
											</Button>
										</div>
										<div className="p-3 text-sm rounded-md border border-foreground/20 bg-foreground/5 text-foreground/70 dark:border-foreground/30 dark:bg-foreground/10 dark:text-foreground/70">
											{t("search.connector.tokenCopyWarning")}
										</div>
										<Button
											variant="primary"
											onClick={() => setStep(2)}
											className="w-full"
										>
											{t("search.connector.stepDownloadModule")} →
										</Button>
									</div>
								) : (
									<Button
										variant="primary"
										onClick={handleGenerateToken}
										className="w-full"
									>
										{t("search.connector.stepGenerateToken")}
									</Button>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Step 2: Download Module */}
				{step === 2 && (
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.connector.stepDownloadModule")}
								</CardTitle>
								<CardDescription>{t("search.connector.subtitle")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{source === "prestashop" || source === "directApi" ? (
									<Button
										variant="outline"
										className="w-full justify-start"
										asChild
									>
										<a
											href="https://github.com/nousresearch/aacsearch-prestashop/releases"
											target="_blank"
											rel="noopener noreferrer"
										>
											{t("search.connector.downloadPrestashop")}
										</a>
									</Button>
								) : null}
								{source === "bitrix" || source === "directApi" ? (
									<Button
										variant="outline"
										className="w-full justify-start"
										asChild
									>
										<a
											href="https://github.com/nousresearch/aacsearch-bitrix/releases"
											target="_blank"
											rel="noopener noreferrer"
										>
											{t("search.connector.downloadBitrix")}
										</a>
									</Button>
								) : null}
								<Button
									variant="primary"
									onClick={() => setStep(3)}
									className="mt-2 w-full"
								>
									{t("search.connector.stepConfigure")} →
								</Button>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Step 3: Configure */}
				{step === 3 && (
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.connector.stepConfigure")}
								</CardTitle>
								<CardDescription>{t("search.connector.subtitle")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label
										htmlFor="connector-api-url"
										className="text-sm font-medium"
									>
										API URL
									</label>
									<Input
										id="connector-api-url"
										value={apiUrl}
										readOnly
										className="font-mono text-xs min-w-0 truncate"
									/>
								</div>
								<div className="space-y-2">
									<label
										htmlFor="connector-access-token"
										className="text-sm font-medium"
									>
										{t("search.connector.tokenLabel")}
									</label>
									<Input
										id="connector-access-token"
										value={rawKey ?? t("search.connector.tokenPlaceholder")}
										readOnly
										className="font-mono text-xs"
									/>
								</div>
								<div className="p-3 text-sm rounded-md bg-muted text-muted-foreground">
									<p className="font-medium mb-1">
										{t("search.connector.stepConfigure")}
									</p>
									<ol className="space-y-1 text-xs list-inside list-decimal">
										<li>
											{t(`search.connector.configStep1.${source}` as never)}
										</li>
										<li>
											{t(`search.connector.configStep2.${source}` as never)}
										</li>
										<li>{t("search.connector.configStep3")}</li>
									</ol>
								</div>
								<Button
									variant="primary"
									onClick={() => setStep(4)}
									className="w-full"
								>
									{t("search.connector.stepTestConnection")} →
								</Button>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Step 4: Test Connection */}
				{step === 4 && (
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.connector.stepTestConnection")}
								</CardTitle>
								<CardDescription>{t("search.connector.subtitle")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{testResult === "idle" ? (
									<Button
										variant="primary"
										onClick={handleTestConnection}
										loading={testing}
										className="w-full"
									>
										{t("search.connector.testHandshake")}
									</Button>
								) : (
									<div className="space-y-3">
										<div className="gap-3 flex items-center">
											<Badge
												status={
													testResult === "success" ? "success" : "error"
												}
											>
												{testResult === "success"
													? t("search.connector.testSuccess")
													: t("search.connector.testFailed")}
											</Badge>
										</div>
										{testResult === "success" ? (
											<Button
												variant="primary"
												onClick={() => setStep(5)}
												className="w-full"
											>
												{t("search.connector.stepRunSync")} →
											</Button>
										) : (
											<Button
												variant="outline"
												onClick={() => setTestResult("idle")}
												className="w-full"
											>
												{t("search.connector.testHandshake")}
											</Button>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Step 5: Run First Sync */}
				{step === 5 && (
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{t("search.connector.stepRunSync")}
								</CardTitle>
								<CardDescription>{t("search.connector.subtitle")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<p className="text-sm text-muted-foreground">
									{t("search.connector.runSyncDesc")}
								</p>
								<Button
									variant="primary"
									onClick={handleRunSync}
									loading={syncing}
									className="w-full"
								>
									{t("search.connector.runSyncCta")}
								</Button>
							</CardContent>
						</Card>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
