export interface ConnectorCapabilities {
	supportsFullSync: boolean;
	supportsDeltaSync: boolean;
	supportsDelete: boolean;
	supportsDiagnostics: boolean;
}

export interface ConnectorDefinition {
	id: "prestashop" | "bitrix" | "wordpress";
	displayName: string;
	auth: "bearer";
	syncModes: Array<"full" | "delta" | "delete">;
	capabilities: ConnectorCapabilities;
	minModuleVersion: string;
}

const CONNECTOR_REGISTRY: Record<ConnectorDefinition["id"], ConnectorDefinition> = {
	prestashop: {
		id: "prestashop",
		displayName: "PrestaShop",
		auth: "bearer",
		syncModes: ["full", "delta", "delete"],
		capabilities: {
			supportsFullSync: true,
			supportsDeltaSync: true,
			supportsDelete: true,
			supportsDiagnostics: true,
		},
		minModuleVersion: "0.1.0",
	},
	bitrix: {
		id: "bitrix",
		displayName: "1C-Bitrix",
		auth: "bearer",
		syncModes: ["full", "delta", "delete"],
		capabilities: {
			supportsFullSync: true,
			supportsDeltaSync: true,
			supportsDelete: true,
			supportsDiagnostics: true,
		},
		minModuleVersion: "0.1.0",
	},
	wordpress: {
		id: "wordpress",
		displayName: "WordPress",
		auth: "bearer",
		syncModes: ["full", "delta", "delete"],
		capabilities: {
			supportsFullSync: true,
			supportsDeltaSync: true,
			supportsDelete: true,
			supportsDiagnostics: true,
		},
		minModuleVersion: "0.1.0",
	},
};

export function getConnectorDefinition(connectorId: string): ConnectorDefinition | null {
	if (connectorId === "prestashop" || connectorId === "bitrix" || connectorId === "wordpress") {
		return CONNECTOR_REGISTRY[connectorId];
	}
	return null;
}
