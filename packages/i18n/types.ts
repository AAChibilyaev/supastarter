import type mailMessages from "./translations/en/mail.json";
import type sharedMessages from "./translations/en/shared.json";

// saas split
import type saasAdmin from "./translations/en/saas/admin.json";
import type saasAuth from "./translations/en/saas/auth.json";
import type saasCommon from "./translations/en/saas/common.json";
import type saasOnboarding from "./translations/en/saas/onboarding.json";
import type saasOrganizations from "./translations/en/saas/organizations.json";
import type saasProduct from "./translations/en/saas/product.json";
import type saasSearch from "./translations/en/saas/search.json";
import type saasSettings from "./translations/en/saas/settings.json";

// marketing split
import type marketingCompare from "./translations/en/marketing/compare.json";
import type marketingCore from "./translations/en/marketing/core.json";
import type marketingFeatures from "./translations/en/marketing/features.json";
import type marketingIntegrations from "./translations/en/marketing/integrations.json";
import type marketingSolutions from "./translations/en/marketing/solutions.json";

export interface LocaleDefinition {
	/**
	 * Human-readable locale name displayed in language selectors and settings UIs.
	 */
	label: string;
	/**
	 * ISO currency code used for locale-specific pricing defaults.
	 */
	currency: string;
}

export interface I18nConfig {
	/**
	 * Supported locales keyed by locale code. Each entry controls how the locale
	 * appears in selectors and which default currency is paired with it.
	 */
	locales: Record<string, LocaleDefinition>;
	/**
	 * Locale used when no locale segment, cookie, or explicit preference is
	 * available.
	 */
	defaultLocale: string;
	/**
	 * Fallback currency used when a locale-specific currency cannot be resolved.
	 */
	defaultCurrency: string;
	/**
	 * Cookie name that stores the user's preferred locale between requests.
	 */
	localeCookieName: string;
}

type AllSaasMessages = typeof saasSearch &
	typeof saasSettings &
	typeof saasAdmin &
	typeof saasOrganizations &
	typeof saasAuth &
	typeof saasOnboarding &
	typeof saasProduct &
	typeof saasCommon;

type AllMarketingMessages = typeof marketingCore &
	typeof marketingCompare &
	typeof marketingFeatures &
	typeof marketingIntegrations &
	typeof marketingSolutions;

export type SharedMessages = typeof sharedMessages;
export type SaasMessages = AllSaasMessages & SharedMessages;
export type MarketingMessages = AllMarketingMessages & SharedMessages;
export type MailMessages = typeof mailMessages;
