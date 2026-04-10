import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getBaseUrl } from "./base-url";

describe("getBaseUrl (saas)", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.NEXT_PUBLIC_SAAS_URL;
		delete process.env.NEXT_PUBLIC_VERCEL_URL;
		delete process.env.PORT;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns the NEXT_PUBLIC_SAAS_URL when set", () => {
		process.env.NEXT_PUBLIC_SAAS_URL = "https://app.example.com";
		expect(getBaseUrl()).toBe("https://app.example.com");
	});

	it("returns a Vercel URL when NEXT_PUBLIC_VERCEL_URL is set", () => {
		process.env.NEXT_PUBLIC_VERCEL_URL = "my-app.vercel.app";
		expect(getBaseUrl()).toBe("https://my-app.vercel.app");
	});

	it("returns localhost:3000 by default", () => {
		expect(getBaseUrl()).toBe("http://localhost:3000");
	});

	it("uses PORT env when set and no other env vars", () => {
		process.env.PORT = "4000";
		expect(getBaseUrl()).toBe("http://localhost:4000");
	});

	it("prefers NEXT_PUBLIC_SAAS_URL over NEXT_PUBLIC_VERCEL_URL", () => {
		process.env.NEXT_PUBLIC_SAAS_URL = "https://app.example.com";
		process.env.NEXT_PUBLIC_VERCEL_URL = "my-app.vercel.app";
		expect(getBaseUrl()).toBe("https://app.example.com");
	});
});
