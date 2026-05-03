"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { Building2, CheckCircle2, Globe, KeyRound, Loader2, Shield, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PROVIDERS = [
	{ id: "okta", label: "Okta", icon: Shield },
	{ id: "azure_ad", label: "Azure AD", icon: Building2 },
	{ id: "google_workspace", label: "Google Workspace", icon: Globe },
	{ id: "keycloak", label: "Keycloak", icon: KeyRound },
	{ id: "other", label: "Other", icon: Globe },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface ScimWizardProps {
	organizationId: string;
}

function TestProgress() {
	return (
		<div className="gap-3 py-8 flex flex-col items-center">
			<Loader2 className="size-8 animate-spin text-primary" />
			<p className="text-sm text-muted-foreground">Testing connection...</p>
		</div>
	);
}

function TestSuccess() {
	const t = useTranslations("settings");
	return (
		<div className="gap-3 py-8 flex flex-col items-center">
			<CheckCircle2 className="size-10 text-success" />
			<p className="text-sm font-medium text-success">{t("scim.test.success")}</p>
		</div>
	);
}

function TestFailure({ detail }: { detail: string }) {
	const t = useTranslations("settings");
	return (
		<div className="gap-3 py-8 flex flex-col items-center">
			<XCircle className="size-10 text-destructive" />
			<p className="text-sm font-medium text-destructive">{t("scim.test.failure")}</p>
			{detail && (
				<p className="text-xs max-w-md text-center text-muted-foreground">{detail}</p>
			)}
		</div>
	);
}

