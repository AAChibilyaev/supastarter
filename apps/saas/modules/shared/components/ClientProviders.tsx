"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { PostHogProvider } from "@shared/components/PostHogProvider";
import type { PropsWithChildren } from "react";

export function ClientProviders({ children }: PropsWithChildren) {
	return (
		<ProgressProvider
			height="4px"
			color="var(--color-primary)"
			options={{ showSpinner: false }}
			shallowRouting
			delay={250}
		>
			<PostHogProvider>{children}</PostHogProvider>
		</ProgressProvider>
	);
}
