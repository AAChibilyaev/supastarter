import { SITE_CONFIG } from "../config";
import { jsonLd } from "../json-ld";

type Locale = string;

interface OrganizationSchemaProps {
	/** Locale for localized description text */
	locale?: Locale;
}

/**
 * Organization schema.org JSON-LD.
 * Use on all pages — defines the publisher/author entity.
 */
export function OrganizationSchema({ locale = "en" }: OrganizationSchemaProps = {}) {
	const localeKey =
		locale in SITE_CONFIG.description ? (locale as keyof typeof SITE_CONFIG.description) : "en";

	return jsonLd("organization-schema", {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${SITE_CONFIG.url}/#organization`,
		name: SITE_CONFIG.name,
		url: SITE_CONFIG.url,
		logo: `${SITE_CONFIG.url}/logo.png`,
		foundingDate: "2025",
		description: SITE_CONFIG.description[localeKey],
		sameAs: ["https://github.com/AAChibilyaev", "https://x.com/aacsearch"],
	});
}
