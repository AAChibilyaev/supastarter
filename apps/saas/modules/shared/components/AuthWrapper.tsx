import { config } from "@config";
import { cn, Logo } from "@repo/ui";
import type { PropsWithChildren } from "react";

import { ColorModeToggle } from "./ColorModeToggle";
import { Footer } from "./Footer";
import { LocaleSwitch } from "./LocaleSwitch";

export function AuthWrapper({
	children,
	contentClass,
}: PropsWithChildren<{ contentClass?: string }>) {
	return (
		<div className="py-6 flex min-h-screen w-full">
			<div className="gap-8 flex w-full flex-col items-center justify-between">
				<div className="container">
					<div className="flex items-center justify-between">
						<a href={config.marketingUrl ?? "/"} className="block">
							<Logo />
						</a>

						<div className="gap-2 flex items-center justify-end">
							<LocaleSwitch />
							<ColorModeToggle />
						</div>
					</div>
				</div>

				<div className="container flex justify-center">
					<main
						className={cn(
							"max-w-md p-6 lg:p-8 w-full rounded-3xl border bg-card",
							contentClass,
						)}
					>
						{children}
					</main>
				</div>

				<Footer />
			</div>
		</div>
	);
}
