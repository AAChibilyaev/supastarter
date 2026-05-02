import { SITE_CONFIG } from "../config";
import { jsonLd } from "../json-ld";

type Locale = string;

interface WebSiteSchemaProps {
	/** Locale for localized description text */
	locale?: Locale;
}

/**
 * WebSite schema.org JSON-LD with Sitelinks Search Box.
 * Use on all pages — defines site-level search action.
 */
export function WebSiteSchema({ locale = "en" }: WebSiteSchemaProps = {}) {
	const localeKey =
		locale in SITE_CONFIG.description ? (locale as keyof typeof SITE_CONFIG.description) : "en";

	return jsonLd("website-schema", {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE_CONFIG.url}/#website`,
		name: SITE_CONFIG.name,
		url: SITE_CONFIG.url,
		description: SITE_CONFIG.description[localeKey],
		publisher: {
			"@id": `${SITE_CONFIG.url}/#organization`,
		},
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${SITE_CONFIG.url}/?q={search_term_string}`,
			},
			"query-input": "required name=search_term_string",
		},
	});
}
