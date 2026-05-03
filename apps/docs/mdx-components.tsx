import { createAPIPage } from "fumadocs-openapi/ui";
import { createOpenAPI } from "fumadocs-openapi/server";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

/**
 * OpenAPI server that resolves the AACsearch v1 spec.
 * Used by <APIPage> in generated API reference MDX pages.
 * The spec is loaded lazily at render time via async import.
 */
const openapi = createOpenAPI({
	input: async () => {
		const spec = await import("../../packages/api/v1/openapi").then(
			(m) => m.generateOpenApiSpec(),
		);
		return { "aacsearch-api-v1": spec as never };
	},
});

const APIPage = createAPIPage(openapi);

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		APIPage,
		...components,
	};
}
