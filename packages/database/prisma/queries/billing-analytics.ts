import { db } from "../client";

export interface BillingAnalyticsRaw {
	purchases: Array<{
		id: string;
		type: string;
		customerId: string;
		subscriptionId: string | null;
		priceId: string;
		status: string | null;
		createdAt: Date;
		updatedAt: Date;
		organizationId: string | null;
		userId: string | null;
	}>;
	cancellationEvents: Array<{
		id: string;
		eventType: string;
		createdAt: Date;
		rawPayload: unknown;
	}>;
}

export async function getBillingAnalyticsRaw(): Promise<BillingAnalyticsRaw> {
	const purchases = await db.purchase.findMany({
		where: {
			type: "SUBSCRIPTION",
		},
		orderBy: { createdAt: "asc" },
	});

	const cancellationEvents = await db.paymentProviderEvent.findMany({
		where: {
			eventType: {
				in: ["customer.subscription.deleted", "customer.subscription.updated"],
			},
		},
		orderBy: { createdAt: "asc" },
	});

	return {
		purchases: purchases.map((p) => ({
			id: p.id,
			type: p.type,
			customerId: p.customerId,
			subscriptionId: p.subscriptionId,
			priceId: p.priceId,
			status: p.status,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
			organizationId: p.organizationId,
			userId: p.userId,
		})),
		cancellationEvents: cancellationEvents.map((e) => ({
			id: e.id,
			eventType: e.eventType,
			createdAt: e.createdAt,
			rawPayload: e.rawPayload,
		})),
	};
}
