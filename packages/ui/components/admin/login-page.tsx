import { Form, required, useLogin, useNotify } from "ra-core";
import { useState } from "react";
import type { SubmitHandler, FieldValues } from "react-hook-form";

import { Notification } from "./notification";
import { TextInput } from "./text-input";
import { Button } from "../button";

/**
 * Login page displayed when authentication is enabled and the user is not authenticated.
 *
 * Automatically shown when an unauthenticated user tries to access a protected route.
 * Handles login via authProvider.login() and displays error notifications on failure.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/loginpage LoginPage documentation}
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/security Security documentation}
 */
export const LoginPage = (props: { redirectTo?: string }) => {
	const { redirectTo } = props;
	const [loading, setLoading] = useState(false);
	const login = useLogin();
	const notify = useNotify();

	const handleSubmit: SubmitHandler<FieldValues> = (values) => {
		setLoading(true);
		login(values, redirectTo)
			.then(() => {
				setLoading(false);
			})
			.catch((error) => {
				setLoading(false);
				notify(
					typeof error === "string"
						? error
						: typeof error === "undefined" || !error.message
							? "ra.auth.sign_in_error"
							: error.message,
					{
						type: "error",
						messageArgs: {
							_:
								typeof error === "string"
									? error
									: error && error.message
										? error.message
										: undefined,
						},
					},
				);
			});
	};

	return (
		<div className="flex min-h-screen">
			<div className="sm:max-w-none lg:grid-cols-2 lg:px-0 relative container grid flex-col items-center justify-center">
				<div className="p-10 text-white lg:flex relative hidden h-full flex-col bg-muted dark:border-r">
					<div className="inset-0 bg-zinc-900 absolute" />
					<div className="text-lg font-medium relative z-20 flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="mr-2 h-6 w-6"
						>
							<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
						</svg>
						Acme Inc
					</div>
					<div className="relative z-20 mt-auto">
						<blockquote className="space-y-2">
							<p className="text-lg">
								&ldquo;Shadcn Admin Kit has allowed us to quickly create and evolve
								a powerful tool that otherwise would have taken months of time and
								effort to develop.&rdquo;
							</p>
							<footer className="text-sm">John Doe</footer>
						</blockquote>
					</div>
				</div>
				<div className="lg:p-8">
					<div className="space-y-6 sm:w-[350px] mx-auto flex w-full flex-col justify-center">
						<div className="space-y-2 flex flex-col text-center">
							<h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
							<p className="text-sm leading-none text-muted-foreground">
								Try janedoe@acme.com / password
							</p>
						</div>
						<Form className="space-y-8" onSubmit={handleSubmit}>
							<TextInput
								label="Email"
								source="email"
								type="email"
								validate={required()}
							/>
							<TextInput
								label="Password"
								source="password"
								type="password"
								validate={required()}
							/>
							<Button type="submit" className="cursor-pointer" disabled={loading}>
								Sign in
							</Button>
						</Form>
					</div>
				</div>
			</div>
			<Notification />
		</div>
	);
};
