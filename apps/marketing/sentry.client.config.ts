import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
	tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
	debug: false,
});
