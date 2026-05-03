import { AssistantChatPanel } from "@search/components/AssistantChatPanel";
import { AssistantConversationsPanel } from "@search/components/AssistantConversationsPanel";
import { AssistantHistoryPanel } from "@search/components/AssistantHistoryPanel";
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
			<Tabs defaultValue={tab ?? "chat"}>
				<TabsList>
					<TabsTrigger value="chat">{t("assistant.chat.title")}</TabsTrigger>
					<TabsTrigger value="history">{t("assistant.history.title")}</TabsTrigger>
					<TabsTrigger value="analytics">{t("assistant.analytics.title")}</TabsTrigger>
					<TabsTrigger value="settings">{t("assistant.settings.title")}</TabsTrigger>
				</TabsList>
				<TabsContent value="chat" className="mt-6">
					<AssistantChatPanel organizationId={organization.id} />
				</TabsContent>
				<TabsContent value="history" className="mt-6">
					<AssistantHistoryPanel organizationId={organization.id} />
				</TabsContent>
				<TabsContent value="analytics" className="mt-6">
					<AssistantConversationsPanel organizationId={organization.id} />
				</TabsContent>
				<TabsContent value="settings" className="mt-6">
					<AssistantSettingsPanel organizationId={organization.id} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
