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

export function clearConnectorCache(organizationId?: string): void {
	if (organizationId) {
		registryCache.delete(organizationId);
	} else {
		registryCache.clear();
	}
}
