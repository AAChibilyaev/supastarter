{
  "generated": "2026-05-03",
  "app": "AACsearch SaaS",
  "findings": [
    {
      "severity": "CRITICAL",
      "title": "SaaS app had NO cookie consent integration at all",
      "details": "No ConsentProvider, no ConsentBanner in apps/saas/app/layout.tsx. PostHog analytics initialized unconditionally for all users without any consent mechanism.",
      "fix": "Added ConsentProvider + ConsentBanner to SaaS root layout (apps/saas/app/layout.tsx). PostHogProvider gated behind consent cookie check."
    },
    {
      "severity": "HIGH",
      "title": "Analytics not gated behind consent in either app",
      "details": "SaaS PostHog initialized unconditionally. Marketing AnalyticsScript rendered unconditionally (but uses no-op custom provider).",
      "fix": "Refactored apps/saas/modules/shared/components/PostHogProvider.tsx — PostHogInit now reads userHasConsented from useCookieConsent() context. Only initializes PostHog when consent is granted."
    },
    {
      "severity": "MEDIUM",
      "title": "Binary consent model (no granular categories)",
      "details": "Consent is binary (allowed/declined). No distinction between functional/analytics/marketing cookies. Functional cookies (auth, locale, sidebar) are set unconditionally and would be blocked if declined.",
      "note": "Not implemented in this pass — requires schema changes to cookie consent model (Invariant 9). Left as future work."
    },
    {
      "severity": "LOW",
      "title": "Marketing ConsentBanner uses hardcoded English text",
      "details": "Marketing ConsentBanner.tsx has hardcoded demo text instead of using useTranslations('shared') like the SaaS version.",
      "note": "Details in cookie-consent-audit.md"
    },
    {
      "severity": "LOW",
      "title": "Duplicate PostHogProvider (outer @repo/analytics + local)",
      "details": "Root layout had PostHogProvider from @repo/analytics wrapping the entire tree, AND another inside ClientProviders. Both init PostHog.",
      "fix": "Removed the outer @repo/analytics PostHogProvider from the layout. Only the local @shared PostHogProvider (now consent-gated) remains inside ClientProviders."
    },
    {
      "severity": "INFO",
      "title": "Translation strings are demo-oriented",
      "details": "consent.message in all 5 locales says 'This site doesn't use cookies yet, but we added this banner to demo it to you'",
      "note": "Needs proper copywriting for production"
    }
  ],
  "summary": "Cookie consent infrastructure (Provider + Banner + hook + translations) existed but was only wired in Marketing app and gated nothing. SaaS had zero consent at all. All critical and high-severity issues fixed in this pass."
}
