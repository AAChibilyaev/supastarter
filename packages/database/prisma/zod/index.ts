/**
 * Prisma Zod Generator - Single File (inlined)
 * Auto-generated. Do not edit.
 */

import * as z from 'zod';
// File: TransactionIsolationLevel.schema.ts

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted', 'ReadCommitted', 'RepeatableRead', 'Serializable'])

export type TransactionIsolationLevel = z.infer<typeof TransactionIsolationLevelSchema>;

// File: UserScalarFieldEnum.schema.ts

export const UserScalarFieldEnumSchema = z.enum(['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt', 'username', 'role', 'banned', 'banReason', 'banExpires', 'onboardingComplete', 'paymentsCustomerId', 'locale', 'displayUsername', 'twoFactorEnabled', 'lastActiveOrganizationId'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;

// File: SessionScalarFieldEnum.schema.ts

export const SessionScalarFieldEnumSchema = z.enum(['id', 'expiresAt', 'ipAddress', 'userAgent', 'userId', 'impersonatedBy', 'activeOrganizationId', 'token', 'createdAt', 'updatedAt'])

export type SessionScalarFieldEnum = z.infer<typeof SessionScalarFieldEnumSchema>;

// File: AccountScalarFieldEnum.schema.ts

export const AccountScalarFieldEnumSchema = z.enum(['id', 'accountId', 'providerId', 'userId', 'accessToken', 'refreshToken', 'idToken', 'expiresAt', 'password', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'scope', 'createdAt', 'updatedAt'])

export type AccountScalarFieldEnum = z.infer<typeof AccountScalarFieldEnumSchema>;

// File: VerificationScalarFieldEnum.schema.ts

export const VerificationScalarFieldEnumSchema = z.enum(['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'])

export type VerificationScalarFieldEnum = z.infer<typeof VerificationScalarFieldEnumSchema>;

// File: PasskeyScalarFieldEnum.schema.ts

export const PasskeyScalarFieldEnumSchema = z.enum(['id', 'name', 'publicKey', 'userId', 'credentialID', 'counter', 'deviceType', 'backedUp', 'transports', 'aaguid', 'createdAt'])

export type PasskeyScalarFieldEnum = z.infer<typeof PasskeyScalarFieldEnumSchema>;

// File: TwoFactorScalarFieldEnum.schema.ts

export const TwoFactorScalarFieldEnumSchema = z.enum(['id', 'secret', 'backupCodes', 'userId'])

export type TwoFactorScalarFieldEnum = z.infer<typeof TwoFactorScalarFieldEnumSchema>;

// File: OrganizationScalarFieldEnum.schema.ts

export const OrganizationScalarFieldEnumSchema = z.enum(['id', 'name', 'slug', 'logo', 'createdAt', 'metadata', 'paymentsCustomerId'])

export type OrganizationScalarFieldEnum = z.infer<typeof OrganizationScalarFieldEnumSchema>;

// File: MemberScalarFieldEnum.schema.ts

export const MemberScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'userId', 'role', 'createdAt'])

export type MemberScalarFieldEnum = z.infer<typeof MemberScalarFieldEnumSchema>;

// File: InvitationScalarFieldEnum.schema.ts

export const InvitationScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'email', 'role', 'status', 'expiresAt', 'inviterId', 'createdAt'])

export type InvitationScalarFieldEnum = z.infer<typeof InvitationScalarFieldEnumSchema>;

// File: PurchaseScalarFieldEnum.schema.ts

export const PurchaseScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'userId', 'type', 'customerId', 'subscriptionId', 'priceId', 'status', 'createdAt', 'updatedAt'])

export type PurchaseScalarFieldEnum = z.infer<typeof PurchaseScalarFieldEnumSchema>;

// File: NotificationScalarFieldEnum.schema.ts

export const NotificationScalarFieldEnumSchema = z.enum(['id', 'userId', 'type', 'data', 'link', 'read', 'createdAt', 'updatedAt'])

export type NotificationScalarFieldEnum = z.infer<typeof NotificationScalarFieldEnumSchema>;

// File: UserNotificationPreferenceScalarFieldEnum.schema.ts

export const UserNotificationPreferenceScalarFieldEnumSchema = z.enum(['id', 'userId', 'type', 'target', 'createdAt'])

export type UserNotificationPreferenceScalarFieldEnum = z.infer<typeof UserNotificationPreferenceScalarFieldEnumSchema>;

