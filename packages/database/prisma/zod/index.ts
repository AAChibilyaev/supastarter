/**
 * Prisma Zod Generator - Single File (inlined)
 * Auto-generated. Do not edit.
 */

import * as z from 'zod';
// File: TransactionIsolationLevel.schema.ts

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted', 'ReadCommitted', 'RepeatableRead', 'Serializable'])

export type TransactionIsolationLevel = z.infer<typeof TransactionIsolationLevelSchema>;

// File: UserScalarFieldEnum.schema.ts

export const UserScalarFieldEnumSchema = z.enum(['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt', 'username', 'role', 'banned', 'banReason', 'banExpires', 'onboardingComplete', 'dripStartedAt', 'paymentsCustomerId', 'locale', 'displayUsername', 'anonymized', 'twoFactorEnabled', 'lastActiveOrganizationId'])

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

export const OrganizationScalarFieldEnumSchema = z.enum(['id', 'name', 'slug', 'logo', 'createdAt', 'trialEndsAt', 'metadata', 'paymentsCustomerId', 'storageRegion'])

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

// File: SearchIndexSynonymScalarFieldEnum.schema.ts

export const SearchIndexSynonymScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'root', 'synonym', 'locale', 'createdAt', 'updatedAt'])

export type SearchIndexSynonymScalarFieldEnum = z.infer<typeof SearchIndexSynonymScalarFieldEnumSchema>;

// File: SearchApiKeyScalarFieldEnum.schema.ts

export const SearchApiKeyScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'name', 'prefix', 'hash', 'scopes', 'allowedOrigins', 'rateLimitPerMinute', 'expiresAt', 'revokedAt', 'lastUsedAt', 'createdAt'])

export type SearchApiKeyScalarFieldEnum = z.infer<typeof SearchApiKeyScalarFieldEnumSchema>;

// File: SearchRateLimitBucketScalarFieldEnum.schema.ts

export const SearchRateLimitBucketScalarFieldEnumSchema = z.enum(['keyId', 'windowStart', 'count'])

export type SearchRateLimitBucketScalarFieldEnum = z.infer<typeof SearchRateLimitBucketScalarFieldEnumSchema>;

// File: SearchUsageEventScalarFieldEnum.schema.ts

export const SearchUsageEventScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'type', 'count', 'metadata', 'createdAt'])

export type SearchUsageEventScalarFieldEnum = z.infer<typeof SearchUsageEventScalarFieldEnumSchema>;

// File: SearchIngestBufferScalarFieldEnum.schema.ts

export const SearchIngestBufferScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'action', 'document', 'processedAt', 'attempts', 'lastError', 'nextRetryAt', 'createdAt'])

export type SearchIngestBufferScalarFieldEnum = z.infer<typeof SearchIngestBufferScalarFieldEnumSchema>;

// File: SearchConnectorSyncJobScalarFieldEnum.schema.ts

export const SearchConnectorSyncJobScalarFieldEnumSchema = z.enum(['id', 'indexId', 'organizationId', 'type', 'status', 'startedAt', 'finishedAt', 'durationMs', 'itemsCount', 'failuresCount', 'lastError', 'events', 'createdAt', 'updatedAt'])

export type SearchConnectorSyncJobScalarFieldEnum = z.infer<typeof SearchConnectorSyncJobScalarFieldEnumSchema>;

// File: ShopifyStoreScalarFieldEnum.schema.ts

export const ShopifyStoreScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'indexId', 'shop', 'accessToken', 'scopes', 'name', 'email', 'domain', 'installedAt', 'uninstalledAt', 'lastSyncAt', 'syncStatus', 'syncError', 'metadata', 'createdAt', 'updatedAt'])

export type ShopifyStoreScalarFieldEnum = z.infer<typeof ShopifyStoreScalarFieldEnumSchema>;

// File: KnowledgeSpaceScalarFieldEnum.schema.ts

