"use client";

import posthog from "posthog-js";
import { PostHogProvider as PostHogProviderBase, usePostHog } from "posthog-js/react";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
	(process.env.NEXT_PUBLIC_POSTHOG_HOST as string | undefined) ?? "https://app.posthog.com";

function PostHogInit() {
	const ph = usePostHog();

	useEffect(() => {
		if (!POSTHOG_KEY || !ph) return;

		ph.init(POSTHOG_KEY, {
			api_host: POSTHOG_HOST,
			person_profiles: "identified_only",
			capture_pageview: false, // We'll use Next.js router events
			capture_pageleave: true,
			autocapture: false, // Explicit capture only
		});

		if (process.env.NODE_ENV === "development") {
			// In development, opt out to avoid noise
			ph.opt_out_capturing();
		}
	}, [ph]);

	return null;
}

export function PostHogProvider({ children }: PropsWithChildren) {
	if (!POSTHOG_KEY) {
		return <>{children}</>;
	}

	return (
		<PostHogProviderBase client={posthog}>
			<PostHogInit />
			{children}
		</PostHogProviderBase>
	);
}
