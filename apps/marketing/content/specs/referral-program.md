# Referral & Affiliate Program — Implementation Spec

**Issue**: AAC-145
**Goal**: Referral codes, bonus credits on signup, affiliate dashboard, payout tracking, fraud detection

---

## 1. Program Mechanics

### 1.1 Referral Flow

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│  User A  │────▶│ Generate     │────▶│  Share Link   │────▶│  Referral   │
│ (referee)│     │ Referral Code│     │  with Friend  │     │  Landing    │
└──────────┘     └──────────────┘     └───────────────┘     └──────┬──────┘
                                                                   │
                                                                   ▼
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ User B signs up │────▶│ User B upgrades │────▶│ User A gets 20% │
│ (with ref code) │     │ to paid plan    │     │ of first month   │
└─────────────────┘     └─────────────────┘     └──────────────────┘
```

### 1.2 Reward Structure

| Trigger | Reward | Notes |
|---------|--------|-------|
| Referee's first payment | 20% of first month credited to referrer | One-time bonus per referred user |
| Referee's ongoing subscription | — | Only first month rewarded |
| Multiple referrals | Accumulated credits | Max 5 per IP/email domain |

### 1.3 Fraud Prevention

- Max 5 referrals per IP address
- Max 5 referrals per email domain (e.g., `@gmail.com`)
- Same-email check: referrer cannot refer themselves
- Payout hold: credit vests after 30 days (anti-churn fraud)
- IP + device fingerprint check on signup

### 1.4 Credit System

- Credits awarded as `AiWallet` top-ups (kopecks/BigInt)
- Minimum payout: equivalent to $10 in credits
- Credits usable for: search API usage, connectors, AI features
- Credits NOT redeemable for cash
- Credit expiration: 12 months from issue

---

## 2. Database (Gate A — New Prisma Models)

```prisma
model ReferralCode {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  code            String   @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Stats (cache, recalculated by worker)
  clickCount      Int      @default(0)
  signupCount     Int      @default(0)
  conversionCount Int      @default(0)

  referrals Referral[]
}

model Referral {
  id            String       @id @default(cuid())
  referrerCode  String
  referrerCodeR ReferralCode @relation(fields: [referrerCode], references: [code])
  refereeId     String
  referee       User         @relation(fields: [refereeId], references: [id])
  status        String       // "pending" | "converted" | "credited" | "expired"
  ipAddress     String?
  userAgent      String?
  createdAt     DateTime     @default(now())
  convertedAt   DateTime?
  creditedAt    DateTime?
  creditAmount  BigInt?      @default(0)
  payoutHoldUntil DateTime?  // 30 days after conversion

  @@unique([referrerCode, refereeId])
  @@index([referrerCode])
  @@index([refereeId])
}
```

This is a **schema change** (Gate A). Requires approval before implementation.

---

## 3. API Procedures (oRPC)

### 3.1 Referral Code Management

| Procedure | Method | Description |
|-----------|--------|-------------|
| `referral.getMyCode` | GET | Returns the user's referral code (generates if absent) |
| `referral.getMyStats` | GET | Returns click/signup/conversion counts |
| `referral.getMyReferrals` | GET | List of referral entries with status |
| `referral.getAvailableRewards` | GET | Total unclaimed credit balance |

### 3.2 Referral Landing

| Procedure | Method | Description |
|-----------|--------|-------------|
| `referral.resolveCode` | GET | Returns referrer name/org from code (for landing page) |

### 3.3 Webhook/Event Tracking

| Event | Trigger | Description |
|-------|---------|-------------|
| `referral_link_clicked` | Link clicked | Increment click count |
| `referral_signup_completed` | Signup with code | Create Referral record |
| `referral_conversion_check` | First payment | Check + award credit |

---

## 4. UI Components

### 4.1 Referral Dashboard (`/settings/referral`)

```
┌─────────────────────────────────────────────────────────┐
│ 🎁 Referral Program                                      │
│                                                         │
│ Earn 20% of their first month when friends upgrade.     │
│                                                         │
│ ┌──────────────────────────────────────────────────┐   │
│ │  Your Referral Link                               │   │
│ │  https://aacsearch.com/?ref=ABC123    [Copy]     │   │
│ │                                  ✓ Copied!       │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ ┌──────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  │
│ │ Clicks│  │Signups │  │Conversions│  │  Earnings    │  │
│ │   12  │  │   5    │  │     2     │  │  $24.00      │  │
│ └──────┘  └────────┘  └──────────┘  └──────────────┘  │
│                                                         │
│ Share via: [Email] [X/Twitter] [WhatsApp] [Copy]       │
│                                                         │
│ ─── Referral History ───────────────────────────────    │
│ │ Friend          │ Status      │ Reward │ Date     │  │
│ ├─────────────────┼─────────────┼────────┼──────────┤  │
│ │ j***@gmail.com  │ ✅ Credited │ $12.00 │ Apr 15   │  │
│ │ a***@company.io │ ⏳ Pending  │  —     │ Apr 28   │  │
│ │ m***@test.com   │ 🔄 Converted│ Hold   │ Mar 20   │  │
│ │ d***@demo.com   │ ⏳ Signed up│  —     │ Mar 10   │  │
│ └─────────────────┴─────────────┴────────┴──────────┘  │
│                                                         │
│ ⚠️ Max 5 referrals per IP/email domain to prevent abuse │
│ Credits expire 12 months from issue.                    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Referral Landing Page (`/[locale]/referral/[code]`)

