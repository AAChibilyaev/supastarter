import { db } from "@repo/database";

import { type OmsConnector, MockOmsConnector, HttpOmsConnector } from "./oms-connector";
import { type LoyaltyConnector, MockLoyaltyConnector, HttpLoyaltyConnector } from "./loyalty-connector";
import { type InventoryConnector, MockInventoryConnector } from "./inventory-connector";

export interface ConnectorRegistry {
	oms: OmsConnector;
	loyalty: LoyaltyConnector;
	inventory: InventoryConnector;
}

export interface AssistantConnectorConfig {
	oms?: { baseUrl: string; apiKey: string };
	loyalty?: { baseUrl: string; apiKey: string };
}

const registryCache = new Map<string, ConnectorRegistry>();

export function getConnectors(organizationId: string, config?: AssistantConnectorConfig): ConnectorRegistry {
	if (registryCache.has(organizationId)) {
		return registryCache.get(organizationId)!;
	}

	const registry: ConnectorRegistry = {
		oms: config?.oms ? new HttpOmsConnector(config.oms) : new MockOmsConnector(),
		loyalty: config?.loyalty ? new HttpLoyaltyConnector(config.loyalty) : new MockLoyaltyConnector(),
		inventory: new MockInventoryConnector(),
	};

	registryCache.set(organizationId, registry);
	return registry;
}

/** Reads connector config from org metadata and returns a configured registry. */
export async function getConnectorsForOrg(organizationId: string): Promise<ConnectorRegistry> {
	if (registryCache.has(organizationId)) {
		return registryCache.get(organizationId)!;
	}

	const org = await db.organization.findUnique({
		where: { id: organizationId },
		select: { metadata: true },
	});

	const meta = JSON.parse((org?.metadata as string | null) ?? "{}") as Record<string, unknown>;
	const ac = (meta.assistantConfig ?? {}) as Record<string, unknown>;

	const config: AssistantConnectorConfig = {};
	if (ac.omsBaseUrl && ac.omsApiKey) {
		config.oms = { baseUrl: ac.omsBaseUrl as string, apiKey: ac.omsApiKey as string };
	}
	if (ac.loyaltyBaseUrl && ac.loyaltyApiKey) {
		config.loyalty = { baseUrl: ac.loyaltyBaseUrl as string, apiKey: ac.loyaltyApiKey as string };
	}

	return getConnectors(organizationId, config);
}

export function clearConnectorCache(organizationId?: string): void {
	if (organizationId) {
		registryCache.delete(organizationId);
	} else {
		registryCache.clear();
	}
}
