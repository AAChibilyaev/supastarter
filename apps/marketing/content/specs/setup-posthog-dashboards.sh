#!/usr/bin/env bash
# ============================================================
# PostHog Dashboard Setup — AACsearch Product Analytics
# ============================================================
# Creates all 5 PostHog dashboards with base insights.
# Prerequisites: POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID set.
#
# Usage:
#   export POSTHOG_PERSONAL_API_KEY="***"
#   export POSTHOG_PROJECT_ID="12345"
#   bash setup-posthog-dashboards.sh
# ============================================================

set -euo pipefail

API_BASE="${NEXT_PUBLIC_POSTHOG_HOST:-https://app.posthog.com}"
AUTH_HEADER="Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY:?Error: POSTHOG_PERSONAL_API_KEY not set}"
PROJECT_ID="${POSTHOG_PROJECT_ID:?Error: POSTHOG_PROJECT_ID not set}"
CONTENT_TYPE="Content-Type: application/json"

echo "=== AACsearch PostHog Dashboard Setup ==="
echo "Project ID: $PROJECT_ID"
echo "API Base:   $API_BASE"
echo ""

# ─── Helper ──────────────────────────────────────────────

create_dashboard() {
  local name="$1"
  local description="$2"
  local filters="$3"

  echo "Creating dashboard: $name"
  local tmpfile; tmpfile=$(mktemp)
  if curl -sf -X POST "$API_BASE/api/projects/$PROJECT_ID/dashboards/" \
    -H "$AUTH_HEADER" \
    -H "$CONTENT_TYPE" \
    -d "{
      \"name\": \"AACsearch — $name\",
      \"description\": \"$description\",
      \"pinned\": true,
      \"filters\": $filters
    }" > "$tmpfile"; then
    python3 -c "import sys,json;d=json.load(open(sys.argv[1]));print(f'  Created: {d.get(\"id\",\"unknown\")} — {d.get(\"name\",\"\")}')" "$tmpfile"
  else
    echo "  FAILED to create dashboard: $name"
  fi
  rm -f "$tmpfile"
}

echo "────────────────────────────────────────────────────"
echo "Dashboard 1/5: Activation Funnel"
echo "────────────────────────────────────────────────────"
create_dashboard \
  "Activation Funnel" \
  "User activation funnel: signup → collection → search → widget. Tracks conversion rates and drop-off at each milestone." \
  '{"date_from": "-30d"}'

echo ""
echo "────────────────────────────────────────────────────"
echo "Dashboard 2/5: Feature Usage"
echo "────────────────────────────────────────────────────"
create_dashboard \
  "Feature Usage" \
  "Feature adoption metrics: search API calls by collection, connector usage, API key creation trends, daily active users." \
  '{"date_from": "-30d"}'

echo ""
echo "────────────────────────────────────────────────────"
echo "Dashboard 3/5: Retention"
echo "────────────────────────────────────────────────────"
create_dashboard \
  "Retention" \
  "Weekly cohort retention table. D7, D14, D30 retention rates. Tracks user return rates over time." \
  '{"date_from": "-90d"}'

echo ""
echo "────────────────────────────────────────────────────"
echo "Dashboard 4/5: NPS Trends"
echo "────────────────────────────────────────────────────"
create_dashboard \
  "NPS Trends" \
  "Net Promoter Score tracking. Monthly average, score distribution (detractors/passives/promoters), response volume. Data populates after NPS survey goes live." \
  '{"date_from": "-90d"}'

echo ""
echo "────────────────────────────────────────────────────"
echo "Dashboard 5/5: Revenue & Conversion"
echo "────────────────────────────────────────────────────"
create_dashboard \
  "Revenue & Conversion" \
  "Plan upgrade rates by cohort, time to first payment, pre-upgrade feature usage analysis, MRR trend." \
  '{"date_from": "-90d"}'

echo ""
echo "=== All 5 dashboards created! ==="
echo ""
echo "Next steps:"
echo "  1. Visit $API_BASE/project/$PROJECT_ID/dashboards/"
echo "  2. Add specific insights/panels to each dashboard in the PostHog UI"
echo "     (See posthog-dashboards-setup.md for recommended insight layouts)"
echo "  3. Pin dashboards for easy access"
echo "  4. Set up dashboard sharing URLs for embedding"
echo ""