```
┌─────────────────────────────────────────────────────────┐
│ 🎉 You've been invited to AACsearch!                     │
│                                                         │
│   Alex Chibilyaev (AACsearch Founder) is using           │
│   AACsearch and thinks you'll love it too!              │
│                                                         │
│   "Instant search-as-a-service — Algolia-quality at      │
│    a fraction of the cost. No servers, no DevOps."      │
│                                                         │
│   ┌──────────────────────────────────────────┐          │
│   │  [🚀 Get Started Free — No CC Required]  │          │
│   └──────────────────────────────────────────┘          │
│                                                         │
│   ✅ Instant search in 5 minutes                         │
│   ✅ Algolia-quality, 5x cheaper                         │
│   ✅ 14-day free trial, no credit card                   │
│                                                         │
│   Trusted by 100+ companies worldwide                    │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Affiliate Portal (`/affiliates`)

Extended referral dashboard for high-volume affiliates:
- Bulk link generation (up to 100 unique codes)
- Payout history with CSV export
- Promotional materials (banners, ad copy)
- Tier status (Bronze/Silver/Gold based on referrals/month)
- Custom payout thresholds

---

## 5. Email Templates

### 5.1 Invitation Email

- **Subject**: "{name} thinks you'll love AACsearch!"
- **Content**: Personalized invite with referrer name, value proposition, CTA button
- **Send**: When referrer shares via email from the dashboard

### 5.2 Confirmation Email

- **Subject**: "You earned search credits!"
- **Content**: Notify referrer when referred user signs up
- **Timing**: Immediate on signup

### 5.3 Conversion Email

- **Subject**: "Your referral reward is now available!"
- **Content**: Notify referrer that credits have been awarded
- **Timing**: After 30-day hold period

### 5.4 Referee Signup Email (existing drip)

- Referred users enter the standard onboarding drip (Day 0, Day 1, Day 3, Day 7)
- No special treatment except ref code tracked in user metadata

---

## 6. i18n

All referral UI strings already exist in all 5 locales (`packages/i18n/translations/*/saas.json`):

- `referral.program.*` — Dashboard UI
- `referral.inviteEmail.*` — Invitation email
- `referral.confirmationEmail.*` — Signup confirmation
- `referral.landing.*` — Referral landing page

See `saas.json` `referral` section for full key listing.

---

## 7. Implementation Order

```
Phase 1: Prisma migration (Gate A) — ReferralCode + Referral models
Phase 2: Referral code generation + oRPC procedures
Phase 3: Referral tracking (signup with code, click stats)
Phase 4: Credit reward system (AiWallet integration)
Phase 5: Referral Dashboard UI (/settings/referral)
Phase 6: Referral Landing Page UI (/referral/[code])
Phase 7: Fraud detection (IP/domain limits, device fingerprint)
Phase 8: Email notifications + Affiliate portal
Phase 9: CSV export + payout history
Phase 10: Affiliate tiers + promotional materials
```

---

## 8. Related Files

- `packages/i18n/translations/*/saas.json` — i18n keys (ALREADY DONE)
- `packages/database/prisma/schema.prisma` — ReferralCode + Referral models (Gate A)
- `packages/api/modules/referral/` — New API module
- `apps/saas/modules/settings/pages/SettingsReferralPage.tsx` — Dashboard page
- `apps/marketing/app/[locale]/referral/[code]/page.tsx` — Landing page
