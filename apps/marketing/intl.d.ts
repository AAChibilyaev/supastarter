import type { MarketingMessages } from "@repo/i18n";

declare global {
	interface IntlMessages extends MarketingMessages {}
}
