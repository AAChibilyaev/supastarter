import type { RouterClient } from "@orpc/server";

import { adminRouter } from "../modules/admin/router";
import { aiRouter } from "../modules/ai/router";
import { billingWalletRouter } from "../modules/billing-wallet/router";
import { entitlementsRouter } from "../modules/entitlements/router";
import { indexingRouter } from "../modules/indexing/router";
import { knowledgeRouter } from "../modules/knowledge/router";
import { notificationsRouter } from "../modules/notifications/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
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
	knowledge: knowledgeRouter,
	indexing: indexingRouter,
	billingWallet: billingWalletRouter,
	entitlements: entitlementsRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;
