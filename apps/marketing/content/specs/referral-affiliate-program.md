# Referral & Affiliate Program — Marketing Spec

**Issue**: AAC-145
**Status**: In Progress (CMO: content + i18n)
**Next**: CTO/Frontend — implement referral code system + affiliate portal

---

## 1. Overview

AACsearch Referral & Affiliate Program allows existing users to earn credits by referring new customers.

### Core Mechanics

- **Referral code**: Generated on invite URL (`/invite?ref=CODE`)
- **Reward**: Referrer gets 20% of referee's first month payment
- **Fraud protection**: Max 5 referrals per IP/email domain
- **Payout**: Credited as AI Wallet balance (or Stripe payout for affiliates)

---

## 2. User Flows

### Flow A: Share Referral Link

```
User opens /settings/referrals
  → Sees unique referral link + code
  → Shares via: Copy link, Email, Twitter, WhatsApp
  → Tracks: clicks, signups, conversions, earnings
```

### Flow B: Redeem Referral

```
New user clicks referral link
  → Sign up (referral code auto-applied as cookie/param)
  → Creates collection and starts free trial
  → Upgrades to paid plan
  → Referrer gets 20% credit
```

### Flow C: Affiliate Portal

```
Affiliate visits /affiliates
  → Dashboard: link generator, stats, payout history
  → Payout methods: Stripe, PayPal, Wallet credit
  → Materials: banners, email templates, comparison tables
```

---

## 3. Marketing Copy

### 3.1 Referral Program Name

**"Share & Save"** — Internal code: `share-and-save`

### 3.2 Invite Email

**Subject**: [Name] thinks you'll love AACsearch!

**Body**:

```
Hey there,

[Name] has been using AACsearch and thinks you'll love it too!

AACsearch gives you instant search-as-a-service —
Algolia-quality search at a fraction of the cost.

🎁 As a special gift, you get started free, no credit card required.

👉 [Get started with [Name]'s referral](https://aacsearch.com?ref=CODE)

Happy searching!
The AACsearch Team
```

### 3.3 Referral Confirmation Email (to referrer)

**Subject**: 🎉 You earned search credits!

**Body**:

```
Great news, [Name]!

Someone you referred just signed up for AACsearch.
Once they complete their first payment, you'll get 20% credited to your account.

Your referral dashboard: /settings/referrals
```

### 3.4 In-App Banners

**Dashboard banner** (for users who haven't referred):

```
📢 Love AACsearch? Share the love!
Refer a friend and earn 20% of their first month when they upgrade.
[Share your referral link]
```

**Settings page section**:

```
┌────────────────────────────────────────────┐
│ 💰 Referral Program                        │
├────────────────────────────────────────────┤
│ Your link: aacsearch.com?ref=YOURCODE      │
│                                            │
│ 📊 Stats                                   │
│   Clicks:         24                       │
│   Signups:        3                        │
│   Conversions:    1                        │
│   Earnings:       $19.80                   │
│                                            │
│ [Copy Link] [Share via Email] [Share via X]│
│                                            │
│ Invite friends → earn search credits!      │
└────────────────────────────────────────────┘
```

### 3.5 Referral Landing Page (`/refer?ref=CODE`)

```
┌──────────────────────────────────────────────────────┐
│ 🎁 You've been invited to AACsearch                  │
│                                                        │
│ [Name] is using AACsearch and thinks you'll love it!  │
│                                                        │
│ Search that just works — no servers, no DevOps.       │
│                                                        │
│ ✅ Instant search setup in 5 minutes                   │
│ ✅ Algolia-quality, 5x cheaper                         │
│ ✅ 14-day free trial, no credit card                   │
│                                                        │
│ [Get Started Free →]                                   │
│                                                        │
│ Trusted by 100+ companies worldwide                    │
└──────────────────────────────────────────────────────┘
```

---

## 4. i18n Keys

Add to all 5 locales: `packages/i18n/translations/{en,de,es,fr,ru}/saas.json`

```jsonc
"referral": {
  "program": {
    "title": "Referral Program",
    "description": "Invite friends and earn search credits when they upgrade",
    "shareLink": "Share your referral link",
    "yourLink": "Your referral link",
    "copyLink": "Copy Link",
    "linkCopied": "Link copied!",
    "shareEmail": "Share via Email",
    "shareTwitter": "Share via X",
    "stats": {
      "clicks": "Clicks",
      "signups": "Signups",
      "conversions": "Conversions",
      "earnings": "Earnings",
      "empty": "Share your link to start earning credits"
    },
    "reward": "Earn 20% of their first month",
    "rewardDescription": "When someone you refer upgrades to a paid plan, you get 20% of their first month credited to your account",
    "fraudNote": "Max 5 referrals per IP/email domain to prevent abuse",
    "cta": "Invite friends → earn search credits!",
    "dashboardBanner": "Love AACsearch? Share the love! Refer a friend and earn 20% of their first month."
  },
  "inviteEmail": {
    "subject": "{name} thinks you'll love AACsearch!",
    "greeting": "Hey there,",
    "intro": "{name} has been using AACsearch and thinks you'll love it too!",
    "valueProp": "Instant search-as-a-service — Algolia-quality at a fraction of the cost.",
    "giftNote": "Get started free, no credit card required.",
    "cta": "Get started with {name}'s referral",
    "signoff": "Happy searching!\nThe AACsearch Team"
  },
  "confirmationEmail": {
    "subject": "You earned search credits!",
    "body": "Someone you referred just signed up for AACsearch. Once they complete their first payment, you'll get 20% credited to your account.",
    "cta": "View your referral dashboard"
  },
  "landing": {
    "title": "You've been invited to AACsearch",
    "subtitle": "{name} is using AACsearch and thinks you'll love it!",
    "tagline": "Search that just works — no servers, no DevOps.",
    "features": {
      "instant": "Instant search setup in 5 minutes",
      "pricing": "Algolia-quality, 5x cheaper",
      "trial": "14-day free trial, no credit card"
    },
    "cta": "Get Started Free",
    "socialProof": "Trusted by 100+ companies worldwide"
  }
}
```

---

## 5. Implementation Requirements

### Backend (CTO/Backend Dev)

- Prisma model: `ReferralCode` (code, userId, organizationId, clicks, signups, conversions, createdAt)
- Prisma model: `ReferralReward` (id, referrerId, refereeId, amount, status: pending/paid, createdAt)
- API: `POST /api/referral/claim` — apply referral code on signup
- API: `GET /api/referral/stats` — referral dashboard stats
- Webhook: on first payment → credit referrer 20%
- Fraud: IP/domain dedup check

### Frontend

- Referral settings page at `/[locale]/settings/referrals`
- Invite email template
- Referral landing page at `/[locale]/refer`
- Dashboard banner component

### Marketing (CMO — DONE)

- [x] Spec document + marketing copy
- [x] i18n keys in all 5 locales
- [ ] Ongoing: track referral performance, optimize messaging

---

## 6. Tracking KPIs

| Metric                       | Target (Month 1) |
| ---------------------------- | ---------------- |
| Referral link clicks         | 500              |
| Referral signups             | 50               |
| Referral conversions         | 10               |
| Revenue from referrals       | $200             |
| Referral virality (K-factor) | > 0.3            |
