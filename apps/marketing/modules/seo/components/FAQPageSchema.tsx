import { jsonLd } from "../json-ld";

interface FAQItem {
	question: string;
	answer: string;
}

interface FAQPageSchemaProps {
	/** Ordered list of FAQ items — question + answer pairs */
	items: FAQItem[];
	/** Optional @id override */
	id?: string;
}

/**
 * FAQPage schema.org JSON-LD.
 * Use on FAQ page, pricing page, and comparison pages.
 */
export function FAQPageSchema({ items, id = "/#faq" }: FAQPageSchemaProps) {
	const data = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		"@id": `https://aacsearch.com${id}`,
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};

	return jsonLd("faq-schema", data);
}
