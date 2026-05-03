/**
 * HTTP API client for AACsearch REST API.
 * Wraps fetch with auth headers, error handling, and retry logic.
 */

import { loadConfig, type CliConfig } from "./config.js";

export interface ApiError {
	status: number;
	message: string;
	body?: unknown;
}

export class ApiClient {
	private config: CliConfig;

	constructor(config?: CliConfig) {
		this.config = config ?? loadConfig();
	}

	private get endpoint(): string {
		return this.config.endpoint ?? "https://api.aacsearch.io";
	}

	private get headers(): Record<string, string> {
		const h: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.config.apiKey) {
			h["Authorization"] = `Bearer ${this.config.apiKey}`;
		}
		if (this.config.projectId) {
			h["X-Project-Id"] = this.config.projectId;
		}
		return h;
	}

	async request<T>(method: string, path: string, body?: unknown, retries = 2): Promise<T> {
		const url = `${this.endpoint}${path}`;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const response = await fetch(url, {
					method,
					headers: this.headers,
					body: body ? JSON.stringify(body) : undefined,
				});

				if (!response.ok) {
					const errorBody = await response.text().catch(() => "");
					const err: ApiError = {
						status: response.status,
						message: response.statusText,
						body: errorBody,
					};
					throw err;
				}

				const text = await response.text();
				return text ? (JSON.parse(text) as T) : ({} as T);
			} catch (error) {
				const isApiError = (error as ApiError).status !== undefined;
				if (isApiError && (error as ApiError).status < 500) {
					// Don't retry client errors (4xx)
					throw error;
				}
				if (attempt < retries) {
					const delay = Math.min(1000 * 2 ** attempt, 5000);
					await new Promise((r) => setTimeout(r, delay));
				} else {
					throw error;
				}
			}
		}

		throw new Error("Request failed after retries");
	}

	async get<T>(path: string): Promise<T> {
		return this.request<T>("GET", path);
	}

	async post<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("POST", path, body);
	}

	async delete<T>(path: string): Promise<T> {
		return this.request<T>("DELETE", path);
	}
}
