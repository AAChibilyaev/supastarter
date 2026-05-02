"use client";

import { useSession } from "@auth/hooks/use-session";
import { config } from "@config";
import { authClient } from "@repo/auth/client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	cn,
} from "@repo/ui";
import { UserAvatar } from "@shared/components/UserAvatar";
import { BookIcon, HomeIcon, LogOutIcon, MoreVerticalIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { ColorModeToggle } from "./ColorModeToggle";

export function UserMenu({
	showUserName,
	compressed,
}: {
	showUserName?: boolean;
	/** Square icon-rail trigger (e.g. collapsed sidebar) */
	compressed?: boolean;
}) {
	const t = useTranslations();
	const { user } = useSession();

	const onLogout = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					window.location.href = new URL(
						config.redirectAfterLogout,
						window.location.origin,
					).toString();
				},
			},
		});
	};

	if (!user) {
		return null;
	}

	const { name, email, image } = user;
	const showExpandedRow = Boolean(showUserName) && !compressed;

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"gap-2 flex cursor-pointer items-center rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
						compressed
							? "size-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0 justify-center"
							: "md:w-[100%+1rem] md:px-2 md:py-1.5 md:hover:bg-primary/5 w-full justify-between",
					)}
					aria-label="User menu"
				>
					<span className={cn("gap-2 flex items-center", compressed && "justify-center")}>
						<UserAvatar name={name ?? ""} avatarUrl={image} />
						{showExpandedRow ? (
							<span className="leading-tight text-left">
								<span className="font-medium text-sm">{name}</span>
								<span className="text-xs block opacity-70">{email}</span>
							</span>
						) : null}
					</span>

					{showExpandedRow ? <MoreVerticalIcon className="size-4" /> : null}
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuLabel>
					{name}
					<span className="font-normal text-xs block opacity-70">{email}</span>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				{/* Color mode selection */}
				<DropdownMenuItem
					className="gap-4 flex items-center justify-between hover:bg-transparent focus:bg-transparent"
					onSelect={(e) => e.preventDefault()}
				>
					<span>{t("app.userMenu.colorMode")}</span>
					<ColorModeToggle />
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem asChild>
					<Link href="/settings/general">
						<SettingsIcon className="mr-2 size-4" />
						{t("app.userMenu.accountSettings")}
					</Link>
				</DropdownMenuItem>

				{config.docsUrl && (
					<DropdownMenuItem asChild>
						<a href={config.docsUrl}>
							<BookIcon className="mr-2 size-4" />
							{t("app.userMenu.documentation")}
						</a>
					</DropdownMenuItem>
				)}

				{config.marketingUrl && (
					<DropdownMenuItem asChild>
						<Link href={config.marketingUrl}>
							<HomeIcon className="mr-2 size-4" />
							{t("app.userMenu.home")}
						</Link>
					</DropdownMenuItem>
				)}

				<DropdownMenuItem onClick={onLogout}>
					<LogOutIcon className="mr-2 size-4" />
					{t("app.userMenu.logout")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
