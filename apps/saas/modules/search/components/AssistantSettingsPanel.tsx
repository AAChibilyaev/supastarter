"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { Switch } from "@repo/ui/components/switch";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface Props {
	organizationId: string;
}

interface FormValues {
	enabled: boolean;
	assistantName: string;
	escalationWebhookUrl: string;
	escalationEmailTo: string;
	workingHoursStart: number;
	workingHoursEnd: number;
	omsBaseUrl: string;
	omsApiKey: string;
	loyaltyBaseUrl: string;
	loyaltyApiKey: string;
}

export function AssistantSettingsPanel({ organizationId }: Props) {
	const t = useTranslations("search.assistant.settings");
	const queryClient = useQueryClient();

	const { data: config, isLoading } = useQuery(
		orpc.assistant.getConfig.queryOptions({ input: { organizationId } }),
	);

	const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
		defaultValues: {
			enabled: false,
			assistantName: "",
			escalationWebhookUrl: "",
			escalationEmailTo: "",
			workingHoursStart: 9,
			workingHoursEnd: 21,
			omsBaseUrl: "",
			omsApiKey: "",
			loyaltyBaseUrl: "",
			loyaltyApiKey: "",
		},
	});

	useEffect(() => {
		if (config) {
			reset({
				enabled: config.enabled,
				assistantName: config.assistantName ?? "",
				escalationWebhookUrl: config.escalationWebhookUrl ?? "",
				escalationEmailTo: config.escalationEmailTo ?? "",
				workingHoursStart: config.workingHoursStart ?? 9,
				workingHoursEnd: config.workingHoursEnd ?? 21,
				omsBaseUrl: config.omsBaseUrl ?? "",
				omsApiKey: config.omsApiKey ?? "",
				loyaltyBaseUrl: config.loyaltyBaseUrl ?? "",
				loyaltyApiKey: config.loyaltyApiKey ?? "",
			});
		}
	}, [config, reset]);

	const saveMutation = useMutation({
		...orpc.assistant.saveConfig.mutationOptions(),
		onSuccess: () => {
			toast.success(t("saveSuccess"));
			void queryClient.invalidateQueries({ queryKey: orpc.assistant.getConfig.key() });
		},
		onError: () => {
			toast.error("Failed to save settings");
		},
	});

	const onSubmit = handleSubmit((values) => {
		saveMutation.mutate({
			organizationId,
			config: {
				enabled: values.enabled,
				assistantName: values.assistantName || undefined,
				escalationWebhookUrl: values.escalationWebhookUrl || undefined,
				escalationEmailTo: values.escalationEmailTo || undefined,
				workingHoursStart: Number(values.workingHoursStart),
				workingHoursEnd: Number(values.workingHoursEnd),
				omsBaseUrl: values.omsBaseUrl || undefined,
				omsApiKey: values.omsApiKey || undefined,
				loyaltyBaseUrl: values.loyaltyBaseUrl || undefined,
				loyaltyApiKey: values.loyaltyApiKey || undefined,
			},
		});
	});

	const enabled = watch("enabled");

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="h-40 animate-pulse rounded bg-muted" />
				</CardContent>
			</Card>
		);
	}

	return (
		<form onSubmit={onSubmit} className="space-y-6">
			{/* Enable toggle */}
			<Card>
				<CardHeader>
					<CardTitle>{t("title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Label htmlFor="enabled">{t("enableChat")}</Label>
							<p className="text-sm text-muted-foreground">{t("enableChatDescription")}</p>
						</div>
						<Switch
							id="enabled"
							checked={enabled}
							onCheckedChange={(checked) => setValue("enabled", checked)}
						/>
					</div>

					{enabled && (
						<>
							<Separator />
							<div className="space-y-2">
								<Label htmlFor="assistantName">{t("assistantName")}</Label>
								<Input
									id="assistantName"
									placeholder={t("assistantNamePlaceholder")}
									{...register("assistantName")}
								/>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Escalation settings */}
			{enabled && (
				<Card>
					<CardHeader>
						<CardTitle>{t("escalation")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="escalationWebhookUrl">{t("webhookUrl")}</Label>
							<Input
								id="escalationWebhookUrl"
								type="url"
								placeholder="https://yourapp.com/api/escalation-webhook"
								{...register("escalationWebhookUrl")}
							/>
							<p className="text-xs text-muted-foreground">{t("webhookUrlDescription")}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="escalationEmailTo">{t("emailTo")}</Label>
							<Input
								id="escalationEmailTo"
								type="email"
								placeholder="support@yourstore.com"
								{...register("escalationEmailTo")}
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("workingHours")}</Label>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<Label htmlFor="workingHoursStart" className="text-xs text-muted-foreground">
										{t("workingHoursStart")}
									</Label>
									<Input
										id="workingHoursStart"
										type="number"
										min={0}
										max={23}
										{...register("workingHoursStart", { valueAsNumber: true })}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="workingHoursEnd" className="text-xs text-muted-foreground">
										{t("workingHoursEnd")}
									</Label>
									<Input
										id="workingHoursEnd"
										type="number"
										min={0}
										max={23}
										{...register("workingHoursEnd", { valueAsNumber: true })}
									/>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* External connectors */}
			{enabled && (
				<Card>
					<CardHeader>
						<CardTitle>{t("connectors")}</CardTitle>
						<CardDescription>{t("connectorsDescription")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="omsBaseUrl">{t("omsUrl")}</Label>
								<Input
									id="omsBaseUrl"
									type="url"
									placeholder="https://oms.yourstore.com"
									{...register("omsBaseUrl")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="omsApiKey">{t("omsKey")}</Label>
								<Input
									id="omsApiKey"
									type="password"
									placeholder="••••••••"
									{...register("omsApiKey")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="loyaltyBaseUrl">{t("loyaltyUrl")}</Label>
								<Input
									id="loyaltyBaseUrl"
									type="url"
									placeholder="https://loyalty.yourstore.com"
									{...register("loyaltyBaseUrl")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="loyaltyApiKey">{t("loyaltyKey")}</Label>
								<Input
									id="loyaltyApiKey"
									type="password"
									placeholder="••••••••"
									{...register("loyaltyApiKey")}
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="flex justify-end">
				<Button type="submit" loading={saveMutation.isPending}>
					{t("save")}
				</Button>
			</div>
		</form>
	);
}
