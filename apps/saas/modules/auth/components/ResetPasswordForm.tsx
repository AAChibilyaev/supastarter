"use client";

import { useAuthErrorMessages } from "@auth/hooks/errors-messages";
import { useSession } from "@auth/hooks/use-session";
import { config } from "@config";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { Alert, AlertTitle } from "@repo/ui/components/alert";
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
import { passwordSchema } from "@repo/utils";
import { PasswordInput } from "@shared/components/PasswordInput";
import { useRouter } from "@shared/hooks/router";
import { AlertTriangleIcon, ArrowLeftIcon, MailboxIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	password: passwordSchema,
});

export function ResetPasswordForm() {
	const t = useTranslations();
	const { user } = useSession();
	const router = useRouter();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ password }) => {
		try {
			const { error } = await authClient.resetPassword({
				token: token ?? undefined,
				newPassword: password,
			});

			if (error) {
				throw error;
			}

			if (user) {
				router.push(config.redirectAfterSignIn);
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
					<CardTitle className="text-2xl">{t("auth.resetPassword.title")}</CardTitle>
					<CardDescription>{t("auth.resetPassword.message")}</CardDescription>
				</CardHeader>
				<CardContent>
					{form.formState.isSubmitSuccessful ? (
						<Alert variant="success">
							<MailboxIcon />
							<AlertTitle>{t("auth.resetPassword.hints.success")}</AlertTitle>
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
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("auth.resetPassword.newPassword")}</FormLabel>
											<FormControl>
												<PasswordInput
													autoComplete="new-password"
													showPasswordCriteria
													showGenerateButton
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button loading={form.formState.isSubmitting}>
									{t("auth.resetPassword.submit")}
								</Button>
							</form>
						</Form>
					)}
				</CardContent>
			</Card>

			<div className="text-sm text-center">
				<Link href="/login" className="underline underline-offset-4 hover:text-primary">
					<ArrowLeftIcon className="mr-1 size-4 inline align-middle" />
					{t("auth.resetPassword.backToSignin")}
				</Link>
			</div>
		</div>
	);
}
