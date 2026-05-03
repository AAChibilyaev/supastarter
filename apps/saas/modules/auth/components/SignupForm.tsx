"use client";

import { useAuthErrorMessages } from "@auth/hooks/errors-messages";
import { useSession } from "@auth/hooks/use-session";
import { config } from "@config";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrganizationInvitationAlert } from "@organizations/components/OrganizationInvitationAlert";
import { authClient } from "@repo/auth/client";
import { config as authConfig } from "@repo/auth/config";
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
import { passwordSchema } from "@repo/utils";
import { PasswordInput } from "@shared/components/PasswordInput";
import { AlertTriangleIcon, MailboxIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";

import { type OAuthProvider, oAuthProviders } from "../constants/oauth-providers";
import { SocialSigninButton } from "./SocialSigninButton";

const formSchema = z.object({
	email: z.email(),
	name: z.string().min(1),
	password: passwordSchema,
});

export function SignupForm({ prefillEmail }: { prefillEmail?: string }) {
	const t = useTranslations();
	const router = useRouter();
	const { user, loaded: sessionLoaded } = useSession();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();

	const invitationId = searchParams.get("invitationId");
	const email = searchParams.get("email");
	const redirectTo = searchParams.get("redirectTo");

	const form = useForm({
		resolver: zodResolver(formSchema),
		values: {
			name: "",
			email: prefillEmail ?? email ?? "",
			password: "",
		},
	});

	const invitationOnlyMode = !authConfig.enableSignup && invitationId;

	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: (redirectTo ?? config.redirectAfterSignIn);

	useEffect(() => {
		if (sessionLoaded && user) {
			router.replace(redirectPath);
		}
	}, [user, sessionLoaded]); // oxlint-disable-line eslint-plugin-react-hooks/exhaustive-deps

	const onSubmit = form.handleSubmit(async ({ email, password, name }) => {
		try {
			const { error } = await (authConfig.enablePasswordLogin
				? await authClient.signUp.email({
						email,
						password,
						name,
						callbackURL: redirectPath,
					})
				: authClient.signIn.magicLink({
						email,
						name,
						callbackURL: redirectPath,
					}));

			if (error) {
				throw error;
			}

			if (invitationOnlyMode) {
				const { error } = await authClient.organization.acceptInvitation({
					invitationId,
				});

				if (error) {
					throw error;
				}

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
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">{t("auth.signup.title")}</CardTitle>
					<CardDescription>{t("auth.signup.message")}</CardDescription>
				</CardHeader>
				<CardContent>
					{form.formState.isSubmitSuccessful && !invitationOnlyMode ? (
						<Alert variant="success">
							<MailboxIcon />
							<AlertTitle>{t("auth.signup.hints.verifyEmail")}</AlertTitle>
						</Alert>
					) : (
						<>
							{invitationId && <OrganizationInvitationAlert className="mb-6" />}

							<Form {...form}>
								<form className="gap-6 flex flex-col" onSubmit={onSubmit}>
									{form.formState.isSubmitted && form.formState.errors.root && (
										<Alert variant="error">
											<AlertTriangleIcon />
											<AlertDescription>
												{form.formState.errors.root.message}
											</AlertDescription>
										</Alert>
									)}

									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("auth.signup.name")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("auth.signup.email")}</FormLabel>
												<FormControl>
													<Input
														{...field}
														autoComplete="email"
														readOnly={!!prefillEmail}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{authConfig.enablePasswordLogin && (
										<FormField
											control={form.control}
											name="password"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("auth.signup.password")}
													</FormLabel>
													<FormControl>
														<PasswordInput
															autoComplete="new-password"
															showGenerateButton
															showPasswordCriteria
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}

									<Button variant="primary" loading={form.formState.isSubmitting}>
										{t("auth.signup.submit")}
									</Button>
								</form>
							</Form>

							{authConfig.enableSignup && authConfig.enableSocialLogin && (
								<>
									<div className="my-6 text-sm after:inset-0 relative text-center after:absolute after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
										<span className="px-2 relative z-10 bg-card text-muted-foreground">
											{t("auth.login.continueWith")}
										</span>
									</div>

									<div className="gap-2 sm:grid-cols-2 grid grid-cols-1 items-stretch">
										{Object.keys(oAuthProviders).map((providerId) => (
											<SocialSigninButton
												key={providerId}
												provider={providerId as OAuthProvider}
											/>
										))}
									</div>
								</>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<div className="text-sm text-center">
				<span className="text-muted-foreground">
					{t("auth.signup.alreadyHaveAccount")}{" "}
				</span>
				<Link
					href={withQuery("/login", Object.fromEntries(searchParams.entries()))}
					className="underline underline-offset-4 hover:text-primary"
				>
					{t("auth.signup.signIn")}
				</Link>
			</div>
		</div>
	);
}
