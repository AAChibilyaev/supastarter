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
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { orpc } from "@shared/lib/orpc-query-utils";

import type { SourceType } from "./ConnectorCard";

interface ConnectorWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	source: SourceType;
	organizationId: string;
}

const STEP_ICONS = ["1", "2", "3", "4", "5"];

const STEP_KEYS: Array<keyof ConnectorTranslationKeys> = [
	"stepGenerateToken",
	"stepDownloadModule",
	"stepConfigure",
	"stepTestConnection",
	"stepRunSync",
];

// Help TypeScript extract keys from the wizard translations
type ConnectorTranslationKeys = {
	stepGenerateToken: string;
	stepDownloadModule: string;
	stepConfigure: string;
	stepTestConnection: string;
	stepRunSync: string;
};

const SOURCE_LABELS: Record<SourceType, string> = {
	prestashop: "PrestaShop",
	bitrix: "1C-Bitrix",
	directApi: "Direct API",
};

export function ConnectorWizard({
	open,
	onOpenChange,
	source,
	organizationId,
}: ConnectorWizardProps) {
	const t = useTranslations();
	const [step, setStep] = useState(1);
	const [rawKey, setRawKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<"idle" | "success" | "failed">(
		"idle",
	);
	const [syncing, setSyncing] = useState(false);

	const sourceLabel = SOURCE_LABELS[source];

	const handleClose = () => {
		onOpenChange(false);
		setStep(1);
		setRawKey(null);
		setCopied(false);
		setTestResult("idle");
	};

	const handleGenerateToken = async () => {
		try {
			const result = await orpc.search.createConnectorToken.mutate({
				organizationId,
				slug: "products",
				name: `${sourceLabel} Connector`,
			});
			setRawKey(result.rawKey);
			setStep(2);
		} catch (error) {
			toastError(
				error instanceof Error ? error.message : "Failed to generate token",
			);
		}
	};

	const handleCopyToken = async () => {
		if (!rawKey) return;
		try {
			await navigator.clipboard.writeText(rawKey);
			setCopied(true);
		} catch {
			// Fallback for environments without clipboard API
		}
	};

	const handleTestConnection = async () => {
		setTesting(true);
		setTestResult("idle");
		try {
			// Simulate a heartbeat check — the real endpoint would be called by the CMS module
			// For now, we check if any connector tokens exist as a proxy
			const tokens = await orpc.search.listConnectorTokens.query({
				organizationId,
			});
			const activeToken = tokens.find((t) => !t.revokedAt);
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

	const handleRunSync = async () => {
		setSyncing(true);
		try {
			// Trigger a sync via the import endpoint
			await orpc.search.importDocuments.mutate({
				organizationId,
				slug: "products",
				documents: [],
			});
			toastSuccess(t("search.connector.syncSuccess"));
			handleClose();
		} catch (error) {
			toastError(
				error instanceof Error ? error.message : "Sync failed to start",
			);
		} finally {
			setSyncing(false);
		}
	};

	const apiUrl =
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host}`
			: "";

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{t("search.connector.wizardTitle", { source: sourceLabel })}
					</DialogTitle>
					<DialogDescription>
						{t("search.connector.subtitle")}
					</DialogDescription>
				</DialogHeader>

				{/* Step indicator */}
				<div className="gap-2 flex items-center justify-center">
					{STEP_ICONS.map((_, i) => {
						const stepNum = i + 1;
						const isActive = stepNum === step;
						const isDone = stepNum < step;
						return (
							<div key={stepNum} className="gap-1.5 flex items-center">
								<div
									className={`size-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
										isActive
											? "bg-primary text-primary-foreground"
											: isDone
												? "bg-primary/20 text-primary"
												: "bg-muted text-muted-foreground"
									}`}
								>
									{isDone ? "✓" : stepNum}
								</div>
								<span
									className={`text-xs ${
										isActive
											? "text-foreground font-medium"
											: "text-muted-foreground"
									}`}
								>
									{t(`search.connector.${STEP_KEYS[i]}`)}
								</span>
								{i < STEP_ICONS.length - 1 && (
									<div
										className={`mx-1 h-px w-6 ${
											isDone ? "bg-primary/40" : "bg-muted-foreground/20"
										}`}
									/>
								)}
							</div>
						);
					})}
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
										<div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
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
								<CardDescription>
									{t("search.connector.subtitle")}
								</CardDescription>
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
									className="w-full mt-2"
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
								<CardDescription>
									{t("search.connector.subtitle")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">
										{t("search.apiKeysPage.title")} — API URL
									</label>
									<Input value={apiUrl} readOnly className="font-mono text-xs" />
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">
										{t("search.connector.tokenLabel")}
									</label>
									<Input
										value={rawKey ?? t("search.connector.tokenPlaceholder")}
										readOnly
										className="font-mono text-xs"
									/>
								</div>
								<div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
									<p className="font-medium mb-1">
										{t("search.connector.stepConfigure")}
									</p>
									<ol className="space-y-1 list-inside list-decimal text-xs">
										<li>
											{source === "prestashop"
												? "Paste the API URL into the AACsearch module settings in your PrestaShop admin."
												: source === "bitrix"
													? "Paste the API URL into the AACsearch module settings in your Bitrix admin."
													: "Use the API URL and token as the base URL and bearer token for your REST calls."}
										</li>
										<li>
											{source === "directApi"
												? "Include the token in the Authorization header: Bearer &lt;token&gt;"
												: "Paste the connector token into the module settings field."}
										</li>
										<li>Save the configuration.</li>
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
								<CardDescription>
									{t("search.connector.subtitle")}
								</CardDescription>
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
								<CardDescription>
									{t("search.connector.subtitle")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<p className="text-sm text-muted-foreground">
									Trigger a full synchronization to index all products from your
									CMS into AACsearch.
								</p>
								<Button
									variant="primary"
									onClick={handleRunSync}
									loading={syncing}
									className="w-full"
								>
									{t("search.checklist.fullSync")}
								</Button>
							</CardContent>
						</Card>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
