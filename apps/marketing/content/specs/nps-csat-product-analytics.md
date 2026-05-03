# NPS / CSAT & Product Analytics — Implementation Spec

**Issue**: AAC-178
**Goal**: Instrument SaaS app with PostHog analytics, in-app NPS survey, activation funnel

---

## 1. PostHog Setup

### 1.1 Environment Variables

```
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 1.2 Provider File

Create `packages/analytics/posthog.ts`:

```typescript
import { PostHog } from "posthog-node";

export const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
	host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
```

Client-side: use `posthog-js` with `<PostHogProvider>` wrapper in `apps/saas/app/[locale]/layout.tsx`.

---

## 2. Event Taxonomy

All events prefixed with `aac_`.

### 2.1 User Events

| Event                    | Properties                             | Trigger            |
| ------------------------ | -------------------------------------- | ------------------ |
| `aac_user_signed_up`     | method (google, github, email), locale | Sign-up complete   |
| `aac_org_created`        | org_name, org_size                     | First org creation |
| `aac_collection_created` | collection_name, doc_count             | First collection   |

### 2.2 Activation Events

| Event                        | Properties                            | Trigger                    |
| ---------------------------- | ------------------------------------- | -------------------------- |
| `aac_first_search_performed` | search_term, result_count, latency_ms | First dashboard search     |
| `aac_widget_embedded`        | project_id                            | Widget embed script loaded |
| `aac_search_api_called`      | endpoint, status, latency             | Any API search call        |

### 2.3 Business Events

| Event                        | Properties                          | Trigger             |
| ---------------------------- | ----------------------------------- | ------------------- |
| `aac_plan_upgraded`          | from_plan, to_plan                  | Subscription change |
| `aac_plan_downgraded`        | from_plan, to_plan                  | Subscription change |
| `aac_subscription_cancelled` | reason (optional)                   | Cancellation        |
| `aac_api_key_created`        | key_type (search, admin, scoped)    | API key creation    |
| `aac_connector_connected`    | connector_type (prestashop, bitrix) | Connector handshake |

### 2.4 Privacy

- No PII in event properties
- User ID = hashed (sha256 of user.id)
- Group ID = organization.id
- GDPR: `posthog.opt_out_capturing()` toggle in settings

---

## 3. Activation Funnel

### Milestones (0-5)

1. **Signed up** — account created (auto)
2. **Created project** — first collection created
3. **Uploaded data** — documents indexed
4. **Performed search** — first search query
5. **Embedded widget** — widget script loaded OR API key used

### Health Scoring

- Activated = milestone >= 4
- Healthy = activated + logged in past 7 days
- At-risk = signed up > 14 days ago, milestone < 3
- Churned = no login in 30+ days

PostHog funnel: `aac_user_signed_up` → `aac_collection_created` → `aac_first_search_performed` → `aac_widget_embedded`

---

## 4. NPS Survey

### 4.1 Prisma Model (Gate A — needs approval)

```prisma
model NpsSurveyResponse {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id])
  score        Int      // 0-10
  feedback     String?  // Optional text
  source       String   // "in_app" | "email" | "support"
  createdAt    DateTime @default(now())
}
```

### 4.2 Trigger Logic

- **When**: User has been active for 7+ days AND milestone >= 4
- **Frequency**: Once per 90 days (stored in localStorage: `nps_last_shown`)
- **UI**: Modal overlay, non-blocking (can dismiss), appears after page load
- **Score**: 0-10 star/emoji scale
- **Follow-up**: Score 0-6 → "What could we do better?" text area
  Score 7-8 → "What keeps you from recommending us?" text area
  Score 9-10 → "What do you love most?" text area

### 4.3 PostHog Integration

- Event: `aac_nps_submitted` with properties: score, source
- PostHog person property: `last_nps_score`, `last_nps_date`

---

## 5. CSAT Survey

- **When**: 24 hours after a support ticket is closed
- **Method**: Email (via notifications pipeline) OR in-app banner
- **Question**: "How satisfied were you with the support you received?"
- **Scale**: 1-5 (very dissatisfied → very satisfied)
- **Event**: `aac_csat_submitted` with properties: score, ticket_id

---

## 6. Dashboards

### PostHog Dashboards to Create

1. **Activation Funnel**
    - Step-by-step conversion: signup → project → search → widget
    - Weekly trend line
    - Drop-off rates per step

2. **Feature Usage**
    - Events per user per day
    - Top collections by search volume
    - Connector usage by type

3. **Retention**
    - Weekly cohort: signup week → action in week N
    - D7, D14, D30 retention rates

4. **NPS Trends**
    - Average NPS score over time (monthly)
    - Score distribution (detractors/passives/promoters)
    - Feedback word cloud

5. **Revenue & Conversion**
    - Plan upgrade rate by cohort
    - Time from signup to first payment
    - Feature usage before upgrade (predictive)

---

## 7. Implementation Files

| File                                                   | Purpose                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| `packages/analytics/posthog.ts`                        | Server-side PostHog client                                           |
| `packages/analytics/posthog-provider.tsx`              | Client-side PostHog provider                                         |
| `packages/analytics/events.ts`                         | Event tracking helpers (typesafe)                                    |
| `packages/database/prisma/migrations/xxx_nps.ts`       | NpsSurveyResponse model                                              |
| `apps/saas/modules/onboarding/hooks/useActivation.ts`  | Milestone tracking hook                                              |
| `apps/saas/modules/feedback/components/NpsModal.tsx`   | NPS survey modal                                                     |
| `apps/saas/modules/feedback/components/CsatBanner.tsx` | CSAT survey banner                                                   |
| `apps/saas/modules/feedback/procedures/submitNps.ts`   | oRPC: submit NPS                                                     |
| `apps/saas/modules/feedback/procedures/submitCsat.ts`  | oRPC: submit CSAT                                                    |
| `packages/i18n/translations/*/saas.json`               | `feedback.nps.*` + `feedback.csat.*` — translations in all 5 locales |

---

## 8. Dependencies

- `posthog-js` ^1.200.0 (client)
- `posthog-node` ^4.0.0 (server)
- Gate A: NpsSurveyResponse Prisma model → needs approval
- Gate B: POSTHOG_KEY env vars
- Requires notifications pipeline for CSAT email
