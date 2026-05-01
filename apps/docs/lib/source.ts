import { defineI18n } from "fumadocs-core/i18n";
import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docs } from "fumadocs-mdx:collections/server";

export const i18nConfig = defineI18n({
	languages: ["en", "de", "es", "fr", "ru"],
	defaultLanguage: "en",
	parser: "dir",
	hideLocale: "default-locale",
});

export const source = loader({
	baseUrl: "/",
	source: docs.toFumadocsSource(),
	plugins: [lucideIconsPlugin()],
	i18n: i18nConfig,
});

export function getPageImage(page: InferPageType<typeof source>) {
	const segments = [...page.slugs, "image.png"];

	return {
		segments,
		url: `/og/${segments.join("/")}`,
	};
}

export async function getLLMText(page: InferPageType<typeof source>) {
	const processed = await page.data.getText("processed");

	return `# ${page.data.title}

${processed}`;
}
