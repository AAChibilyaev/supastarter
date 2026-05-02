/**
 * Helper to render JSON-LD script tags in RSC without client hooks.
 * Returns a React <script> element with type="application/ld+json".
 */

export function jsonLd(id: string, data: Record<string, unknown>): React.ReactElement {
	return (
		<script
			key={id}
			id={id}
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	);
}
