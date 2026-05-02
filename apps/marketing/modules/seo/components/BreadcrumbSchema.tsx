import { jsonLd } from "../json-ld";

interface BreadcrumbItem {
	name: string;
	url: string;
}

interface BreadcrumbSchemaProps {
	/** Ordered list of breadcrumb items — home to current page */
	items: BreadcrumbItem[];
	/** Base URL of the site */
	baseUrl?: string;
}

/**
 * BreadcrumbList schema.org JSON-LD.
 * Use on all content pages, blog posts, and comparison pages.
 */
export function BreadcrumbSchema({
	items,
	baseUrl = "https://aacsearch.com",
}: BreadcrumbSchemaProps) {
	const data = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"@id": `${baseUrl}/#breadcrumb`,
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
		})),
	};

	return jsonLd("breadcrumb-schema", data);
}