// File: SearchIndexScalarFieldEnum.schema.ts

export const SearchIndexScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'slug', 'displayName', 'schema', 'version', 'enabled', 'createdAt', 'updatedAt'])

export type SearchIndexScalarFieldEnum = z.infer<typeof SearchIndexScalarFieldEnumSchema>;

// File: SearchApiKeyScalarFieldEnum.schema.ts

export const SearchApiKeyScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'name', 'prefix', 'hash', 'scopes', 'expiresAt', 'revokedAt', 'lastUsedAt', 'createdAt'])

export type SearchApiKeyScalarFieldEnum = z.infer<typeof SearchApiKeyScalarFieldEnumSchema>;

// File: SearchUsageEventScalarFieldEnum.schema.ts

export const SearchUsageEventScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'type', 'count', 'createdAt'])

export type SearchUsageEventScalarFieldEnum = z.infer<typeof SearchUsageEventScalarFieldEnumSchema>;

// File: SearchIngestBufferScalarFieldEnum.schema.ts

export const SearchIngestBufferScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'action', 'document', 'processedAt', 'createdAt'])

export type SearchIngestBufferScalarFieldEnum = z.infer<typeof SearchIngestBufferScalarFieldEnumSchema>;

// File: AiWalletScalarFieldEnum.schema.ts

export const AiWalletScalarFieldEnumSchema = z.enum(['id', 'userId', 'organizationId', 'currency', 'availableBalanceKopecks', 'reservedBalanceKopecks', 'includedMonthlyLimitKopecks', 'includedUsedPeriodKopecks', 'promoBalanceKopecks', 'overageLimitKopecks', 'overageUsedKopecks', 'status', 'periodStart', 'periodEnd', 'createdAt', 'updatedAt'])

export type AiWalletScalarFieldEnum = z.infer<typeof AiWalletScalarFieldEnumSchema>;

// File: AiWalletTransactionScalarFieldEnum.schema.ts

export const AiWalletTransactionScalarFieldEnumSchema = z.enum(['id', 'walletId', 'userId', 'organizationId', 'projectId', 'type', 'direction', 'amountKopecks', 'currency', 'source', 'usageEventId', 'reservationId', 'topupOrderId', 'idempotencyKey', 'metadata', 'createdAt'])

export type AiWalletTransactionScalarFieldEnum = z.infer<typeof AiWalletTransactionScalarFieldEnumSchema>;

// File: AiQuotaReservationScalarFieldEnum.schema.ts

export const AiQuotaReservationScalarFieldEnumSchema = z.enum(['id', 'walletId', 'userId', 'organizationId', 'projectId', 'apiKeyId', 'operation', 'estimatedAmountKopecks', 'status', 'expiresAt', 'committedAt', 'releasedAt', 'metadata', 'createdAt'])

export type AiQuotaReservationScalarFieldEnum = z.infer<typeof AiQuotaReservationScalarFieldEnumSchema>;

// File: AiUsageEventScalarFieldEnum.schema.ts

export const AiUsageEventScalarFieldEnumSchema = z.enum(['id', 'walletId', 'userId', 'organizationId', 'projectId', 'apiKeyId', 'reservationId', 'operation', 'provider', 'model', 'status', 'promptTokens', 'completionTokens', 'totalTokens', 'inputCostKopecks', 'outputCostKopecks', 'flatFeeKopecks', 'markupBps', 'totalChargeKopecks', 'providerCostUsdMicros', 'fxRateRubPerUsdMicros', 'pricingRuleId', 'requestId', 'idempotencyKey', 'metadata', 'createdAt'])

export type AiUsageEventScalarFieldEnum = z.infer<typeof AiUsageEventScalarFieldEnumSchema>;

// File: AiPricingRuleScalarFieldEnum.schema.ts

export const AiPricingRuleScalarFieldEnumSchema = z.enum(['id', 'provider', 'model', 'operation', 'currency', 'inputPer1MTokensKopecks', 'outputPer1MTokensKopecks', 'embeddingPer1MTokensKopecks', 'flatFeeKopecks', 'markupBps', 'effectiveFrom', 'effectiveTo', 'notes', 'createdByUserId', 'createdAt'])

export type AiPricingRuleScalarFieldEnum = z.infer<typeof AiPricingRuleScalarFieldEnumSchema>;

// File: FxRateScalarFieldEnum.schema.ts