export const KnowledgeSpaceScalarFieldEnumSchema = z.enum(['id', 'ownerType', 'userId', 'organizationId', 'slug', 'name', 'createdAt', 'updatedAt'])

export type KnowledgeSpaceScalarFieldEnum = z.infer<typeof KnowledgeSpaceScalarFieldEnumSchema>;

// File: DataSourceScalarFieldEnum.schema.ts

export const DataSourceScalarFieldEnumSchema = z.enum(['id', 'knowledgeSpaceId', 'sourceType', 'name', 'config', 'credentialRef', 'syncEnabled', 'lastSyncedAt', 'createdAt', 'updatedAt'])

export type DataSourceScalarFieldEnum = z.infer<typeof DataSourceScalarFieldEnumSchema>;

// File: IngestionJobScalarFieldEnum.schema.ts

export const IngestionJobScalarFieldEnumSchema = z.enum(['id', 'knowledgeSpaceId', 'dataSourceId', 'status', 'mode', 'inputMeta', 'totalItems', 'processedItems', 'failedItems', 'errorMessage', 'startedAt', 'finishedAt', 'createdAt', 'updatedAt'])

export type IngestionJobScalarFieldEnum = z.infer<typeof IngestionJobScalarFieldEnumSchema>;

// File: KnowledgeDocumentScalarFieldEnum.schema.ts

export const KnowledgeDocumentScalarFieldEnumSchema = z.enum(['id', 'knowledgeSpaceId', 'dataSourceId', 'externalId', 'sourceType', 'title', 'mimeType', 'language', 'contentText', 'metadata', 'version', 'checksum', 'createdAt', 'updatedAt'])

export type KnowledgeDocumentScalarFieldEnum = z.infer<typeof KnowledgeDocumentScalarFieldEnumSchema>;

// File: KnowledgeChunkScalarFieldEnum.schema.ts

export const KnowledgeChunkScalarFieldEnumSchema = z.enum(['id', 'knowledgeSpaceId', 'documentId', 'chunkIndex', 'text', 'tokenCount', 'embedding', 'metadata', 'createdAt', 'updatedAt'])

export type KnowledgeChunkScalarFieldEnum = z.infer<typeof KnowledgeChunkScalarFieldEnumSchema>;

// File: GraphNodeScalarFieldEnum.schema.ts

export const GraphNodeScalarFieldEnumSchema = z.enum(['id', 'knowledgeSpaceId', 'canonicalName', 'nodeType', 'metadata', 'createdAt', 'updatedAt'])

export type GraphNodeScalarFieldEnum = z.infer<typeof GraphNodeScalarFieldEnumSchema>;

// File: GraphEdgeScalarFieldEnum.schema.ts

export const GraphEdgeScalarFieldEnumSchema = z.enum(['id', 'knowledgeSpaceId', 'fromNodeId', 'toNodeId', 'relationType', 'weight', 'evidenceChunkId', 'metadata', 'createdAt'])

export type GraphEdgeScalarFieldEnum = z.infer<typeof GraphEdgeScalarFieldEnumSchema>;

// File: AiWalletScalarFieldEnum.schema.ts

export const AiWalletScalarFieldEnumSchema = z.enum(['id', 'userId', 'organizationId', 'currency', 'availableBalanceKopecks', 'reservedBalanceKopecks', 'includedMonthlyLimitKopecks', 'includedUsedPeriodKopecks', 'promoBalanceKopecks', 'overageLimitKopecks', 'overageUsedKopecks', 'autoRechargeEnabled', 'autoRechargeThresholdKopecks', 'autoRechargeAmountKopecks', 'status', 'periodStart', 'periodEnd', 'createdAt', 'updatedAt'])

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

// File: RoadmapItemScalarFieldEnum.schema.ts

export const RoadmapItemScalarFieldEnumSchema = z.enum(['id', 'key', 'title', 'description', 'status', 'quarter', 'iconName', 'voteCount', 'sortOrder', 'changelogSlug', 'createdAt', 'updatedAt'])

