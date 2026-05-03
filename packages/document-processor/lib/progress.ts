import { EventEmitter } from "node:events";

import type { PipelineProgress, PipelineProgressListener, PipelineStage } from "./types";

/**
 * Real-time progress tracker for the document pipeline.
 *
 * Uses EventEmitter for decoupled progress notifications.
 * Can be consumed by WebSocket, polling API, or UI listeners.
 */
export class ProgressTracker {
	private readonly emitter = new EventEmitter();
	private readonly progresses = new Map<string, PipelineProgress>();
	private readonly maxHistory: number;

	constructor(maxHistory = 1000) {
		this.maxHistory = maxHistory;
	}

	/**
	 * Start tracking a document's progress.
	 */
	start(documentId: string, sourceUri: string): void {
		const progress: PipelineProgress = {
			documentId,
			sourceUri,
			stage: "crawl",
			status: "pending",
			progress: 0,
			message: "Queued for processing",
			startedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.progresses.set(documentId, progress);
		this.emit(progress);
	}

	/**
	 * Update progress for a document at a specific stage.
	 */
	update(
		documentId: string,
		stage: PipelineStage,
		status: PipelineProgress["status"],
		progress: number,
		message: string,
		error?: string,
	): void {
		const existing = this.progresses.get(documentId);
		if (!existing) return;

		const updated: PipelineProgress = {
			...existing,
			stage,
			status,
			progress: Math.min(100, Math.max(0, progress)),
			message,
			updatedAt: new Date().toISOString(),
			error: error ?? existing.error,
		};

		this.progresses.set(documentId, updated);
		this.emit(updated);

		// Enforce history limit
		if (this.progresses.size > this.maxHistory) {
			const oldest = this.progresses.keys().next().value;
			if (oldest) this.progresses.delete(oldest);
		}
	}

	/**
	 * Mark a document as completed.
	 */
	complete(documentId: string): void {
		this.update(documentId, "index", "completed", 100, "Pipeline completed successfully");
	}

	/**
	 * Mark a document as failed.
	 */
	fail(documentId: string, stage: PipelineStage, error: string): void {
		this.update(documentId, stage, "failed", 0, "Pipeline failed", error);
	}

	/**
	 * Get current progress for a document.
	 */
	get(documentId: string): PipelineProgress | undefined {
		return this.progresses.get(documentId);
	}

	/**
	 * Get all current progresses.
	 */
	getAll(): PipelineProgress[] {
		return Array.from(this.progresses.values());
	}

	/**
	 * Subscribe to progress updates.
	 * Returns an unsubscribe function.
	 */
	onProgress(listener: PipelineProgressListener): () => void {
		this.emitter.on("progress", listener);
		return () => {
			this.emitter.off("progress", listener);
		};
	}

	/**
	 * Remove progress tracking for a completed/failed document.
	 */
	remove(documentId: string): void {
		this.progresses.delete(documentId);
	}

	/**
	 * Clear all progress tracking.
	 */
	clear(): void {
		this.progresses.clear();
	}

	/**
	 * Get summary statistics.
	 */
	summary(): {
		total: number;
		pending: number;
		inProgress: number;
		completed: number;
		failed: number;
	} {
		const values = Array.from(this.progresses.values());
		return {
			total: values.length,
			pending: values.filter((p) => p.status === "pending").length,
			inProgress: values.filter((p) => p.status === "in_progress").length,
			completed: values.filter((p) => p.status === "completed").length,
			failed: values.filter((p) => p.status === "failed").length,
		};
	}

	private emit(progress: PipelineProgress): void {
		this.emitter.emit("progress", progress);
	}
}
