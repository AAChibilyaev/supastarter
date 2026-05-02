"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
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
import { KeyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
	useCreateSearchApiKeyMutation,
	useRevokeSearchApiKeyMutation,
	useSearchApiKeysQuery,
} from "../../lib/api";
import { EmptyState } from "../cards/EmptyState";

const formSchema = z.object({
	name: z.string().min(1).max(120),
	scopes: z.array(z.enum(["search", "ingest", "admin"])).min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface SearchApiKeysPanelProps {
	organizationId: string;
	slug: string;
}

export function SearchApiKeysPanel({ organizationId, slug }: SearchApiKeysPanelProps) {
	const t = useTranslations();
	const { data: keys, isLoading } = useSearchApiKeysQuery(organizationId, slug);
	const createMutation = useCreateSearchApiKeyMutation();
	const revokeMutation = useRevokeSearchApiKeyMutation();
	const { confirm } = useConfirmationAlert();
	const [open, setOpen] = useState(false);
	const [revealedKey, setRevealedKey] = useState<string | null>(null);

	const handleRevoke = (keyId: string, keyName: string) => {
		confirm({
			title: t("search.apiKeys.revokeConfirmTitle"),
			message: t("search.apiKeys.revokeConfirmMessage", { name: keyName }),
			destructive: true,
			onConfirm: async () => {
				try {
					await revokeMutation.mutateAsync({ organizationId, keyId });
					toastSuccess(t("search.apiKeys.revoked"));
				} catch (error) {
					toastError(error instanceof Error ? error.message : t("search.apiKeys.error"));
				}
			},
		});
	};

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
		defaultValues: { name: "", scopes: ["search"] },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			const result = await createMutation.mutateAsync({
				organizationId,
				slug,
				name: values.name,
				scopes: values.scopes,
			});
			setRevealedKey(result.rawKey);
			form.reset({ name: "", scopes: ["search"] });
			toastSuccess(t("search.apiKeys.created"));
		} catch (error) {
			toastError(error instanceof Error ? error.message : t("search.apiKeys.error"));
		}
	});

	return (
		<Card className="p-6 space-y-6">
			<div className="sm:flex-row sm:items-center sm:justify-between gap-4 flex flex-col">
				<div>
					<h3 className="text-lg font-semibold">{t("search.apiKeys.title")}</h3>
					<p className="text-sm text-foreground/60">{t("search.apiKeys.description")}</p>
				</div>
				<Dialog
					open={open}
					onOpenChange={(next) => {
						setOpen(next);
						if (!next) setRevealedKey(null);
					}}
				>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm">
							{t("search.apiKeys.create")}
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("search.apiKeys.create")}</DialogTitle>
							<DialogDescription>
								{t("search.apiKeys.createDescription")}
							</DialogDescription>
						</DialogHeader>
						{revealedKey ? (
							<div className="space-y-3">
								<p className="text-sm">{t("search.apiKeys.revealOnce")}</p>
								<code className="p-3 rounded font-mono text-xs block bg-muted break-all">
									{revealedKey}
								</code>
								<DialogFooter>
									<Button
										onClick={() => {
											setRevealedKey(null);
											setOpen(false);
										}}
									>
										{t("search.apiKeys.done")}
									</Button>
								</DialogFooter>
							</div>
						) : (
							<Form {...form}>
								<form onSubmit={onSubmit} className="space-y-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("search.apiKeys.name")}</FormLabel>
												<FormControl>
													<Input
														{...field}
														placeholder={t("search.apiKeys.namePlaceholder")}
													/>
												</FormControl>
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
											{t("search.apiKeys.generate")}
										</Button>
									</DialogFooter>
								</form>
							</Form>
						)}
					</DialogContent>
				</Dialog>
			</div>

			{isLoading ? (
				<div className="text-foreground/60">{t("search.loading")}</div>
			) : !keys || keys.length === 0 ? (
				<EmptyState
					title={t("search.apiKeys.empty")}
					description={t("search.apiKeys.emptyDescription")}
					icon={KeyIcon}
					action={{ label: t("search.apiKeys.create"), href: "#" }}
				/>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("search.apiKeys.tableName")}</TableHead>
							<TableHead>{t("search.apiKeys.tablePrefix")}</TableHead>
							<TableHead>{t("search.apiKeys.tableScopes")}</TableHead>
							<TableHead>{t("search.apiKeys.tableStatus")}</TableHead>
							<TableHead className="text-right">
								{t("search.apiKeys.tableActions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{keys.map((key) => (
							<TableRow key={key.id}>
								<TableCell className="font-medium">{key.name}</TableCell>
								<TableCell className="font-mono text-xs">{key.prefix}…</TableCell>
								<TableCell className="text-xs">{key.scopes.join(", ")}</TableCell>
								<TableCell>
									{key.revokedAt
										? t("search.apiKeys.statusRevoked")
										: t("search.apiKeys.statusActive")}
								</TableCell>
								<TableCell className="text-right">
									{!key.revokedAt && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRevoke(key.id, key.name)}
										>
											{t("search.apiKeys.revoke")}
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</Card>
	);
}
