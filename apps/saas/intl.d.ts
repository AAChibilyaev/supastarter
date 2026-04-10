import type { SaasMessages } from "@repo/i18n";

declare global {
	interface IntlMessages extends SaasMessages {}
}
