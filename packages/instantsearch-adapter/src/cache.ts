/**
 * Simple TTL cache for search results.
 *
 * @module @aacsearch/instantsearch-adapter
 */

import type { CacheEntry } from "./types";

/**
 * A lightweight in-memory cache with time-to-live expiration.
 */
export class TtlCache<T> {
	private readonly store = new Map<string, CacheEntry<T>>();
	private readonly ttlMs: number;

	constructor(ttlSeconds: number) {
		this.ttlMs = ttlSeconds * 1000;
	}

	/** Get a cached value, or undefined if expired / missing. */
	get(key: string): T | undefined {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (Date.now() > entry.readuntil) {
			this.store.delete(key);
			return undefined;
		}
		return entry.value;
	}

	/** Store a value with the configured TTL. */
	set(key: string, value: T): void {
		this.store.set(key, {
			value,
			readuntil: Date.now() + this.ttlMs,
		});
	}

	/** Delete a specific key. */
	delete(key: string): void {
		this.store.delete(key);
	}

	/** Clear all cached entries. */
	clear(): void {
		this.store.clear();
	}

	/** Return the number of non-expired entries. */
	get size(): number {
		this.evictExpired();
		return this.store.size;
	}

	/** Remove all expired entries. */
	private evictExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this.store) {
			if (now > entry.readuntil) {
				this.store.delete(key);
			}
		}
	}
}
