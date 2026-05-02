# Social Proof Setup Plan

## 1. G2 Profile Setup

**Steps:**

1. Go to https://www.g2.com/products/new → Create listing for "AACsearch"
2. Category: "Site Search Software" + "Enterprise Search Software"
3. Fill company details:
    - Product name: AACsearch
    - Tagline: "Hosted search-as-a-service powered by Typesense"
    - Website: https://aacsearch.com
    - Pricing URL: https://aacsearch.com/pricing
    - HQ location: (founder's location)
4. Claim the listing with work email
5. Invite initial reviewers from early users (see case study candidates)
6. Add G2 badge to marketing site after 5+ reviews

**G2 Badge Placement:**

- Homepage hero section (below CTA)
- /pricing page (trust signal near pricing cards)
- /features/ pages (sidebar or footer)

---

## 2. Trustpilot Profile Setup

**Steps:**

1. Go to https://business.trustpilot.com → Create free business account
2. Domain: aacsearch.com
3. Company name: AACsearch
4. Business category: Software / SaaS
5. Configure automated review invitation emails (trigger after 14 days active use)

---

## 3. In-App Testimonial Collection

**Collect testimonials automatically via the SaaS app:**

- Trigger: Day 30 after signup + ≥5 searches performed + not cancelled
- Modal: "How would you describe AACsearch in one sentence?"
- Optional follow-up: "Can we feature your quote on our website?"
- Store consent in database (boolean flag)
- Feed approved quotes to homepage testimonial carousel

**Manual outreach priority (from case study template):**

1. E-commerce store — quantitative results (conversion, speed)
2. SaaS platform — cost savings and dev experience
3. Agency/consultant — client delivery success story

---

## 4. Website Trust Signals

| Element              | Location           | When                             |
| -------------------- | ------------------ | -------------------------------- |
| Customer logo wall   | Homepage           | After 3+ approved logos          |
| Testimonial carousel | Homepage / Pricing | After 5+ quotes collected        |
| G2 rating badge      | Homepage hero      | After 5+ G2 reviews              |
| Trustpilot score     | Footer / Pricing   | After 10+ reviews                |
| Case study cards     | /case-studies page | After 1 case study published     |
| "Trusted by" counter | Homepage           | Can use total user count anytime |

---

## 5. Review Request Automation

**Timeline after user activation:**

| Day  | Action                           |
| ---- | -------------------------------- |
| D+14 | In-app NPS survey (1-10)         |
| D+30 | Testimonial request (if NPS ≥ 8) |
| D+45 | G2 review request email          |
| D+60 | Trustpilot review request        |

**Email template for review requests:**

```
Subject: Help us improve — review AACsearch on G2

Hi {name},

Thanks for being an AACsearch user! We'd love your honest feedback on G2.

It takes 2 minutes and helps other teams find the right search solution.

[Review on G2 →]

As a thank you: reply with your review link and we'll add a month free to your account.

Best,
Alex & the AACsearch team
```
