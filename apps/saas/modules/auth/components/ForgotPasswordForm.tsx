"use client";

import { useAuthErrorMessages } from "@auth/hooks/errors-messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { AlertTriangleIcon, ArrowLeftIcon, MailboxIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	email: z.email(),
});

export function ForgotPasswordForm() {
	const t = useTranslations();
	const { getAuthErrorMessage } = useAuthErrorMessages();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			const redirectTo = new URL("/reset-password", window.location.origin).toString();

			const { error } = await authClient.requestPasswordReset({
				email,
				redirectTo,
			});

			if (error) {
				throw error;
			}
		} catch (e) {
			form.setError("root", {
				message: getAuthErrorMessage(
					e && typeof e === "object" && "code" in e ? (e.code as string) : undefined,
				),
			});
		}
	});

	return (
		<div className="gap-6 flex flex-col">
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">{t("auth.forgotPassword.title")}</CardTitle>
					<CardDescription>{t("auth.forgotPassword.message")}</CardDescription>
				</CardHeader>
				<CardContent>
					{form.formState.isSubmitSuccessful ? (
						<Alert variant="success">
							<MailboxIcon />
							<AlertTitle>{t("auth.forgotPassword.hints.linkSent.title")}</AlertTitle>
							<AlertDescription>{t("auth.forgotPassword.hints.linkSent.message")}</AlertDescription>
						</Alert>
					) : (
						<Form {...form}>
							<form className="gap-6 flex flex-col" onSubmit={onSubmit}>
								{form.formState.errors.root && (
									<Alert variant="error">
										<AlertTriangleIcon />
										<AlertTitle>{form.formState.errors.root.message}</AlertTitle>
									</Alert>
								)}

								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("auth.forgotPassword.email")}</FormLabel>
											<FormControl>
												<Input {...field} autoComplete="email" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button loading={form.formState.isSubmitting}>
									{t("auth.forgotPassword.submit")}
								</Button>
							</form>
						</Form>
					)}
				</CardContent>
			</Card>

			<div className="text-sm text-center">
				<Link href="/login" className="underline underline-offset-4 hover:text-primary">
					<ArrowLeftIcon className="mr-1 size-4 inline align-middle" />
					{t("auth.forgotPassword.backToSignin")}
				</Link>
			</div>
		</div>
	);
}