export type RoadmapItemScalarFieldEnum = z.infer<typeof RoadmapItemScalarFieldEnumSchema>;

// File: ActivationEventScalarFieldEnum.schema.ts

export const ActivationEventScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'eventType', 'completedAt', 'metadata'])

export type ActivationEventScalarFieldEnum = z.infer<typeof ActivationEventScalarFieldEnumSchema>;

// File: CollectionScalarFieldEnum.schema.ts

export const CollectionScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'slug', 'name', 'description', 'schema', 'documentCount', 'size', 'status', 'createdAt', 'updatedAt'])

export type CollectionScalarFieldEnum = z.infer<typeof CollectionScalarFieldEnumSchema>;

// File: CollectionDocumentScalarFieldEnum.schema.ts

export const CollectionDocumentScalarFieldEnumSchema = z.enum(['id', 'collectionId', 'organizationId', 'data', 'rowNumber', 'createdAt', 'updatedAt'])

export type CollectionDocumentScalarFieldEnum = z.infer<typeof CollectionDocumentScalarFieldEnumSchema>;

// File: NewsletterSubscriberScalarFieldEnum.schema.ts

export const NewsletterSubscriberScalarFieldEnumSchema = z.enum(['id', 'email', 'source', 'createdAt'])

export type NewsletterSubscriberScalarFieldEnum = z.infer<typeof NewsletterSubscriberScalarFieldEnumSchema>;

// File: NpsSurveyResponseScalarFieldEnum.schema.ts

export const NpsSurveyResponseScalarFieldEnumSchema = z.enum(['id', 'userId', 'organizationId', 'score', 'feedback', 'source', 'createdAt'])

export type NpsSurveyResponseScalarFieldEnum = z.infer<typeof NpsSurveyResponseScalarFieldEnumSchema>;

// File: AuditLogScalarFieldEnum.schema.ts

export const AuditLogScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'userId', 'action', 'targetType', 'targetId', 'details', 'ipAddress', 'userAgent', 'createdAt'])

export type AuditLogScalarFieldEnum = z.infer<typeof AuditLogScalarFieldEnumSchema>;

// File: FeatureFlagScalarFieldEnum.schema.ts

export const FeatureFlagScalarFieldEnumSchema = z.enum(['id', 'key', 'title', 'description', 'type', 'enabled', 'variantValues', 'variantDefault', 'rolloutPercentage', 'targetingRules', 'killSwitch', 'createdAt', 'updatedAt', 'createdBy'])

export type FeatureFlagScalarFieldEnum = z.infer<typeof FeatureFlagScalarFieldEnumSchema>;

// File: FeatureFlagOverrideScalarFieldEnum.schema.ts

export const FeatureFlagOverrideScalarFieldEnumSchema = z.enum(['id', 'flagId', 'organizationId', 'enabled', 'variantValue', 'reason'])

export type FeatureFlagOverrideScalarFieldEnum = z.infer<typeof FeatureFlagOverrideScalarFieldEnumSchema>;

// File: AssistantConversationScalarFieldEnum.schema.ts

export const AssistantConversationScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'userId', 'sessionId', 'mode', 'entryPoint', 'status', 'startedAt', 'lastMessageAt', 'resolvedAt', 'escalatedAt', 'messageCount', 'metadata'])

export type AssistantConversationScalarFieldEnum = z.infer<typeof AssistantConversationScalarFieldEnumSchema>;

// File: AssistantMessageScalarFieldEnum.schema.ts

export const AssistantMessageScalarFieldEnumSchema = z.enum(['id', 'conversationId', 'role', 'content', 'toolName', 'toolCalls', 'citations', 'latencyMs', 'inputTokens', 'outputTokens', 'createdAt'])

export type AssistantMessageScalarFieldEnum = z.infer<typeof AssistantMessageScalarFieldEnumSchema>;

// File: FeatureFlagAuditLogScalarFieldEnum.schema.ts

