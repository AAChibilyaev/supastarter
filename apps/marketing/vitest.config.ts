import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		exclude: ["**/node_modules/**", "**/tests/**", "**/.next/**"],
	},
	resolve: {
		alias: {
			"@config": path.resolve(import.meta.dirname, "./config"),
			"@analytics": path.resolve(import.meta.dirname, "./modules/analytics"),
			"@home": path.resolve(import.meta.dirname, "./modules/home"),
			"@blog": path.resolve(import.meta.dirname, "./modules/blog"),
			"@i18n": path.resolve(import.meta.dirname, "./modules/i18n"),
			"@changelog": path.resolve(import.meta.dirname, "./modules/changelog"),
			"@legal": path.resolve(import.meta.dirname, "./modules/legal"),
			"@shared": path.resolve(import.meta.dirname, "./modules/shared"),
			"content-collections": path.resolve(
				import.meta.dirname,
				"./.content-collections/generated",
			),
		},
	},
});
