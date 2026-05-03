import { EventEmitter } from "node:events";

/**
 * Feature Flag SSE Publisher
 *
 * In-memory EventEmitter for publishing feature flag change events.
 * The SSE endpoint subscribes to these events and pushes them to
 * connected clients. Admin update procedures publish events after
 * modifying flags.
 *
 * This is an in-process singleton — works within a single Node.js
 * process. For multi-process deployments, replace with Redis pub/sub.
 */

export interface FlagChangeEvent {
	type: "flag_updated" | "flag_deleted" | "override_updated";
	flagKey: string;
	organizationId?: string; // Per-org override changes
	enabled?: boolean; // New enabled state (for flag_updated with org scope)
}

const flagEventBus = new EventEmitter();
flagEventBus.setMaxListeners(200); // Support many concurrent SSE clients

const CHANNEL = "feature-flag:change";

export function publishFlagChange(event: FlagChangeEvent): void {
	flagEventBus.emit(CHANNEL, event);
}

export function subscribeToFlagChanges(callback: (event: FlagChangeEvent) => void): () => void {
	const handler = (event: FlagChangeEvent) => {
		callback(event);
	};

	flagEventBus.on(CHANNEL, handler);

	// Return unsubscribe function
	return () => {
		flagEventBus.off(CHANNEL, handler);
	};
}
