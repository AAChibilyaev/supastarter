"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WebhookIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "../cards/EmptyState";

const WEBHOOK_EVENTS = [
	"index.created",
	"index.deleted",
	"ingest.completed",
	"reindex.completed",
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const formSchema = z.object({
	url: z.string().url(),
	events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface WebhooksPanelProps {
	organizationId: string;
}

export function WebhooksPanel({ organizationId }: WebhooksPanelProps) {
	const tSearch = useTranslations("search");
	const t = useTranslations("search.webhooks");
	const queryClient = useQueryClient();
	const { confirm } = useConfirmationAlert();
	const [open, setOpen] = useState(false);

	const { data: webhooks, isLoading } = useQuery(
		orpc.search.webhooks.list.queryOptions({
			input: { organizationId },
			enabled: !!organizationId,
		}),
	);

	const createMutation = useMutation({
		...orpc.search.webhooks.create.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: orpc.search.webhooks.list.key(),
			});
		},
	});

	const deleteMutation = useMutation({
		...orpc.search.webhooks.delete.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: orpc.search.webhooks.list.key(),
			});
		},
	});

	const form = useForm<FormValues>({
		resolver: (values) => {
			const parsed = formSchema.safeParse(values);
			if (parsed.success) {
				return { values: parsed.data, errors: {} };
			}
			const errors: Record<string, { type: string; message: string }> = {};
			for (const issue of parsed.error.issues) {
				errors[issue.path.join(".") || "root"] = {
					type: "validation",
					message: issue.message,
				};
			}
			return { values: {}, errors };
		},
		defaultValues: { url: "", events: [] },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			await createMutation.mutateAsync({
				organizationId,
				url: values.url,
				events: values.events,
			});
			form.reset({ url: "", events: [] });
			setOpen(false);
			toastSuccess(t("created"));
		} catch (error) {
			toastError(error instanceof Error ? error.message : t("error"));
		}
	});

	const handleDelete = (webhookId: string) => {
		confirm({
			title: t("deleteConfirm"),
			message: t("deleteConfirmMessage"),
			destructive: true,
			onConfirm: async () => {
				try {
					await deleteMutation.mutateAsync({ organizationId, webhookId });
					toastSuccess(t("deleted"));
				} catch (error) {
					toastError(error instanceof Error ? error.message : t("error"));
				}
			},
		});
	};

	const formatDate = (iso: string) => {
		try {
			return new Date(iso).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return iso;
		}
	};

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("title")}</h3>
					<p className="text-sm text-foreground/60">{t("description")}</p>
				</div>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm">
							{t("addWebhook")}
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("createTitle")}</DialogTitle>
							<DialogDescription>{t("createDescription")}</DialogDescription>
						</DialogHeader>
						<Form {...form}>
							<form onSubmit={onSubmit} className="space-y-4">
								<FormField
									control={form.control}
									name="url"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("urlLabel")}</FormLabel>
											<FormControl>
												<Input {...field} placeholder={t("urlPlaceholder")} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="events"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("eventsLabel")}</FormLabel>
											<div className="space-y-2">
												{WEBHOOK_EVENTS.map((event) => (
													<div key={event} className="flex items-center gap-2">
														<Checkbox
															id={event}
															checked={field.value.includes(event as WebhookEvent)}
															onCheckedChange={(checked) => {
																const next = checked
																	? [...field.value, event as WebhookEvent]
																	: field.value.filter((e) => e !== event);
																field.onChange(next);
															}}
														/>
														<label
															htmlFor={event}
															className="text-sm font-mono cursor-pointer"
														>
															{event}
														</label>
													</div>
												))}
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<DialogFooter>
									<Button
										type="submit"
										variant="outline"
										size="sm"
										loading={form.formState.isSubmitting}
									>
										{t("saveAction")}
									</Button>
								</DialogFooter>
							</form>
						</Form>
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="text-foreground/60">{tSearch("loading")}</div>
			) : !webhooks || webhooks.length === 0 ? (
				<EmptyState
					title={t("emptyState")}
					description={t("emptyDescription")}
					icon={WebhookIcon}
					action={{ label: t("addWebhook"), href: "#" }}
				/>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("tableUrl")}</TableHead>
							<TableHead>{t("tableEvents")}</TableHead>
							<TableHead>{t("tableStatus")}</TableHead>
							<TableHead>{t("tableCreated")}</TableHead>
							<TableHead className="text-right">{t("tableActions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{webhooks.map((wh) => (
							<TableRow key={wh.id}>
								<TableCell className="font-mono text-xs max-w-[200px] truncate">
									{wh.url}
								</TableCell>
								<TableCell className="text-xs">
									<div className="flex flex-wrap gap-1">
										{wh.events.map((event) => (
											<Badge key={event} status="info" className="text-xs normal-case">
												{event}
											</Badge>
										))}
									</div>
								</TableCell>
								<TableCell>
									<Badge status="success">{t("statusActive")}</Badge>
								</TableCell>
								<TableCell className="text-sm text-foreground/60">
									{formatDate(wh.createdAt)}
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(wh.id)}
									>
										{t("deleteAction")}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</Card>
	);
}
