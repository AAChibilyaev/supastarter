# PostHog Dashboards Setup Guide

**Phase of**: AAC-524 (Phase 5 of AAC-178)
**Depends on**: Phase 1 (event infrastructure) — DONE ✓
**Prerequisite**: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set in `.env.local`

---

## Quick Start

```bash
# 1. Set PostHog env vars (get them from app.posthog.com → Project Settings → API Keys)
export NEXT_PUBLIC_POSTHOG_KEY="phc_xxx"
export NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# 2. Get your Personal API Key from PostHog (Settings → Personal API Keys)
export POSTHOG_PERSONAL_API_KEY="phx_xxx"
export POSTHOG_PROJECT_ID="12345"

# 3. Run the setup script
bash apps/marketing/content/specs/setup-posthog-dashboards.sh
```

---

## Dashboard 1: Activation Funnel

Tracks user progression through the activation milestones.

**PostHog Insights to add:**

- **Funnel**: `aac_user_signed_up` → `aac_collection_created` → `aac_first_search_performed` → `aac_widget_embedded`
- **Weekly Conversion Rate**: Bar chart showing % who reached milestone 4+ each week
- **Step Drop-off**: Funnel step analysis with absolute counts

**Layout**: 2x2 grid

- Top-left: Funnel visualization (PostHog Funnel insight)
- Top-right: Weekly conversion trend (Trend line)
- Bottom-left: Step drop-off rates (Bar chart)
- Bottom-right: Time-to-activate histogram (average days from signup to first search)

---

## Dashboard 2: Feature Usage

Shows which features are most used and by whom.

**PostHog Insights to add:**

- **Events per User per Day**: Trend line — `aac_search_api_called`, `aac_widget_embedded`
- **Top Collections by Search Volume**: Table — group by `collection_name` property
- **Connector Usage by Type**: Pie chart — `aac_connector_connected` by `connector_type`
- **API Key Creation Trend**: Trend line — `aac_api_key_created` by `key_type`

**Layout**: 2x2 grid

- Top-left: Daily active users trend
- Top-right: Top 10 collections by search volume
- Bottom-left: Connector distribution pie chart
- Bottom-right: API key creation trend

---

## Dashboard 3: Retention

Cohort-based retention tracking.

**PostHog Insights to add:**

- **Weekly Cohort Table**: Signup week vs. action in week N (sticky retention)
- **D7 Retention Rate**: Trend line — % of users who perform any aac\_\* event on day 7
- **D14 Retention Rate**: Trend line
- **D30 Retention Rate**: Trend line
- **Bracket Retention**: 1-day, 7-day, 30-day retention rates as bar chart

**Layout**:

- Top: Full-width cohort table
- Bottom-left: D7/D14/D30 trend overlay (multi-line)
- Bottom-right: Retention bracket comparison bar chart

---

## Dashboard 4: NPS Trends

NPS score tracking (data available after Phase 3 is implemented).

**PostHog Insights to add:**

- **Monthly Average NPS**: Trend line — average of `$nps_score` person property
- **Score Distribution**: Bar chart — detractors (0-6), passives (7-8), promoters (9-10)
- **NPS Response Volume**: Area chart — number of responses per month
- **Score Waterfall**: Monthly change in NPS with color coding

**Layout**: 2x2 grid

- Top-left: NPS score trend (monthly, with target line at 50)
- Top-right: Detractor/Passive/Promoter stacked bar
- Bottom-left: Response volume area chart
- Bottom-right: Score waterfall by month

**Note**: This dashboard will show data only after Phase 3 (NPS survey modal) is deployed and users start submitting responses.

---

## Dashboard 5: Revenue & Conversion

Revenue analytics and conversion prediction.

**PostHog Insights to add:**

- **Plan Upgrade Rate by Cohort**: Bar chart — % of signup cohort that upgrades
- **Time to First Payment**: Histogram — days from signup to first subscription payment
- **Feature Usage Before Upgrade**: Funnel — which events precede `aac_plan_upgraded`
- **Monthly Recurring Revenue (MRR)**: Trend line — requires Stripe → PostHog data sync

**Layout**: 2x2 grid

- Top-left: Cohort upgrade rate heatmap
- Top-right: Time to first payment distribution
- Bottom-left: Pre-upgrade feature funnel
- Bottom-right: MRR trend (manual data, requires Stripe sync)

---

## Dashboard Creation via PostHog Management API

For automated setup, use PostHog's Management API:

```bash
# Create a dashboard
curl -X POST "https://app.posthog.com/api/projects/$PROJECT_ID/dashboards/" \
  -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AACsearch — Activation Funnel",
    "description": "User activation funnel tracking signup-to-widget conversion",
    "pinned": true,
    "filters": {"date_from": "-30d"}
  }'

# Add insights via:
# POST /api/projects/$PROJECT_ID/dashboards/$DASHBOARD_ID/insights/
```

---

## Verification Checklist

After setup is complete:

- [ ] Dashboard 1: Activation Funnel — shows funnel with 4 steps
- [ ] Dashboard 2: Feature Usage — shows events populating
- [ ] Dashboard 3: Retention — shows cohort table with data
- [ ] Dashboard 4: NPS Trends — empty until Phase 3 deploys
- [ ] Dashboard 5: Revenue & Conversion — shows upgrade data
- [ ] All 5 dashboards accessible from PostHog sidebar
- [ ] Dashboards pinned to top of project
- [ ] Proper naming convention: "AACsearch — {Dashboard Name}"

---

## Related Files

- `packages/analytics/posthog.ts` — Server-side client (Phase 1, DONE)
- `packages/analytics/posthog-provider.tsx` — Client-side provider (Phase 1, DONE)
- `packages/analytics/events.ts` — Event helpers (Phase 1, DONE)
- `apps/saas/modules/onboarding/hooks/useActivation.ts` — Milestone tracking (Phase 2, IN PROGRESS by Frontend)
- `apps/saas/modules/feedback/components/NpsModal.tsx` — NPS modal (Phase 3, BLOCKED on Gate A)
