import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";

export default createI18nMiddleware({
	languages: ["en", "de", "es", "fr", "ru"],
	defaultLanguage: "en",
	hideLocale: "default-locale",
});

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|og|icon\\.png).*)"],
};