export const FeatureFlagAuditLogScalarFieldEnumSchema = z.enum(['id', 'flagId', 'action', 'field', 'oldValue', 'newValue', 'performedById', 'performedByType', 'organizationId', 'createdAt'])

export type FeatureFlagAuditLogScalarFieldEnum = z.infer<typeof FeatureFlagAuditLogScalarFieldEnumSchema>;

// File: ScimConfigurationScalarFieldEnum.schema.ts

export const ScimConfigurationScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'provider', 'bearerTokenHash', 'bearerTokenPrefix', 'syncEnabled', 'lastSyncAt', 'lastSyncStatus', 'endpointUrl', 'createdAt', 'updatedAt'])

export type ScimConfigurationScalarFieldEnum = z.infer<typeof ScimConfigurationScalarFieldEnumSchema>;

// File: ScimAuditLogScalarFieldEnum.schema.ts

export const ScimAuditLogScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'action', 'target', 'success', 'details', 'performedBy', 'ipAddress', 'createdAt'])

export type ScimAuditLogScalarFieldEnum = z.infer<typeof ScimAuditLogScalarFieldEnumSchema>;

// File: ScimProvisioningRuleScalarFieldEnum.schema.ts

export const ScimProvisioningRuleScalarFieldEnumSchema = z.enum(['id', 'organizationId', 'groupName', 'targetRole', 'deprovisionAction', 'enabled', 'description', 'createdAt', 'updatedAt'])

export type ScimProvisioningRuleScalarFieldEnum = z.infer<typeof ScimProvisioningRuleScalarFieldEnumSchema>;

// File: UserDeletionRequestScalarFieldEnum.schema.ts

export const UserDeletionRequestScalarFieldEnumSchema = z.enum(['id', 'userId', 'reason', 'retentionUntil', 'status', 'cancellationToken', 'completedAt', 'createdAt', 'updatedAt'])

export type UserDeletionRequestScalarFieldEnum = z.infer<typeof UserDeletionRequestScalarFieldEnumSchema>;

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

export const NotificationTypeSchema = z.enum(['WELCOME', 'APP_UPDATE', 'AI_LOW_BALANCE', 'AI_TOPUP_PAID', 'AI_TOPUP_FAILED', 'AI_OVERAGE_REACHED', 'PAYMENT_FAILED', 'QUOTA_ALERT'])

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// File: NotificationTarget.schema.ts

export const NotificationTargetSchema = z.enum(['IN_APP', 'EMAIL'])

export type NotificationTarget = z.infer<typeof NotificationTargetSchema>;

// File: KnowledgeOwnerType.schema.ts

export const KnowledgeOwnerTypeSchema = z.enum(['USER', 'ORGANIZATION'])

export type KnowledgeOwnerType = z.infer<typeof KnowledgeOwnerTypeSchema>;

// File: KnowledgeSourceType.schema.ts

export const KnowledgeSourceTypeSchema = z.enum(['CMS_PRESTASHOP', 'CMS_BITRIX', 'FILE_MD', 'FILE_XML', 'FILE_PDF', 'FILE_DOCX', 'FILE_XLSX', 'FILE_PPTX', 'FILE_EPUB', 'FILE_IMG', 'FILE_AUDIO', 'FILE_VIDEO', 'FILE_CSV', 'FILE_JSON', 'FILE_TXT', 'HTTP_SITEMAP', 'RSS'])

export type KnowledgeSourceType = z.infer<typeof KnowledgeSourceTypeSchema>;

// File: IngestionJobStatus.schema.ts

export const IngestionJobStatusSchema = z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'])

export type IngestionJobStatus = z.infer<typeof IngestionJobStatusSchema>;

// File: RoadmapItemStatus.schema.ts

export const RoadmapItemStatusSchema = z.enum(['shipped', 'inProgress', 'planned'])

