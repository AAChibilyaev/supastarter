# AAC-177 — Remaining Scope: Roadmap Phases 3-6

## Status

- **EPIC**: AAC-177 (Public Roadmap & Feature Voting)
- **Phase 1 (AAC-457)**: DONE — /roadmap page with hardcoded data
- **Phase 2 (AAC-458)**: DONE — anonymous voting via localStorage
- **Goal**: v0.5 Marketing Site Launch
- **Owner**: CMO (9640429d)

---

## Phase 3: Admin Panel — /admin/roadmap

**Goal**: Allow internal team to manage roadmap items without code changes.

**Requirements**:
- Route: `apps/marketing/app/[locale]/admin/roadmap/page.tsx`
- Authentication: protect with existing admin middleware / role check
- Features:
  - List all roadmap items with status, vote count, quarter
  - Add new item: title, description, status dropdown (shipped/inProgress/planned), quarter, icon selector
  - Edit existing item: all fields editable
  - Reorder items within a status group (drag-and-drop or move up/down)
  - Delete item with confirmation
- Data: currently hardcoded in RoadmapGrid.tsx — Phase 3 can keep hardcoded data OR implement Prisma model (Phase 6)
- i18n: admin UI labels in `admin.json` under `roadmap` key

**CMO Deliverable**: UX copy for admin panel buttons, labels, confirmation messages
**Dev Deliverable**: Route, CRUD operations, form validation

---

## Phase 4: Email Capture on Vote

**Goal**: Convert anonymous voters into newsletter subscribers.

**Requirements**:
- When a user clicks "Vote" on a feature they haven't voted for yet, show an email capture modal (first time only)
- Modal content:
  - Title: "Shape what we build next"
  - Description: "Vote to prioritize features and get early access updates. Join 700+ search teams."
  - Email input field
  - "Subscribe & Vote" button
  - "No thanks, just vote" link (dismisses, allows voting anyway)
  - Privacy note: "No spam. Unsubscribe anytime."
- Backend: POST endpoint to store email in newsletter list (or Mailchimp/webhook)
- Cookie: track that user has been prompted (don't ask again)
- i18n: keys under `roadmap.emailCapture.*` in marketing.json (all 5 locales)

**CMO Deliverable**: Marketing copy for modal, email templates for follow-up
**Dev Deliverable**: Modal component, API endpoint, email storage/webhook

---

## Phase 5: Authenticated Voting

**Goal**: Allow logged-in SaaS users to vote and see their vote history.

**Requirements**:
- Check for authenticated session (Better Auth)
- If logged in: show real vote state from server
- If not logged in: keep anonymous localStorage voting (Phase 2)
- Authenticated votes are stored server-side (Prisma: `RoadmapVote` model — userId, roadmapItemKey, createdAt)
- Show "You voted" across sessions (not just localStorage)
- Vote count shows server-side total + anonymous local tally
- Backend API: `POST /api/roadmap/vote` and `DELETE /api/roadmap/vote`
- CTA for anonymous users: "Sign in to vote" (redirects to login)

**CMO Deliverable**: Login CTA copy, post-login redirect UX specification
**Dev Deliverable**: Prisma model, API routes, authenticated UI

---

## Phase 6: Status Updates + Changelog Link + Prisma Model

**Goal**: DB-backed roadmap data, status transitions linking to changelog.

**Requirements**:
- Prisma model `RoadmapItem`:
  - `id`, `key` (slug), `title`, `description`, `status` (enum: shipped, inProgress, planned), `quarter`, `iconName`, `voteCount`, `sortOrder`, `changelogSlug` (nullable), `createdAt`, `updatedAt`
- Migration: seed initial 12 items from hardcoded data
- Replace `ALL_ITEMS` constant in RoadmapGrid.tsx with server-side data fetch
- Status badge updates: when an item moves to "shipped", show a "See changelog →" link
- Link to `/changelog` (already exists as route)
- Admin panel (Phase 3) uses Prisma for CRUD
- i18n: existing `roadmap.items.*` keys remain, but status is now read from DB

**CMO Deliverable**: Changelog link copy, status transition descriptions
**Dev Deliverable**: Prisma model, migration, server data fetching

---

## Content Copy for Phase 4 (Email Capture)

### English (en)

```json
{
  "emailCapture": {
    "title": "Shape what we build next",
    "description": "Vote to prioritize features and get early access updates. Join 700+ search teams.",
    "placeholder": "you@company.com",
    "subscribeAndVote": "Subscribe & Vote",
    "skipAndVote": "No thanks, just vote",
    "privacy": "No spam. Unsubscribe anytime.",
    "success": "Thanks! Your vote is counted. Watch your inbox for updates."
  }
}
```

### German (de)

```json
{
  "emailCapture": {
    "title": "Gestalten Sie mit, was als Nächstes kommt",
    "description": "Stimmen Sie für Funktionen und erhalten Sie Early-Access-Updates. Schließen Sie sich 700+ Suchteams an.",
    "placeholder": "ihre@firma.de",
    "subscribeAndVote": "Abonnieren & Abstimmen",
    "skipAndVote": "Nein danke, nur abstimmen",
    "privacy": "Kein Spam. Jederzeit kündbar.",
    "success": "Danke! Ihre Stimme wurde gezählt. Prüfen Sie Ihren Posteingang für Updates."
  }
}
```

### Spanish (es)

```json
{
  "emailCapture": {
    "title": "Da forma a lo que construimos a continuación",
    "description": "Vota para priorizar funciones y recibe actualizaciones de acceso anticipado. Únete a más de 700 equipos de búsqueda.",
    "placeholder": "tu@empresa.es",
    "subscribeAndVote": "Suscribirse y Votar",
    "skipAndVote": "No gracias, solo votar",
    "privacy": "Sin spam. Cancela la suscripción en cualquier momento.",
    "success": "¡Gracias! Tu voto ha sido contado. Revisa tu bandeja de entrada para novedades."
  }
}
```

### French (fr)

```json
{
  "emailCapture": {
    "title": "Façonnez ce que nous construisons ensuite",
    "description": "Votez pour prioriser les fonctionnalités et recevez des mises à jour en avant-première. Rejoignez plus de 700 équipes de recherche.",
    "placeholder": "vous@entreprise.fr",
    "subscribeAndVote": "S'abonner et Voter",
    "skipAndVote": "Non merci, voter seulement",
    "privacy": "Pas de spam. Désabonnez-vous à tout moment.",
    "success": "Merci ! Votre vote a été compté. Surveillez votre boîte de réception."
  }
}
```

### Russian (ru)

```json
{
  "emailCapture": {
    "title": "Влияйте на наш роадмап",
    "description": "Голосуйте за функции и получайте ранний доступ. Присоединяйтесь к 700+ поисковым командам.",
    "placeholder": "you@company.ru",
    "subscribeAndVote": "Подписаться и голосовать",
    "skipAndVote": "Нет, спасибо, просто голосовать",
    "privacy": "Без спама. Отписка в любое время.",
    "success": "Спасибо! Ваш голос учтён. Следите за обновлениями в почте."
  }
}
```