export const FxRateScalarFieldEnumSchema = z.enum(['id', 'pair', 'ratePer1UnitMicros', 'source', 'effectiveAt', 'createdAt'])

export type FxRateScalarFieldEnum = z.infer<typeof FxRateScalarFieldEnumSchema>;

// File: WalletTopupOrderScalarFieldEnum.schema.ts

export const WalletTopupOrderScalarFieldEnumSchema = z.enum(['id', 'walletId', 'userId', 'organizationId', 'provider', 'amountKopecks', 'currency', 'status', 'paymentLinkUrl', 'providerPaymentId', 'providerOperationId', 'providerCustomerId', 'initiatedByUserId', 'idempotencyKey', 'metadata', 'expiresAt', 'paidAt', 'createdAt', 'updatedAt'])

export type WalletTopupOrderScalarFieldEnum = z.infer<typeof WalletTopupOrderScalarFieldEnumSchema>;

// File: PaymentProviderEventScalarFieldEnum.schema.ts

export const PaymentProviderEventScalarFieldEnumSchema = z.enum(['id', 'provider', 'eventType', 'providerEventId', 'signatureValid', 'rawPayload', 'idempotencyKey', 'topupOrderId', 'processedAt', 'processingError', 'createdAt'])

export type PaymentProviderEventScalarFieldEnum = z.infer<typeof PaymentProviderEventScalarFieldEnumSchema>;

// File: SortOrder.schema.ts

export const SortOrderSchema = z.enum(['asc', 'desc'])

export type SortOrder = z.infer<typeof SortOrderSchema>;

// File: JsonNullValueInput.schema.ts

export const JsonNullValueInputSchema = z.enum(['JsonNull'])

export type JsonNullValueInput = z.infer<typeof JsonNullValueInputSchema>;

// File: NullableJsonNullValueInput.schema.ts

export const NullableJsonNullValueInputSchema = z.enum(['DbNull', 'JsonNull'])

export type NullableJsonNullValueInput = z.infer<typeof NullableJsonNullValueInputSchema>;

// File: QueryMode.schema.ts

export const QueryModeSchema = z.enum(['default', 'insensitive'])

export type QueryMode = z.infer<typeof QueryModeSchema>;

// File: NullsOrder.schema.ts

export const NullsOrderSchema = z.enum(['first', 'last'])

export type NullsOrder = z.infer<typeof NullsOrderSchema>;

// File: JsonNullValueFilter.schema.ts

export const JsonNullValueFilterSchema = z.enum(['DbNull', 'JsonNull', 'AnyNull'])

export type JsonNullValueFilter = z.infer<typeof JsonNullValueFilterSchema>;

// File: PurchaseType.schema.ts

export const PurchaseTypeSchema = z.enum(['SUBSCRIPTION', 'ONE_TIME'])

export type PurchaseType = z.infer<typeof PurchaseTypeSchema>;

// File: NotificationType.schema.ts

export const NotificationTypeSchema = z.enum(['WELCOME', 'APP_UPDATE', 'AI_LOW_BALANCE', 'AI_TOPUP_PAID', 'AI_TOPUP_FAILED', 'AI_OVERAGE_REACHED'])

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// File: NotificationTarget.schema.ts

export const NotificationTargetSchema = z.enum(['IN_APP', 'EMAIL'])

export type NotificationTarget = z.infer<typeof NotificationTargetSchema>;

// File: User.schema.ts

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  username: z.string().nullish(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
  banReason: z.string().nullish(),
  banExpires: z.date().nullish(),
  onboardingComplete: z.boolean(),
  paymentsCustomerId: z.string().nullish(),
  locale: z.string().nullish(),
  displayUsername: z.string().nullish(),
  twoFactorEnabled: z.boolean().nullish(),
  lastActiveOrganizationId: z.string().nullish(),
});

export type UserType = z.infer<typeof UserSchema>;


// File: Session.schema.ts

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.date(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  userId: z.string(),
  impersonatedBy: z.string().nullish(),
  activeOrganizationId: z.string().nullish(),
  token: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SessionType = z.infer<typeof SessionSchema>;


// File: Account.schema.ts

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullish(),
  refreshToken: z.string().nullish(),
  idToken: z.string().nullish(),
  expiresAt: z.date().nullish(),
  password: z.string().nullish(),
  accessTokenExpiresAt: z.date().nullish(),
  refreshTokenExpiresAt: z.date().nullish(),
  scope: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AccountType = z.infer<typeof AccountSchema>;


// File: Verification.schema.ts

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.date(),
  createdAt: z.date().nullish(),
  updatedAt: z.date().nullish(),
});

