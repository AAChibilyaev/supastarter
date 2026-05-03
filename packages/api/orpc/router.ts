import type { RouterClient } from "@orpc/server";

import { adminRouter } from "../modules/admin/router";
import { aiRouter } from "../modules/ai/router";
import { billingWalletRouter } from "../modules/billing-wallet/router";
import { collectionsRouter } from "../modules/collections/router";
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
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	ai: aiRouter,
	notifications: notificationsRouter,
	search: searchRouter,
	feedback: feedbackRouter,
	knowledge: knowledgeRouter,
	billingWallet: billingWalletRouter,
	collections: collectionsRouter,
	indexing: indexingRouter,
	mySearch: mySearchRouter,
	onboarding: onboardingRouter,
	recommendations: recommendationsRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;
