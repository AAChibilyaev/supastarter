#!/usr/bin/env node
// Post-generate patch: prisma-zod-generator emits `z.bigint().default("0")`
// (string default), which fails type-check against `z.bigint().default(bigint)`.
// We rewrite the bad string defaults to `BigInt(...)` calls in-place.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "prisma", "zod", "index.ts");

const src = await readFile(target, "utf8");

// Match: z.bigint().default("123") or z.bigint().nullish().default("123")
const patched = src.replace(
	/(z\.bigint\(\)(?:\.[a-zA-Z]+\(\))*\.default\()"(-?\d+)"(\))/g,
	(_match, head, num, tail) => `${head}BigInt(${num})${tail}`,
);

if (src === patched) {
	console.log("patch-zod-bigint-defaults: nothing to patch");
} else {
	await writeFile(target, patched, "utf8");
	const count = (src.match(/z\.bigint\(\)(?:\.[a-zA-Z]+\(\))*\.default\("-?\d+"\)/g) ?? []).length;
	console.log(`patch-zod-bigint-defaults: patched ${count} BigInt defaults`);
}