export type VerificationType = z.infer<typeof VerificationSchema>;


// File: Passkey.schema.ts

export const PasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  publicKey: z.string(),
  userId: z.string(),
  credentialID: z.string(),
  counter: z.number().int(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullish(),
  aaguid: z.string().nullish(),
  createdAt: z.date().nullish(),
});

export type PasskeyType = z.infer<typeof PasskeySchema>;


// File: TwoFactor.schema.ts

export const TwoFactorSchema = z.object({
  id: z.string(),
  secret: z.string(),
  backupCodes: z.string(),
  userId: z.string(),
});

export type TwoFactorType = z.infer<typeof TwoFactorSchema>;


// File: Organization.schema.ts

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullish(),
  logo: z.string().nullish(),
  createdAt: z.date(),
  metadata: z.string().nullish(),
  paymentsCustomerId: z.string().nullish(),
});

export type OrganizationType = z.infer<typeof OrganizationSchema>;


// File: Member.schema.ts

export const MemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.date(),
});

export type MemberType = z.infer<typeof MemberSchema>;


// File: Invitation.schema.ts

export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string().nullish(),
  status: z.string(),
  expiresAt: z.date(),
  inviterId: z.string(),
  createdAt: z.date(),
});

export type InvitationType = z.infer<typeof InvitationSchema>;


// File: Purchase.schema.ts

export const PurchaseSchema = z.object({
  id: z.string(),
  organizationId: z.string().nullish(),
  userId: z.string().nullish(),
  type: PurchaseTypeSchema,
  customerId: z.string(),
  subscriptionId: z.string().nullish(),
  priceId: z.string(),
  status: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PurchaseModel = z.infer<typeof PurchaseSchema>;

// File: Notification.schema.ts

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  data: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  link: z.string().nullish(),
  read: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type NotificationModel = z.infer<typeof NotificationSchema>;

// File: UserNotificationPreference.schema.ts

export const UserNotificationPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationTypeSchema,
  target: NotificationTargetSchema,
  createdAt: z.date(),
});

export type UserNotificationPreferenceType = z.infer<typeof UserNotificationPreferenceSchema>;


// File: SearchIndex.schema.ts

export const SearchIndexSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slug: z.string(),
  displayName: z.string(),
  schema: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  version: z.number().int().default(1),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SearchIndexType = z.infer<typeof SearchIndexSchema>;


// File: SearchApiKey.schema.ts

export const SearchApiKeySchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  prefix: z.string(),
  hash: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.date().nullish(),
  revokedAt: z.date().nullish(),
  lastUsedAt: z.date().nullish(),
  createdAt: z.date(),
});

export type SearchApiKeyType = z.infer<typeof SearchApiKeySchema>;


// File: SearchUsageEvent.schema.ts

export const SearchUsageEventSchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  type: z.string(),
  count: z.number().int().default(1),
  createdAt: z.date(),
});

export type SearchUsageEventType = z.infer<typeof SearchUsageEventSchema>;


// File: SearchIngestBuffer.schema.ts

export const SearchIngestBufferSchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  action: z.string(),
  document: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  processedAt: z.date().nullish(),
  createdAt: z.date(),
});

export type SearchIngestBufferType = z.infer<typeof SearchIngestBufferSchema>;


// File: AiWallet.schema.ts

export const AiWalletSchema = z.object({
  id: z.string(),
  userId: z.string().nullish(),
  organizationId: z.string().nullish(),
  currency: z.string().default("RUB"),
  availableBalanceKopecks: z.bigint().default(BigInt(0)),
  reservedBalanceKopecks: z.bigint().default(BigInt(0)),
  includedMonthlyLimitKopecks: z.bigint().default(BigInt(0)),
  includedUsedPeriodKopecks: z.bigint().default(BigInt(0)),
  promoBalanceKopecks: z.bigint().default(BigInt(0)),
  overageLimitKopecks: z.bigint().default(BigInt(0)),
  overageUsedKopecks: z.bigint().default(BigInt(0)),
  status: z.string().default("active"),
  periodStart: z.date(),
  periodEnd: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AiWalletType = z.infer<typeof AiWalletSchema>;


// File: AiWalletTransaction.schema.ts

export const AiWalletTransactionSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  userId: z.string().nullish(),
  organizationId: z.string().nullish(),
  projectId: z.string().nullish(),
  type: z.string(),
  direction: z.string(),
  amountKopecks: z.bigint(),
  currency: z.string().default("RUB"),
  source: z.string(),
  usageEventId: z.string().nullish(),
  reservationId: z.string().nullish(),
  topupOrderId: z.string().nullish(),
  idempotencyKey: z.string(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  createdAt: z.date(),
});

export type AiWalletTransactionType = z.infer<typeof AiWalletTransactionSchema>;


// File: AiQuotaReservation.schema.ts

export const AiQuotaReservationSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  userId: z.string().nullish(),
  organizationId: z.string().nullish(),
  projectId: z.string().nullish(),
  apiKeyId: z.string().nullish(),
  operation: z.string(),
  estimatedAmountKopecks: z.bigint(),
  status: z.string().default("active"),
  expiresAt: z.date(),
  committedAt: z.date().nullish(),
  releasedAt: z.date().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  createdAt: z.date(),
});

