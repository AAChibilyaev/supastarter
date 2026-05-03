import { AssistantConversationsPanel } from "@search/components/AssistantConversationsPanel";
import { AssistantSettingsPanel } from "@search/components/AssistantSettingsPanel";
import {
	getSearchOrganizationMetadataTitle,
	getSearchOrganizationRouteContext,
} from "@search/lib/server";
import { PageHeader } from "@shared/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
	const { organizationSlug } = await params;
	return {
		title: await getSearchOrganizationMetadataTitle(organizationSlug, "assistant.page.title"),
	};
}

export default async function AssistantPage({
	params,
	searchParams,
}: {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const { organizationSlug } = await params;
	const { tab } = await searchParams;
	const [{ organization }, t] = await Promise.all([
		getSearchOrganizationRouteContext(organizationSlug),
		getTranslations("search"),
	]);

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title={t("assistant.page.title")}
				subtitle={t("assistant.page.description")}
				className="mb-0"
			/>
			<Tabs defaultValue={tab ?? "settings"}>
				<TabsList>
					<TabsTrigger value="settings">{t("assistant.settings.title")}</TabsTrigger>
					<TabsTrigger value="analytics">{t("assistant.analytics.title")}</TabsTrigger>
				</TabsList>
				<TabsContent value="settings" className="mt-6">
					<AssistantSettingsPanel organizationId={organization.id} />
				</TabsContent>
				<TabsContent value="analytics" className="mt-6">
					<AssistantConversationsPanel organizationId={organization.id} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
