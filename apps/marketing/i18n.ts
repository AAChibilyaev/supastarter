import { config as i18nConfig } from "@repo/i18n";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { getMessagesForLocale } from "./modules/i18n/lib/messages";
import { routing } from "./modules/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
	let locale = await requestLocale;

	if (!locale) {
		const cookieStore = await cookies();
		const localeCookie = cookieStore.get(i18nConfig.localeCookieName);
		locale = localeCookie?.value ?? i18nConfig.defaultLocale;
	}

	if (!routing.locales.includes(locale)) {
		locale = routing.defaultLocale;
	}

	return {
		locale,
		messages: await getMessagesForLocale(locale),
	};
});