export type AiQuotaReservationType = z.infer<typeof AiQuotaReservationSchema>;


// File: AiUsageEvent.schema.ts

export const AiUsageEventSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  userId: z.string().nullish(),
  organizationId: z.string().nullish(),
  projectId: z.string().nullish(),
  apiKeyId: z.string().nullish(),
  reservationId: z.string().nullish(),
  operation: z.string(),
  provider: z.string(),
  model: z.string(),
  status: z.string(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  inputCostKopecks: z.bigint().default(BigInt(0)),
  outputCostKopecks: z.bigint().default(BigInt(0)),
  flatFeeKopecks: z.bigint().default(BigInt(0)),
  markupBps: z.number().int(),
  totalChargeKopecks: z.bigint().default(BigInt(0)),
  providerCostUsdMicros: z.bigint().default(BigInt(0)),
  fxRateRubPerUsdMicros: z.bigint().default(BigInt(0)),
  pricingRuleId: z.string().nullish(),
  requestId: z.string().nullish(),
  idempotencyKey: z.string(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  createdAt: z.date(),
});

export type AiUsageEventType = z.infer<typeof AiUsageEventSchema>;


// File: AiPricingRule.schema.ts

export const AiPricingRuleSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  operation: z.string(),
  currency: z.string().default("RUB"),
  inputPer1MTokensKopecks: z.bigint().nullish(),
  outputPer1MTokensKopecks: z.bigint().nullish(),
  embeddingPer1MTokensKopecks: z.bigint().nullish(),
  flatFeeKopecks: z.bigint().default(BigInt(0)),
  markupBps: z.number().int().default(2000),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullish(),
  notes: z.string().nullish(),
  createdByUserId: z.string().nullish(),
  createdAt: z.date(),
});

export type AiPricingRuleType = z.infer<typeof AiPricingRuleSchema>;


// File: FxRate.schema.ts

export const FxRateSchema = z.object({
  id: z.string(),
  pair: z.string(),
  ratePer1UnitMicros: z.bigint(),
  source: z.string(),
  effectiveAt: z.date(),
  createdAt: z.date(),
});

export type FxRateType = z.infer<typeof FxRateSchema>;


// File: WalletTopupOrder.schema.ts

export const WalletTopupOrderSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  userId: z.string().nullish(),
  organizationId: z.string().nullish(),
  provider: z.string(),
  amountKopecks: z.bigint(),
  currency: z.string().default("RUB"),
  status: z.string().default("created"),
  paymentLinkUrl: z.string().nullish(),
  providerPaymentId: z.string().nullish(),
  providerOperationId: z.string().nullish(),
  providerCustomerId: z.string().nullish(),
  initiatedByUserId: z.string().nullish(),
  idempotencyKey: z.string(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  expiresAt: z.date().nullish(),
  paidAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WalletTopupOrderType = z.infer<typeof WalletTopupOrderSchema>;


// File: PaymentProviderEvent.schema.ts

export const PaymentProviderEventSchema = z.object({
  id: z.string(),
  provider: z.string(),
  eventType: z.string(),
  providerEventId: z.string().nullish(),
  signatureValid: z.boolean(),
  rawPayload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  idempotencyKey: z.string(),
  topupOrderId: z.string().nullish(),
  processedAt: z.date().nullish(),
  processingError: z.string().nullish(),
  createdAt: z.date(),
});

export type PaymentProviderEventType = z.infer<typeof PaymentProviderEventSchema>;

