import { getBaseUrl } from "@repo/utils";

/**
 * Turns relative app paths into absolute SaaS URLs for emails and clients.
 * Leaves already-absolute http(s) URLs unchanged.
 */
export function resolveNotificationLink(link: string | null | undefined): string | null {
	if (link == null) {
		return null;
	}
	const trimmed = link.trim();
	if (trimmed.length === 0) {
		return null;
	}
	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}
	const base = getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000);
	try {
		return new URL(trimmed, base).href;
	} catch {
		return trimmed;
	}
}