export type RoadmapItemStatus = z.infer<typeof RoadmapItemStatusSchema>;

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
  dripStartedAt: z.date().nullish(),
  paymentsCustomerId: z.string().nullish(),
  locale: z.string().nullish(),
  displayUsername: z.string().nullish(),
  anonymized: z.boolean(),
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
  trialEndsAt: z.date().nullish(),
  metadata: z.string().nullish(),
  paymentsCustomerId: z.string().nullish(),
  storageRegion: z.string().default("eu"),
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


// File: SearchIndexSynonym.schema.ts

export const SearchIndexSynonymSchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  root: z.string(),
  synonym: z.string(),
  locale: z.string().default("en").nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SearchIndexSynonymType = z.infer<typeof SearchIndexSynonymSchema>;


// File: SearchApiKey.schema.ts

export const SearchApiKeySchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  prefix: z.string(),
  hash: z.string(),
  scopes: z.array(z.string()),
  allowedOrigins: z.array(z.string()),
  rateLimitPerMinute: z.number().int().default(600),
  expiresAt: z.date().nullish(),
  revokedAt: z.date().nullish(),
  lastUsedAt: z.date().nullish(),
  createdAt: z.date(),
});

export type SearchApiKeyType = z.infer<typeof SearchApiKeySchema>;


// File: SearchRateLimitBucket.schema.ts

export const SearchRateLimitBucketSchema = z.object({
  keyId: z.string(),
  windowStart: z.date(),
  count: z.number().int(),
});

export type SearchRateLimitBucketType = z.infer<typeof SearchRateLimitBucketSchema>;


// File: SearchUsageEvent.schema.ts

export const SearchUsageEventSchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  type: z.string(),
  count: z.number().int().default(1),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
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
  attempts: z.number().int(),
  lastError: z.string().nullish(),
  nextRetryAt: z.date().nullish(),
  createdAt: z.date(),
});

export type SearchIngestBufferType = z.infer<typeof SearchIngestBufferSchema>;


// File: SearchConnectorSyncJob.schema.ts

