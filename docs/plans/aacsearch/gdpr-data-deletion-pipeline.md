# GDPR Data Deletion Pipeline — Design Document

**Issue:** AAC-859
**Status:** Design (seeking approval)
**Requires:** Schema changes (Invariant 9) — pending approval

---

## 1. Overview

GDPR Article 17 (Right to Erasure / "Right to be Forgotten") requires that users can
request deletion of their personal data. The pipeline must:

1. Delete or anonymize all user personal data across the system
2. Handle both Postgres (Prisma) and Typesense (search engine) data
3. Gracefully handle organization ownership (org data is NOT user data)
4. Provide a grace period (30 days) before permanent deletion
5. Retain only legally required data (financial records: 5-7 years)

The current `Better Auth deleteUser` plugin handles only auth-level deletion.
The pipeline extends this to cover the full data footprint.

---

## 2. Data Classification

### Category A: Delete Immediately (personal auth data)

| Table      | Records | Action  | Notes                    |
| ---------- | ------- | ------- | ------------------------ |
| User       | Primary | Delete  | Personal profile         |
| Session    | Related | Cascade | Invalidates all sessions |
| Account    | Related | Cascade | OAuth/providers          |
| Passkey    | Related | Cascade | FIDO2 credentials        |
| TwoFactor  | Related | Cascade | TOTP setup               |
| Invitation | Related | Cascade | Sent invites             |

These already cascade from User. Better Auth handles most of this.

### Category B: Anonymize (keep record, remove personal identifiers)

| Table             | Action    | Replacement                                       |
| ----------------- | --------- | ------------------------------------------------- |
| AuditLog          | Anonymize | userId → NULL, userAgent → NULL, ipAddress → NULL |
| Purchase          | Anonymize | Keep financial data, remove userId link           |
| NpsSurveyResponse | Anonymize | userId → NULL, remove feedback text               |
| KnowledgeSpace    | Anonymize | If user-owned: userId → NULL (keep if org-owned)  |

### Category C: Org-owned (transfer or flag)

| Table              | Action    | Notes                                     |
| ------------------ | --------- | ----------------------------------------- |
| Member             | Delete    | Cascade from User. If last member: notify |
| SearchIndex        | Transfer  | Belongs to org, assign to org owner       |
| SearchApiKey       | No change | Belongs to org                            |
| ImportJob          | No change | Belongs to org                            |
| Connector          | No change | Belongs to org                            |
| WidgetEmbed        | No change | Belongs to org                            |
| Collection         | No change | Belongs to org                            |
| SearchIngestBuffer | No change | Belongs to org                            |
| SearchUsageEvent   | No change | Belongs to org (aggregate only)           |
| SearchQueryLog     | No change | Belongs to org                            |
| AnalyticsEvent     | No change | Belongs to org                            |

### Category D: Financial (retained by law)

| Table                | Action    | Notes                                                                    |
| -------------------- | --------- | ------------------------------------------------------------------------ |
| Purchase             | Anonymize | Required 5-7 years for tax. Link to user replaced with anonymized marker |
| PaymentProviderEvent | No change | Payment provider event log                                               |
| AiWallet/AiWalletTx  | Anonymize | Record exists, userId → anonymized                                       |

### Category E: Marketing (delete only)

| Table                | Action | Notes                   |
| -------------------- | ------ | ----------------------- |
| NewsletterSubscriber | Delete | Email-based, no user FK |
| SalesLead            | Delete | Email-based, no user FK |

---

## 3. Schema Changes Required (need approval)

### 3.1. New model: `UserDeletionRequest`

```prisma
model UserDeletionRequest {
  id                   String    @id @default(cuid())
  userId               String    @unique
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  reason               String?
  retentionUntil       DateTime  // 30-day grace period
  status               String    @default("pending") // pending | approved | cancelled | completed
  cancellationToken    String    @unique             // For cancellation within grace period
  completedAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([status, retentionUntil])
  @@map("user_deletion_request")
}
```

### 3.2. Add `anonymized` flag to User model

