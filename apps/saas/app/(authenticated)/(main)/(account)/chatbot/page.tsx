import { AiChat } from "@ai/components/AiChat";
import { PageHeader } from "@shared/components/PageHeader";
import { getTranslations } from "next-intl/server";

export default async function AiDemoPage() {
	const t = await getTranslations("ai.chat");

	return (
		<>
			<PageHeader
				title={t("title")}
				subtitle={t("subtitle") ?? "AI-powered assistant"}
				className="max-w-3xl mx-auto"
			/>

			<AiChat />
		</>
	);
}
