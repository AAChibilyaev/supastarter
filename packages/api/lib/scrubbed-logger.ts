/**
 * Scrub logger wrapper — applies scrubValue() to all log payloads
 * before they reach the underlying pino logger.
 *
 * This prevents sensitive data (bearer tokens, API keys, hashes, email,
 * personal data in error objects) from appearing in log output.
 */
import { logger as rawLogger } from "@repo/logs";

import { scrubValue } from "./scrub-secrets";

/**
 * Wraps a pino log method so that every positional argument is scrubbed
 * via scrubValue() before being passed to the real logger.
 */
function makeScrubbed(method: "info" | "warn" | "error" | "debug" | "log") {
	return (...args: unknown[]): void => {
		(rawLogger[method] as unknown as (...args: unknown[]) => void)(
			...args.map((a) => scrubValue(a)),
		);
	};
}

export const logger = {
	info: makeScrubbed("info"),
	warn: makeScrubbed("warn"),
	error: makeScrubbed("error"),
	debug: makeScrubbed("debug"),
	log: makeScrubbed("log"),
};
