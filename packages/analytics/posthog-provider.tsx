"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

function PostHogGate({ children }: PropsWithChildren) {
	const [ready, setReady] = useState(false);
	const ph = usePostHog();

	useEffect(() => {
		if (ph && POSTHOG_KEY) {
			setReady(true);
		}
	}, [ph]);

	if (!POSTHOG_KEY) return <>{children}</>;
	if (!ready) return <>{children}</>;

	return <>{children}</>;
}

/**
 * PostHog analytics provider for the SaaS client app.
 *
 * Wraps the app with posthog-js identity and event tracking.
 * No-ops gracefully when POSTHOG_KEY is not set (dev/CI).
 */
export function PostHogProvider({ children }: PropsWithChildren) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (typeof window === "undefined" || !POSTHOG_KEY) {
		return <>{children}</>;
	}

	if (!mounted) {
		return <>{children}</>;
	}

	if (!posthog.__loaded) {
		posthog.init(POSTHOG_KEY, {
			api_host: POSTHOG_HOST,
			person_profiles: "identified_only",
			capture_pageview: false,
			loaded: () => {
				posthog.identify?.();
			},
		});
	}

	return (
		<PHProvider client={posthog}>
			<PostHogGate>{children}</PostHogGate>
		</PHProvider>
	);
}

export { usePostHog };
