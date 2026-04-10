import { render } from "@react-email/render";

import type { Locale } from "../config";
import { mailTemplates } from "../emails";
import { getMessagesForLocale } from "./i18n";

export async function getTemplate<T extends TemplateId>({
	templateId,
	context,
	locale,
}: {
	templateId: T;
	context: Omit<Parameters<(typeof mailTemplates)[T]>[0], "locale" | "translations">;
	locale: Locale;
}) {
	const template = mailTemplates[templateId];
	const translations = await getMessagesForLocale(locale);

	const email = template({
		...(context as any),
		locale,
		translations,
	});

	const templateMessages = translations as Record<string, { subject?: string }>;
	let subject = templateMessages[templateId]?.subject ?? "";

	if (templateId === "notification") {
		const ctx = context as { title?: string };
		if (typeof ctx.title === "string" && ctx.title.length > 0) {
			subject = ctx.title;
		}
	}

	const html = await render(email);
	const text = await render(email, { plainText: true });
	return { html, text, subject };
}

export type TemplateId = keyof typeof mailTemplates;