```prisma
model User {
  // ... existing fields ...
  anonymized Boolean  @default(false)
}
```

### 3.3. Make `userId` nullable on specific models (optional — can use NULL as anonymization)

For models that currently have `userId String` (not optional):

- `AuditLog.userId` — already has user relation with cascade. We can set userId to a deleted-user sentinel instead.
- `NpsSurveyResponse.userId` — already cascade. Switch to nullable or use deleted-user sentinel.

**Alternative (preferred): Sentinel user approach**

Rather than nullable FK changes (which require migrations), create a single
"deleted-user" sentinel record (UUID: `00000000-0000-0000-0000-000000000000`)
and reassign anonymized records to this sentinel. No FK nullability changes needed.

---

## 4. Deletion Pipeline Flow

```
User clicks "Delete Account" in Settings
    │
    ▼
Step 1: Confirmation (existing DeleteAccountForm.tsx)
    │  - Show consequences (orgs, data loss)
    │  - Require confirm text entry
    │
    ▼
Step 2: Create UserDeletionRequest (grace period)
    │  - retentionUntil = now + 30 days
    │  - Save cancellationToken (for undo)
    │  - Send confirmation email
    │  - Invalidate all sessions (log out everywhere)
    │
    ▼
Step 3: Immediate anonymization
    │  - Replace name → "Deleted User"
    │  - Replace email → "deleted-{userId}@deleted.aacsearch.com"
    │  - Clear: image, displayUsername, banReason
    │  - Set: anonymized = true
    │
    ▼
Step 4: Better Auth deleteUser plugin fires
    │  - Cancels active subscriptions (already implemented)
    │  - Cascade deletes: Sessions, Accounts, Passkeys, 2FA
    │
    ▼
Step 5: Anonymize remaining records
    │  - AuditLog: userId → NULL (or sentinel)
    │  - Purchase: keep amounts, clear userId link
    │  - NpsSurveyResponse: clear userId + feedback
    │  - KnowledgeSpace: userId → NULL (user-owned only)
    │  - AiWallet: balance → 0, clear userId
    │  - Member: cascade delete (user leaves all orgs)
    │
    ▼
Step 6: Handle orphaned organizations
    │  - For each org where user was the last member:
    │    - Notify admin
    │    - If no members after 90 days: soft-delete
    │
    ▼
Step 7: After 30 days (cron job)
    │  - Find completed/expired deletion requests
    │  - Permanently delete User row (cascade cleanup)
    │  - Typesense: delete user-owned docs/indices
    │
    ▼
Step 8: Notify user + log audit event
```

---

## 5. API Procedures (oRPC)

### 5.1. `user.requestDeletion`

- **Auth:** Protected (logged-in user)
- **Body:** `{ reason?: string }`
- **Flow:**
    1. Export user data automatically (GDPR Article 20, use existing `exportUserData`)
    2. Return download link for ZIP
    3. Create `UserDeletionRequest` with 30-day grace
    4. Immediate anonymization (Step 3 above)
    5. Return `{ success: true, deletionRequestId, retentionUntil, cancellationToken }`

### 5.2. `user.cancelDeletion`

- **Auth:** Protected
- **Body:** `{ cancellationToken: string }`
- **Flow:**
    1. Verify token matches the pending deletion request
    2. Delete the `UserDeletionRequest` record
    3. Restore user access (re-enable login, re-verify status)
    4. Log audit event

### 5.3. `admin.forceDeleteUser`

- **Auth:** Admin only
- **Body:** `{ userId: string, reason: string }`
- **Flow:** Immediate deletion without grace period

### 5.4. Cron: `process-pending-deletions`

- Runs daily
- Finds `UserDeletionRequest` where `retentionUntil < now()` and `status = 'pending'`
- Performs final deletion and cleanup

---

## 6. Typesense Cleanup

When a user is permanently deleted (after grace period):

1. If user was sole creator of an org: flag the org's indices for review
2. The user's knowledge spaces with `userId` set are already handled by cascade
3. Search documents are org-owned — no Typesense action needed for user deletion