export function ScimWizard({ organizationId }: ScimWizardProps) {
	const t = useTranslations("settings");
	const router = useRouter();

	const [step, setStep] = useState(1);
	const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
	const [bearerToken, setBearerToken] = useState<string | null>(null);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<"idle" | "loading" | "success" | "failure">(
		"idle",
	);
	const [testDetail, setTestDetail] = useState("");

	const scimBaseUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/api/scim/v2/${organizationId}`
			: "";

	const handleSelectProvider = (providerId: ProviderId) => {
		setSelectedProvider(providerId);
	};

	const handleContinueToConfigure = async () => {
		if (!selectedProvider) return;

		setStep(2);

		try {
			const response = await fetch(`/api/scim/config/${organizationId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ provider: selectedProvider }),
			});

			if (!response.ok) {
				throw new Error("Failed to create SCIM configuration");
			}

			const data = await response.json();
			// The API returns bearerToken only on creation
			if (data.bearerToken) {
				setBearerToken(data.bearerToken);
			}
		} catch {
			toastError(t("scim.wizard.configError"));
		}
	};

	const handleTestConnection = async () => {
		setIsTesting(true);
		setTestResult("loading");
		setTestDetail("");

		try {
			const response = await fetch(`/api/scim/config/${organizationId}/test`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			});

			const data = await response.json();

			if (data.success) {
				setTestResult("success");
				toastSuccess(t("scim.test.success"));
			} else {
				setTestResult("failure");
				setTestDetail(data.detail ?? "");
				toastError(t("scim.test.failure"));
			}
		} catch {
			setTestResult("failure");
			setTestDetail("Connection failed — unable to reach SCIM endpoint");
			toastError(t("scim.test.failure"));
		} finally {
			setIsTesting(false);
		}
	};

	const handleComplete = () => {
		toastSuccess(t("scim.wizard.complete"));
		router.push(`/settings/scim`);
	};

	const handleSkipAndSave = () => {
		toastSuccess(t("scim.wizard.complete"));
		router.push(`/settings/scim`);
	};

	return (
		<div className="max-w-2xl space-y-6 mx-auto">
			{/* Step indicator */}
			<div className="gap-2 flex items-center">
				{[1, 2, 3].map((s) => (
					<div key={s} className="gap-2 flex items-center">
						<div
							className={`size-8 text-sm font-medium flex items-center justify-center rounded-full ${
								step === s
									? "bg-primary text-primary-foreground"
									: step > s
										? "bg-success/10 text-success"
										: "bg-muted text-muted-foreground"
							}`}
						>
							{step > s ? <CheckCircle2 className="size-4" /> : s}
						</div>
						{s < 3 && (
							<div className={`w-8 h-px ${step > s ? "bg-success" : "bg-border"}`} />
						)}
					</div>
				))}
			</div>

			{/* Step 1: Select provider */}
			{step === 1 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("scim.wizard.selectProvider")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="gap-4 sm:grid-cols-3 grid grid-cols-2">
							{PROVIDERS.map((provider) => {
								const Icon = provider.icon;
								const isSelected = selectedProvider === provider.id;
								return (
									<button
										type="button"
										key={provider.id}
										onClick={() => handleSelectProvider(provider.id)}
										className={`p-4 cursor-pointer rounded-xl border text-center transition-all ${
											isSelected
												? "border-primary bg-primary/5 ring-1 ring-primary"
												: "border-border hover:border-primary/50 hover:bg-muted/50"
										}`}
									>
										<Icon className="mb-2 size-8 mx-auto text-muted-foreground" />
										<p className="text-sm font-medium">{provider.label}</p>
									</button>
								);
							})}
						</div>

						<div className="mt-6 flex justify-end">
							<Button
								variant="primary"
								disabled={!selectedProvider}
								onClick={handleContinueToConfigure}
							>
								{t("common.continue")}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Step 2: Configure */}
			{step === 2 && (
				<Card>
					<CardHeader>
						<CardTitle>
							{t("scim.wizard.configure", {
								provider:
									PROVIDERS.find((p) => p.id === selectedProvider)?.label ??
									selectedProvider,
							})}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* SCIM Base URL */}
						<div className="space-y-2">
							<p className="text-sm font-medium">{t("scim.endpoint.baseUrl")}</p>
							<div className="p-3 font-mono text-xs rounded-lg bg-muted break-all">
								{scimBaseUrl}
							</div>
						</div>

						{/* Bearer Token */}
						<div className="space-y-2">
							<p className="text-sm font-medium">{t("scim.endpoint.bearerToken")}</p>
							<div className="p-3 font-mono text-xs rounded-lg bg-muted break-all">
								{bearerToken ?? "Generating..."}
							</div>
							<p className="text-xs text-warning">{t("scim.wizard.tokenWarning")}</p>
						</div>

						{/* Supported features */}
						<div className="space-y-2">
							<p className="text-sm font-medium">
								{t("scim.wizard.supportedFeatures")}
							</p>
							<div className="gap-2 flex flex-wrap">
								<Badge status="success">{t("scim.wizard.featureUsers")}</Badge>
								<Badge status="success">{t("scim.wizard.featureGroups")}</Badge>
								<Badge status="info">{t("scim.wizard.featurePush")}</Badge>
								<Badge status="info">{t("scim.wizard.featureAuth")}</Badge>
							</div>
						</div>

						{/* Provider-specific instructions placeholder */}
						<div className="p-3 text-sm rounded-lg bg-muted text-muted-foreground">
							<p className="font-medium mb-1">{t("scim.wizard.instructions")}</p>
							<p>{t("scim.wizard.instructionsText")}</p>
						</div>

						<div className="flex justify-between">
							<Button variant="ghost" onClick={() => setStep(1)}>
								{t("common.back")}
							</Button>
							<div className="gap-2 flex">
								<Button variant="outline" onClick={handleSkipAndSave}>
									{t("scim.wizard.skipAndSave")}
								</Button>
								<Button
									variant="primary"
									onClick={() => {
										setStep(3);
										handleTestConnection();
									}}
								>
									{t("scim.wizard.testConnection")}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Step 3: Test & Complete */}
			{step === 3 && (
				<Card>
					<CardHeader>
						<CardTitle>{t("scim.wizard.testConnection")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{testResult === "loading" && <TestProgress />}
						{testResult === "success" && <TestSuccess />}
						{testResult === "failure" && <TestFailure detail={testDetail} />}

						{testResult !== "loading" && (
							<div className="flex justify-between">
								<Button variant="ghost" onClick={() => setStep(2)}>
									{t("common.back")}
								</Button>
								<div className="gap-2 flex">
									{testResult === "failure" && (
										<Button
											variant="outline"
											onClick={handleTestConnection}
											disabled={isTesting}
										>
											{t("common.retry")}
										</Button>
									)}
									<Button variant="primary" onClick={handleComplete}>
										{t("scim.wizard.complete")}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
