import { jsonLd } from "../json-ld";

interface BlogPostingSchemaProps {
	/** Blog post title */
	headline: string;
	/** Publication date (ISO 8601) */
	datePublished: string;
	/** Last modified date (ISO 8601) */
	dateModified?: string;
	/** Author name */
	authorName?: string;
	/** Blog post description / excerpt */
	description?: string;
	/** Post URL (absolute) */
	url: string;
	/** Featured image URL */
	imageUrl?: string;
}

/**
 * BlogPosting schema.org JSON-LD.
 * Use on each blog post page.
 */
export function BlogPostingSchema({
	headline,
	datePublished,
	dateModified,
	authorName = "AACsearch Team",
	description,
	url,
	imageUrl,
}: BlogPostingSchemaProps) {
	const data: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"@id": `${url}#blogposting`,
		headline,
		datePublished,
		dateModified: dateModified ?? datePublished,
		author: {
			"@type": "Person",
			name: authorName,
		},
		publisher: {
			"@type": "Organization",
			"@id": "https://aacsearch.com/#organization",
			name: "AACsearch",
		},
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": url,
		},
		url,
	};

	if (description) {
		data.description = description;
	}

	if (imageUrl) {
		data.image = imageUrl;
	}

	return jsonLd("blog-posting-schema", data);
}
