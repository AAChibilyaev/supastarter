import { jsonLd } from "../json-ld";

interface ComparisonPageSchemaProps {
	/** The name of the product being compared against (e.g. "Algolia") */
	productName: string;
	/** Optional @id override */
	id?: string;
}

/**
 * ComparisonPage schema.org JSON-LD.
 * Use on comparison pages (e.g. /vs/algolia, /vs/typesense).
 * Renders as a WebPage with the compared products referenced via mainEntity.
 */
export function ComparisonPageSchema({
	productName,
	id = "/#comparison",
}: ComparisonPageSchemaProps) {
	const data = {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `https://aacsearch.com${id}`,
		name: `AACsearch vs ${productName}`,
		mainEntity: [
			{
				"@type": "SoftwareApplication",
				name: "AACsearch",
			},
			{
				"@type": "SoftwareApplication",
				name: productName,
			},
		],
	};

	return jsonLd("comparison-page-schema", data);
}