For org-level deletion (out of scope for this issue): delete Typesense collections.

---

## 7. Edge Cases

### 7.1. User is sole active member of an organization

- **Problem:** Deleting the last member leaves an org with no access
- **Solution:** Before cascade-deleting Member, check if org has other members
    - If last member: preserve org in "frozen" state, notify admin, allow transfer
    - If org has billing: prevent deletion until subscription is cancelled

### 7.2. User has active paid subscription

- **Solution:** Already handled — Better Auth middleware cancels subscriptions before
  proceeding with deletion (auth.ts lines 156-174)

### 7.3. User cancels deletion during grace period

- **Solution:** `cancelDeletion` restores login access + renames user back
    - However, anonymized data cannot be restored. The user profile is restored
      from a backup snapshot created at request time

### 7.4. User has `AiWallet` with balance

- **Solution:** Zero out balance and clear userId before permanent deletion

### 7.5. User requests deletion via support (not self-service)

- **Solution:** Admin can trigger `forceDeleteUser` — same pipeline, no grace period

---

## 8. Implementation Plan

### Phase 1: Schema (requires approval)

1. Add `UserDeletionRequest` model
2. Add `anonymized` field to User
3. Run `npx prisma migrate dev --name add_gdpr_deletion`

### Phase 2: Database queries

1. Extend `packages/database/prisma/queries/users.ts`:
    - `createDeletionRequest(userId, reason)` → creates grace-period request
    - `cancelDeletionRequest(cancellationToken)` → cancels pending deletion
    - `anonymizeUserData(userId)` → immediately anonymize personal fields
    - `finalizeUserDeletion(deletionRequestId)` → after grace period
    - `getPendingDeletionRequests()` → for cron job
    - `getUserOrganizations(userId)` → check org membership status

### Phase 3: API procedures

1. Add to `packages/api/modules/users/procedures/`:
    - `request-deletion.ts`
    - `cancel-deletion.ts`
2. Add to `packages/api/modules/admin/procedures/`:
    - `force-delete-user.ts` (if admin router exists)
3. Add cron route at `apps/saas/app/api/cron/process-pending-deletions/route.ts`

### Phase 4: UI components

1. Update `DeleteAccountForm.tsx` with:
    - Data export prompt before deletion
    - Confirmation with "type DELETE to confirm"
    - Grace period explanation
    - Cancellation flow
2. Admin panel: user management with force-delete option
3. Email notifications: deletion confirmation, grace period reminder, deletion complete

### Phase 5: Email notifications

1. Deletion confirmation with cancellation link
2. Grace period reminder (7 days before expiry)
3. Final deletion notice
4. Export data download link

---

## 9. Verification

- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes (0 errors, 0 warnings)
- [ ] Migration applies cleanly
- [ ] Unit tests for query functions
- [ ] E2E test: request → cancel → restore
- [ ] E2E test: request → wait grace → final deletion
- [ ] Verify no orphaned references after deletion
- [ ] Verify Typesense data remains for org-owned indices
- [ ] Verify financial records are preserved (anonymized)

---

## 10. Open Questions / Risks

1. **Grace period UX**: Should anonymization be immediate or after grace period?
    - **Recommendation:** Immediate anonymization. The user committed to deletion.
      The grace period only allows cancellation of the _irreversible_ final step.
      Profile is anonymized, but a user who re-logs in can re-register normally.
      _This avoids data exposure during the grace period, which is important
      if the deletion was initiated due to account compromise._

2. **Sentinel user vs. nullable FK**: Adding nullable FKs requires Prisma schema
   changes on AuditLog, Purchase, NpsSurveyResponse. The sentinel approach avoids
   this entirely.

3. **Search engine (Typesense) user data**: The PII audit found search query text
   stored in SearchUsageEvent metadata. Since these are org-owned and have no userId,
   they don't need deletion for user deletion. However, the related PII concern
   (FINDING-2 in the audit) should be addressed separately.