export const SearchConnectorSyncJobSchema = z.object({
  id: z.string(),
  indexId: z.string(),
  organizationId: z.string(),
  type: z.string(),
  status: z.string(),
  startedAt: z.date(),
  finishedAt: z.date().nullish(),
  durationMs: z.number().int().nullish(),
  itemsCount: z.number().int(),
  failuresCount: z.number().int(),
  lastError: z.string().nullish(),
  events: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("[]"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SearchConnectorSyncJobType = z.infer<typeof SearchConnectorSyncJobSchema>;


// File: ShopifyStore.schema.ts

export const ShopifyStoreSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  indexId: z.string().nullish(),
  shop: z.string(),
  accessToken: z.string(),
  scopes: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  domain: z.string().nullish(),
  installedAt: z.date(),
  uninstalledAt: z.date().nullish(),
  lastSyncAt: z.date().nullish(),
  syncStatus: z.string().default("pending"),
  syncError: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ShopifyStoreType = z.infer<typeof ShopifyStoreSchema>;


// File: KnowledgeSpace.schema.ts

export const KnowledgeSpaceSchema = z.object({
  id: z.string(),
  ownerType: KnowledgeOwnerTypeSchema,
  userId: z.string().nullish(),
  organizationId: z.string().nullish(),
  slug: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KnowledgeSpaceType = z.infer<typeof KnowledgeSpaceSchema>;


// File: DataSource.schema.ts

export const DataSourceSchema = z.object({
  id: z.string(),
  knowledgeSpaceId: z.string(),
  sourceType: KnowledgeSourceTypeSchema,
  name: z.string(),
  config: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  credentialRef: z.string().nullish(),
  syncEnabled: z.boolean().default(true),
  lastSyncedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DataSourceType = z.infer<typeof DataSourceSchema>;


// File: IngestionJob.schema.ts

export const IngestionJobSchema = z.object({
  id: z.string(),
  knowledgeSpaceId: z.string(),
  dataSourceId: z.string().nullish(),
  status: IngestionJobStatusSchema.default("QUEUED"),
  mode: z.string(),
  inputMeta: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  totalItems: z.number().int(),
  processedItems: z.number().int(),
  failedItems: z.number().int(),
  errorMessage: z.string().nullish(),
  startedAt: z.date().nullish(),
  finishedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IngestionJobType = z.infer<typeof IngestionJobSchema>;


// File: KnowledgeDocument.schema.ts

export const KnowledgeDocumentSchema = z.object({
  id: z.string(),
  knowledgeSpaceId: z.string(),
  dataSourceId: z.string().nullish(),
  externalId: z.string(),
  sourceType: KnowledgeSourceTypeSchema,
  title: z.string(),
  mimeType: z.string(),
  language: z.string().default("en"),
  contentText: z.string(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  version: z.number().int().default(1),
  checksum: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KnowledgeDocumentType = z.infer<typeof KnowledgeDocumentSchema>;


// File: KnowledgeChunk.schema.ts

export const KnowledgeChunkSchema = z.object({
  id: z.string(),
  knowledgeSpaceId: z.string(),
  documentId: z.string(),
  chunkIndex: z.number().int(),
  text: z.string(),
  tokenCount: z.number().int(),
  embedding: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type KnowledgeChunkType = z.infer<typeof KnowledgeChunkSchema>;


// File: GraphNode.schema.ts

export const GraphNodeSchema = z.object({
  id: z.string(),
  knowledgeSpaceId: z.string(),
  canonicalName: z.string(),
  nodeType: z.string(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GraphNodeType = z.infer<typeof GraphNodeSchema>;


// File: GraphEdge.schema.ts

export const GraphEdgeSchema = z.object({
  id: z.string(),
  knowledgeSpaceId: z.string(),
  fromNodeId: z.string(),
  toNodeId: z.string(),
  relationType: z.string(),
  weight: z.number().default(1.0),
  evidenceChunkId: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  createdAt: z.date(),
});

export type GraphEdgeType = z.infer<typeof GraphEdgeSchema>;


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
  autoRechargeEnabled: z.boolean(),
  autoRechargeThresholdKopecks: z.bigint().default(BigInt(100000)),
  autoRechargeAmountKopecks: z.bigint().default(BigInt(500000)),
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


// File: RoadmapItem.schema.ts

export const RoadmapItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  description: z.string(),
  status: RoadmapItemStatusSchema,
  quarter: z.string(),
  iconName: z.string(),
  voteCount: z.number().int(),
  sortOrder: z.number().int(),
  changelogSlug: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RoadmapItemType = z.infer<typeof RoadmapItemSchema>;


// File: ActivationEvent.schema.ts

export const ActivationEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  eventType: z.string(),
  completedAt: z.date(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
});

export type ActivationEventType = z.infer<typeof ActivationEventSchema>;


// File: Collection.schema.ts

export const CollectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  schema: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("[]"),
  documentCount: z.number().int(),
  size: z.bigint().default(BigInt(0)),
  status: z.string().default("active"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CollectionType = z.infer<typeof CollectionSchema>;


// File: CollectionDocument.schema.ts

export const CollectionDocumentSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  organizationId: z.string(),
  data: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
  rowNumber: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CollectionDocumentType = z.infer<typeof CollectionDocumentSchema>;


// File: NewsletterSubscriber.schema.ts

export const NewsletterSubscriberSchema = z.object({
  id: z.string(),
  email: z.string(),
  source: z.string().default("roadmap_vote"),
  createdAt: z.date(),
});

export type NewsletterSubscriberType = z.infer<typeof NewsletterSubscriberSchema>;


// File: NpsSurveyResponse.schema.ts

export const NpsSurveyResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string().nullish(),
  score: z.number().int(),
  feedback: z.string().nullish(),
  source: z.string(),
  createdAt: z.date(),
});

export type NpsSurveyResponseType = z.infer<typeof NpsSurveyResponseSchema>;


// File: AuditLog.schema.ts

export const AuditLogSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  action: z.string(),
  targetType: z.string().nullish(),
  targetId: z.string().nullish(),
  details: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  createdAt: z.date(),
});

export type AuditLogType = z.infer<typeof AuditLogSchema>;


// File: FeatureFlag.schema.ts

export const FeatureFlagSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  type: z.string().default("boolean"),
  enabled: z.boolean(),
  variantValues: z.array(z.string()),
  variantDefault: z.string().nullish(),
  rolloutPercentage: z.number().int().nullish(),
  targetingRules: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  killSwitch: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullish(),
});

export type FeatureFlagType = z.infer<typeof FeatureFlagSchema>;


// File: FeatureFlagOverride.schema.ts

export const FeatureFlagOverrideSchema = z.object({
  id: z.string(),
  flagId: z.string(),
  organizationId: z.string(),
  enabled: z.boolean(),
  variantValue: z.string().nullish(),
  reason: z.string().nullish(),
});

export type FeatureFlagOverrideType = z.infer<typeof FeatureFlagOverrideSchema>;


// File: AssistantConversation.schema.ts

export const AssistantConversationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string().nullish(),
  sessionId: z.string(),
  mode: z.string().default("product_consultation"),
  entryPoint: z.string().nullish(),
  status: z.string().default("active"),
  startedAt: z.date(),
  lastMessageAt: z.date(),
  resolvedAt: z.date().nullish(),
  escalatedAt: z.date().nullish(),
  messageCount: z.number().int(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default("{}"),
});

export type AssistantConversationType = z.infer<typeof AssistantConversationSchema>;


// File: AssistantMessage.schema.ts

export const AssistantMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.string(),
  content: z.string(),
  toolName: z.string().nullish(),
  toolCalls: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  citations: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  latencyMs: z.number().int().nullish(),
  inputTokens: z.number().int().nullish(),
  outputTokens: z.number().int().nullish(),
  createdAt: z.date(),
});

export type AssistantMessageType = z.infer<typeof AssistantMessageSchema>;


// File: FeatureFlagAuditLog.schema.ts

export const FeatureFlagAuditLogSchema = z.object({
  id: z.string(),
  flagId: z.string(),
  action: z.string(),
  field: z.string().nullish(),
  oldValue: z.string().nullish(),
  newValue: z.string().nullish(),
  performedById: z.string().nullish(),
  performedByType: z.string().default("user"),
  organizationId: z.string().nullish(),
  createdAt: z.date(),
});

export type FeatureFlagAuditLogType = z.infer<typeof FeatureFlagAuditLogSchema>;


// File: ScimConfiguration.schema.ts

export const ScimConfigurationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  provider: z.string().default("other"),
  bearerTokenHash: z.string(),
  bearerTokenPrefix: z.string(),
  syncEnabled: z.boolean(),
  lastSyncAt: z.date().nullish(),
  lastSyncStatus: z.string().nullish(),
  endpointUrl: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ScimConfigurationType = z.infer<typeof ScimConfigurationSchema>;


// File: ScimAuditLog.schema.ts

export const ScimAuditLogSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  action: z.string(),
  target: z.string().nullish(),
  success: z.boolean().default(true),
  details: z.string().nullish(),
  performedBy: z.string().nullish(),
  ipAddress: z.string().nullish(),
  createdAt: z.date(),
});

export type ScimAuditLogType = z.infer<typeof ScimAuditLogSchema>;


// File: ScimProvisioningRule.schema.ts

export const ScimProvisioningRuleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  groupName: z.string(),
  targetRole: z.string().default("member"),
  deprovisionAction: z.string().default("suspend"),
  enabled: z.boolean().default(true),
  description: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ScimProvisioningRuleType = z.infer<typeof ScimProvisioningRuleSchema>;


// File: UserDeletionRequest.schema.ts

export const UserDeletionRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  reason: z.string().nullish(),
  retentionUntil: z.date(),
  status: z.string().default("pending"),
  cancellationToken: z.string(),
  completedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserDeletionRequestType = z.infer<typeof UserDeletionRequestSchema>;

