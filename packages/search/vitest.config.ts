import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
	},
	resolve: {
		alias: {
			"server-only": resolve(__dirname, "./test/stubs/server-only.ts"),
		},
	},
});
