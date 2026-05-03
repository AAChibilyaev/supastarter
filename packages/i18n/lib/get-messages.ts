import { toMerged } from "es-toolkit";

import { config, type Locale } from "../config";

export type TranslationScope = "marketing" | "saas" | "mail";

const SAAS_FILES = [
	"search",
	"settings",
	"admin",
	"ai",
	"organizations",
	"auth",
	"onboarding",
	"product",
	"common",
	"feedback",
] as const;
const MARKETING_FILES = ["core", "compare", "features", "integrations", "solutions"] as const;

async function importLocaleMessages<T>(
	locale: Locale,
	scope: TranslationScope | "shared",
): Promise<T> {
	return (await import(`../translations/${locale}/${scope}.json`)).default as T;
}

async function loadSplitMessages(
	locale: Locale,
	scope: "saas" | "marketing",
): Promise<Record<string, unknown>> {
	const files = scope === "saas" ? SAAS_FILES : MARKETING_FILES;
	const chunks = await Promise.all(
		files.map((file) =>
			import(`../translations/${locale}/${scope}/${file}.json`).then(
				(m) => m.default as Record<string, unknown>,
			),
		),
	);
	return Object.assign({}, ...chunks) as Record<string, unknown>;
}

export async function getMessagesForLocale<T = Record<string, unknown>>(
	locale: Locale,
	scope: TranslationScope,
): Promise<T> {
	const sharedMessages = await importLocaleMessages<Record<string, unknown>>(locale, "shared");

	let localeRaw: Record<string, unknown>;
	if (scope === "saas" || scope === "marketing") {
		localeRaw = await loadSplitMessages(locale, scope);
	} else {
		localeRaw = await importLocaleMessages<Record<string, unknown>>(locale, scope);
	}

	let messages = toMerged(localeRaw, sharedMessages) as T;

	if (locale !== config.defaultLocale) {
		let defaultRaw: Record<string, unknown>;
		if (scope === "saas" || scope === "marketing") {
			defaultRaw = await loadSplitMessages(config.defaultLocale, scope);
		} else {
			defaultRaw = await importLocaleMessages<Record<string, unknown>>(
				config.defaultLocale,
				scope,
			);
		}
		const defaultSharedMessages = await importLocaleMessages<Record<string, unknown>>(
			config.defaultLocale,
			"shared",
		);
		const defaultMessages = toMerged(defaultRaw, defaultSharedMessages);
		messages = toMerged(defaultMessages, messages as Record<string, unknown>) as T;
	}

	return messages;
}
