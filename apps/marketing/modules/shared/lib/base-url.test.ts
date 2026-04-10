import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getBaseUrl } from "./base-url";

describe("getBaseUrl (marketing)", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.NEXT_PUBLIC_MARKETING_URL;
		delete process.env.NEXT_PUBLIC_VERCEL_URL;
		delete process.env.PORT;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns the NEXT_PUBLIC_MARKETING_URL when set", () => {
		process.env.NEXT_PUBLIC_MARKETING_URL = "https://marketing.example.com";
		expect(getBaseUrl()).toBe("https://marketing.example.com");
	});

	it("returns a Vercel URL when NEXT_PUBLIC_VERCEL_URL is set", () => {
		process.env.NEXT_PUBLIC_VERCEL_URL = "my-marketing.vercel.app";
		expect(getBaseUrl()).toBe("https://my-marketing.vercel.app");
	});

	it("returns localhost:3001 by default", () => {
		expect(getBaseUrl()).toBe("http://localhost:3001");
	});

	it("uses PORT env when set and no other env vars", () => {
		process.env.PORT = "5000";
		expect(getBaseUrl()).toBe("http://localhost:5000");
	});

	it("prefers NEXT_PUBLIC_MARKETING_URL over NEXT_PUBLIC_VERCEL_URL", () => {
		process.env.NEXT_PUBLIC_MARKETING_URL = "https://marketing.example.com";
		process.env.NEXT_PUBLIC_VERCEL_URL = "my-marketing.vercel.app";
		expect(getBaseUrl()).toBe("https://marketing.example.com");
	});
});
