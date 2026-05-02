# Launch Performance Dashboard — AACsearch

> Tracking template for launch week KPIs: Product Hunt, HackerNews, traffic, signups, conversion.
> Tools: PostHog (product analytics), PH API, HN Algolia API, spreadsheet.
> Last updated: May 2026

---

## Overview

| KPI Category | Metrics                                 | Source              | Update Frequency    |
| ------------ | --------------------------------------- | ------------------- | ------------------- |
| Product Hunt | Upvotes, comments, rank                 | producthunt.com     | Hourly (launch day) |
| HackerNews   | Points, comments, rank, front page time | hn.algolia.com      | Hourly (launch day) |
| Traffic      | Visitors, pageviews, top sources        | PostHog             | Real-time           |
| Signups      | New users, by source, conversion rate   | PostHog + SaaS DB   | Real-time           |
| Activation   | Collection created, search performed    | PostHog             | Daily               |
| Revenue      | Free → Paid conversion, MRR             | SaaS DB             | Daily               |
| Social       | Tweet impressions, link clicks          | X/Twitter Analytics | Daily               |

---

## PostHog Events Setup

The following events should be tracked in PostHog:

| Event Name            | Trigger                     | Properties                                    |
| --------------------- | --------------------------- | --------------------------------------------- |
| `user_signed_up`      | User completes signup       | source (utm_source, utm_medium, utm_campaign) |
| `user_signed_in`      | User logs in                | -                                             |
| `org_created`         | Organization created        | org_id                                        |
| `collection_created`  | First collection            | collection_name                               |
| `search_performed`    | Any search query            | query, results_count, latency_ms              |
| `widget_embedded`     | Widget embed code generated | site_url                                      |
| `api_key_created`     | API key generated           | key_type (search/connector/scoped)            |
| `plan_upgraded`       | Free → Pro or Enterprise    | plan_name, price                              |
| `pricing_page_viewed` | User views /pricing         | -                                             |
| `ph_referral`         | Landing from PH link        | -                                             |
| `hn_referral`         | Landing from HN link        | -                                             |

### UTM Parameters for Launch

Set up UTM tags on every external link:

| Source       | UTM Source     | UTM Medium | UTM Campaign |
| ------------ | -------------- | ---------- | ------------ |
| Product Hunt | producthunt    | social     | launch-2026  |
| HackerNews   | ycombinator    | social     | launch-2026  |
| Twitter/X    | twitter        | social     | launch-2026  |
| LinkedIn     | linkedin       | social     | launch-2026  |
| Blog         | aacsearch_blog | blog       | launch-2026  |
| Email        | email          | email      | launch-2026  |

---

## Spreadsheet Template (Google Sheets / Excel)

### Sheet 1: Hourly Tracker (Launch Day)

Create columns:

| Time (PST) | PH Upvotes | PH Comments | PH Rank | HN Points | HN Comments | HN Front Page? | Site Visitors | New Signups | Signup Source (PH) | Signup Source (HN) | Signup Source (Direct) | Signup Source (Blog) | Notes      |
| ---------- | ---------- | ----------- | ------- | --------- | ----------- | -------------- | ------------- | ----------- | ------------------ | ------------------ | ---------------------- | -------------------- | ---------- |
| 8:00 AM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      | Pre-launch |
| 9:00 AM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      | PH live    |
| 10:00 AM   |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |
| 11:00 AM   |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |
| 12:00 PM   |            |             |         |           |             |                |               |             |                    |                    |                        |                      | Mid-day    |
| 1:00 PM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |
| 2:00 PM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |
| 3:00 PM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      | Afternoon  |
| 4:00 PM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |
| 5:00 PM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |
| 6:00 PM    |            |             |         |           |             |                |               |             |                    |                    |                        |                      | Recap      |
| **TOTAL**  |            |             |         |           |             |                |               |             |                    |                    |                        |                      |            |

### Sheet 2: Daily Summary (D+0 to D+7)

| Day | PH Upvotes | HN Points | Visitors | New Signups | Paid Conversions | MRR Added | Blog Traffic | Social Impressions |
| --- | ---------- | --------- | -------- | ----------- | ---------------- | --------- | ------------ | ------------------ |
| D+0 |            |           |          |             |                  |           |              |                    |
| D+1 |            |           |          |             |                  |           |              |                    |
| D+2 |            |           |          |             |                  |           |              |                    |
| D+3 |            |           |          |             |                  |           |              |                    |
| D+4 |            |           |          |             |                  |           |              |                    |
| D+5 |            |           |          |             |                  |           |              |                    |
| D+6 |            |           |          |             |                  |           |              |                    |
| D+7 |            |           |          |             |                  |           |              |                    |

### Sheet 3: Activation Funnel

| Stage              | Count | % of Previous | Notes                     |
| ------------------ | ----- | ------------- | ------------------------- |
| Website visitors   |       | -             | Total launch day visitors |
| Signed up          |       | % of visitors |                           |
| Created collection |       | % of signups  | Activation milestone 1    |
| Performed search   |       | % of signups  | Activation milestone 2    |
| Embedded widget    |       | % of signups  | Activation milestone 3    |
| Upgraded to paid   |       | % of signups  | Revenue milestone         |

---

## API Sources

### Product Hunt (Unofficial)

PH doesn't have a public API for upvote data. Monitor manually:

- URL: https://www.producthunt.com/posts/aacsearch
- Browser extension: Product Hunt Rank Tracker

### HackerNews (Algolia API)

Automated HN monitoring:

```
# Get mentions of AACsearch
curl "https://hn.algolia.com/api/v1/search?query=aacsearch&tags=story&hitsPerPage=20"

# Get specific post details (replace STORY_ID)
curl "https://hn.algolia.com/api/v1/items/STORY_ID"
```

### PostHog Dashboard

PostHog provides real-time analytics:

- Active users (last 30 min)
- Pageviews by source
- Conversion funnels
- Retention cohorts

### Custom Script (optional)

For automated hourly snapshots, a small script can:

1. Hit HN Algolia API for story points/comments
2. Query PostHog API for visitor/signup counts
3. Write to a timestamped log
4. (Optional) Post to Slack channel #launch-metrics

---

## Key Targets

| Metric                    | Target         | Stretch Goal | Minimum Viable |
| ------------------------- | -------------- | ------------ | -------------- |
| PH Upvotes (24h)          | 300            | 500          | 150            |
| PH Comments               | 50             | 100          | 25             |
| PH Rank                   | Top 5 of Day   | #1 of Day    | Top 10         |
| HN Points                 | 50             | 100          | 25             |
| HN Front Page Hours       | 2h             | 6h           | 1h             |
| New Signups (Week 1)      | 500            | 1,000        | 200            |
| Paid Conversions (Week 1) | 20             | 50           | 10             |
| Blog Traffic (Week 1)     | 5,000 visitors | 10,000       | 2,000          |

---

## Dashboard URL

**PostHog dashboard:** (to be created in PostHog after launch)
**Spreadsheet:** (copy this template to Google Sheets)

---

## Alerts & Notifications

Set up these alerts for launch day:

| Alert                 | Threshold                    | Channel       | Action             |
| --------------------- | ---------------------------- | ------------- | ------------------ |
| API error rate > 5%   | Immediate                    | Slack #alerts | Rollback or fix    |
| Signup rate drop      | < 5 signups/h after first 3h | Slack #launch | Investigate funnel |
| Negative HN sentiment | 3+ critical comments         | Slack #launch | Respond personally |
| Server CPU > 80%      | Sustained 5 min              | Slack #alerts | Scale up           |
