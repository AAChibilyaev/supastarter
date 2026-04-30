/**
 * Example: querying the public search endpoint with a SaaS API key.
 *
 *   pnpm tsx packages/search/examples/search-products.ts <apiKey> [query]
 */
async function main() {
	const apiKey = process.argv[2];
	const q = process.argv[3] ?? "*";
	if (!apiKey) {
		throw new Error("Usage: search-products.ts <apiKey> [query]");
	}

	const baseUrl = process.env.NEXT_PUBLIC_SAAS_URL ?? "http://localhost:3000";
	const response = await fetch(`${baseUrl}/api/search/public/products`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			q,
			queryBy: "title,description",
			perPage: 10,
		}),
	});

	console.log(response.status, await response.json());
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
