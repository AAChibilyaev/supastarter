import type { RouterClient } from "@orpc/server";

import { adminRouter } from "../modules/admin/router";
import { assistantRouter } from "../modules/assistant/router";
import { aiRouter } from "../modules/ai/router";
import { auditLogRouter } from "../modules/audit-log/router";
import { billingWalletRouter } from "../modules/billing-wallet/router";
import { collectionsRouter } from "../modules/collections/router";
import { complianceRouter } from "../modules/compliance/router";
import { entitlementsRouter } from "../modules/entitlements/router";
import { featureFlagsRouter } from "../modules/feature-flags/router";
import { feedbackRouter } from "../modules/feedback/router";
import { indexingRouter } from "../modules/indexing/router";
import { knowledgeRouter } from "../modules/knowledge/router";
import { mySearchRouter } from "../modules/my-search/router";
import { notificationsRouter } from "../modules/notifications/router";
import { onboardingRouter } from "../modules/onboarding/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { recommendationsRouter } from "../modules/recommendations/router";
import { searchRouter } from "../modules/search/router";
import { usersRouter } from "../modules/users/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure.router({
	admin: adminRouter,
	auditLog: auditLogRouter,
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	ai: aiRouter,
	notifications: notificationsRouter,
	search: searchRouter,
	feedback: feedbackRouter,
	knowledge: knowledgeRouter,
	billingWallet: billingWalletRouter,
	entitlements: entitlementsRouter,
	featureFlags: featureFlagsRouter,
	collections: collectionsRouter,
	compliance: complianceRouter,
	indexing: indexingRouter,
	mySearch: mySearchRouter,
	onboarding: onboardingRouter,
	recommendations: recommendationsRouter,
	assistant: assistantRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;
