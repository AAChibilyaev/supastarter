"use client";
import { type OAuthProvider, oAuthProviders } from "@auth/constants/oauth-providers";
import { useUserAccountsQuery } from "@auth/lib/api";
import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { SettingsItem } from "@shared/components/SettingsItem";
import { CheckCircle2Icon, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function ConnectedAccountsBlock() {
	const t = useTranslations();

	const { data, isPending } = useUserAccountsQuery();

	const isProviderLinked = (provider: OAuthProvider) =>
		data?.some((account) => account.providerId === provider);

	const linkProvider = async (provider: OAuthProvider) => {
		const callbackURL = window.location.href;
		if (!isProviderLinked(provider)) {
			await authClient.linkSocial({
				provider,
				callbackURL,
			});
		}
	};

	return (
		<SettingsItem title={t("settings.account.security.connectedAccounts.title")}>
			<div className="gap-2 grid grid-cols-1">
				{Object.entries(oAuthProviders).map(([provider, providerData]) => {
					const isLinked = isProviderLinked(provider as OAuthProvider);

					return (
						<div
							key={provider}
							className="gap-2 p-4 flex items-center justify-between rounded-2xl border"
						>
							<div className="gap-2 flex items-center">
								<providerData.icon className="size-4 text-primary/50" />
								<span className="text-sm">{providerData.name}</span>
							</div>
							{isPending ? (
								<Skeleton className="h-10 w-28" />
							) : isLinked ? (
								<Button variant="secondary" disabled className="cursor-default">
									<CheckCircle2Icon className="mr-1.5 size-4 text-success" />
									<span>
										{t("settings.account.security.connectedAccounts.connected")}
									</span>
								</Button>
							) : (
								<Button
									variant="secondary"
									onClick={() => linkProvider(provider as OAuthProvider)}
								>
									<LinkIcon className="mr-1.5 size-4" />
									<span>
										{t("settings.account.security.connectedAccounts.connect")}
									</span>
								</Button>
							)}
						</div>
					);
				})}
			</div>
		</SettingsItem>
	);
}
