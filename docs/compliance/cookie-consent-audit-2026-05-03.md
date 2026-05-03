{
"generated": "2026-05-03",
"app": "AACsearch",
"auditor": "Dev Agent (504474c4-c60e-4995-a31d-599ee454c10f)",
"scope": "Full audit of ConsentProvider implementation in both SaaS and Marketing apps — verified coverage of all tracking scenarios.",
"summary": "Consent infrastructure exists in both apps. SaaS PostHog is properly consent-gated. Marketing AnalyticsScript uses no-op provider. Two remaining LOW issues: marketing banner uses hardcoded text, and consent copy is demo-oriented. These are fixed in this pass.",
"findings": [
{
"severity": "CRITICAL",
"title": "SaaS app had NO cookie consent integration (FIXED)",
"status": "fixed",
"details": "No ConsentProvider, no ConsentBanner in apps/saas/app/layout.tsx. PostHog analytics initialized unconditionally for all users without any consent mechanism.",
"fix": "Added ConsentProvider + ConsentBanner to SaaS root layout (apps/saas/app/layout.tsx). PostHogProvider gated behind consent cookie check."
},
{
"severity": "HIGH",
"title": "Analytics not gated behind consent in SaaS (FIXED)",
"status": "fixed",
"details": "SaaS PostHog initialized unconditionally. Marketing AnalyticsScript rendered unconditionally (but uses no-op custom provider).",
"fix": "Refactored apps/saas/modules/shared/components/PostHogProvider.tsx — PostHogInit now reads userHasConsented from useCookieConsent() context. Only initializes PostHog when consent is granted."
},
{
"severity": "HIGH",
"title": "Duplicate PostHogProvider removed (FIXED)",
"status": "fixed",
"details": "Root layout had PostHogProvider from @repo/analytics wrapping the entire tree, AND another inside ClientProviders. Both init PostHog.",
"fix": "Removed the outer @repo/analytics PostHogProvider from the layout. Only the local @shared PostHogProvider (now consent-gated) remains inside ClientProviders."
},
{
"severity": "MEDIUM",
"title": "Binary consent model (no granular categories)",
"status": "deferred",
"details": "Consent is binary (allowed/declined). No distinction between functional/analytics/marketing cookies. Functional cookies (auth, locale, sidebar) are set unconditionally and would be blocked if declined.",
"note": "Requires schema changes to cookie consent model (Invariant 9). Deferred."
},
{
"severity": "LOW",
"title": "Marketing ConsentBanner uses hardcoded English text",
"status": "fixed",
"details": "Marketing ConsentBanner.tsx has hardcoded demo text instead of using useTranslations('shared') like the SaaS version.",
"fix": "Replaced hardcoded English text with t(\"consent.message\"), t(\"consent.allow\"), t(\"consent.decline\") — translations already exist in all 5 locales."
},
{
"severity": "LOW",
"title": "SaaS ConsentBanner cannot decline without i18n message in marketing",
"status": "fixed",
"details": "Marketing ConsentBanner was missing i18n integration entirely — hardcoded demo text bypassed the translation system.",
"fix": "Marketing ConsentBanner now uses useTranslations() with fallback, matching the SaaS implementation."
},
{
"severity": "INFO",
"title": "Translation strings are demo-oriented",
"status": "open",
"details": "consent.message in all 5 locales says 'This site doesn't use cookies yet, but we added this banner to demo it to you.'",
"note": "Needs proper copywriting for production. The banner now renders correctly in all 5 locales."
},
{
"severity": "INFO",
"title": "Widget analytics is product telemetry, not tracking",
"status": "verified_ok",
"details": "packages/widget/src/index.ts has an analytics system that tracks widget_open, search_query, result_click, filter_used events. These are sent to /api/events/track via the product API. This is first-party product telemetry, not third-party cookie tracking. Per GDPR ePrivacy directive, product analytics for a B2B SaaS is legitimate interest and does not require cookie consent banner approval.",
"verification": "Events go to the self-hosted API endpoint, not to third-party services. No cookies are set by the widget analytics."
},
{
"severity": "INFO",
"title": "Server-side PostHog tracking is not subject to cookie consent",
"status": "verified_ok",
"details": "packages/analytics/trackEvent() uses PostHog Node.js server-side SDK. No cookies involved. Used for product events (signup, org creation, plan changes). Falls under legitimate interest / service delivery.",
"verification": "trackEvent is called from packages/api/modules/feedback/procedures/submit-nps.ts only. No browser cookies set."
},
{
"severity": "INFO",
"title": "Marketing AnalyticsScript uses no-op provider",
"status": "verified_ok",
"details": "apps/marketing/modules/analytics/index.tsx re-exports from ./provider/custom which returns null for AnalyticsScript and logs to console.info for trackEvent. No actual analytics scripts are loaded.",
"verification": "The 'custom' provider is the default. Alternative providers (Google, PostHog, Plausible, Mixpanel, Pirsch, Umami, Vercel) exist as options but are not imported or used."
},
{
"severity": "INFO",
"title": "@repo/analytics PostHogProvider not used in any layout",
"status": "verified_ok",
"details": "The @repo/analytics PostHogProvider (packages/analytics/posthog-provider.tsx) initializes PostHog unconditionally without consent gating. It is no longer imported in any app layout after the cleanup.",
"verification": "Only the local @shared/components/PostHogProvider (consent-gated) is used in SaaS app via ClientProviders."
}
],
"unchanged_findings": [
{
"issue": "PostHog consent gating verified as working",
"detail": "SaaS PostHogInit correctly checks userHasConsented before calling ph.init(). When declined, no PostHog scripts are loaded."
},
{
"issue": "Consent cookie strategy verified",
"detail": "Consent is stored as a 30-day cookie named 'consent' with value 'true' or 'false'. Read server-side via cookies() in both layouts."
},
{
"issue": "No third-party scripts found",
"detail": "No Google Analytics, Facebook Pixel, Hotjar, or other third-party tracking scripts were found in either app."
}
],
"remaining_work": [
"Replace demo-oriented consent.message copy with production text in all 5 locales",
"If granular cookie categories are needed (functional / analytics / marketing), requires schema change — see Invariant 9"
],
"files_affected_by_this_audit": {
"marketing_consent_banner_fix": "apps/marketing/modules/shared/components/ConsentBanner.tsx — added useTranslations() i18n support"
}
}
