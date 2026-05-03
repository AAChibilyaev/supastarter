"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text: string;
	timestamp: number;
}

export interface ChatSession {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: number;
	updatedAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const STORAGE_KEY = "aacsearch-ai-chat-sessions";
const MAX_SESSIONS = 20;
const AUTO_TITLE_LENGTH = 60;

// ── Helpers ────────────────────────────────────────────────────────────

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function autoTitle(messages: ChatMessage[]): string {
	const firstUserMsg = messages.find((m) => m.role === "user");
	if (!firstUserMsg) return "New Chat";
	const text = firstUserMsg.text.trim();
	return text.length > AUTO_TITLE_LENGTH
		? `${text.slice(0, AUTO_TITLE_LENGTH)}...`
		: text;
}

function loadSessions(): ChatSession[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as ChatSession[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveSessions(sessions: ChatSession[]): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
	} catch {
		// localStorage may be full — silently ignore
	}
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useAiChatSessions() {
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);

	// Load from localStorage on mount
	useEffect(() => {
		const stored = loadSessions();
		setSessions(stored);
		setIsLoaded(true);
	}, []);

	// Persist to localStorage on change
	useEffect(() => {
		if (!isLoaded) return;
		saveSessions(sessions);
	}, [sessions, isLoaded]);

	// ── Derived ────────────────────────────────────────────────────

	const activeSession = useMemo(
		() => sessions.find((s) => s.id === activeSessionId) ?? null,
		[sessions, activeSessionId],
	);

	const activeMessages = useMemo(
		() => activeSession?.messages ?? [],
		[activeSession],
	);

	const sortedSessions = useMemo(
		() => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
		[sessions],
	);

	// ── Actions ────────────────────────────────────────────────────

	const createSession = useCallback(() => {
		const now = Date.now();
		const newSession: ChatSession = {
			id: generateId(),
			title: "New Chat",
			messages: [],
			createdAt: now,
			updatedAt: now,
		};

		setSessions((prev) => {
			const updated = [newSession, ...prev].slice(0, MAX_SESSIONS);
			return updated;
		});
		setActiveSessionId(newSession.id);
		return newSession;
	}, []);

	const deleteSession = useCallback((id: string) => {
		setSessions((prev) => prev.filter((s) => s.id !== id));
		setActiveSessionId((prevId) => (prevId === id ? null : prevId));
	}, []);

	const addMessage = useCallback(
		(sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
			const now = Date.now();
			const newMsg: ChatMessage = {
				...message,
				id: generateId(),
				timestamp: now,
			};

			setSessions((prev) =>
				prev.map((s) => {
					if (s.id !== sessionId) return s;
					const updatedMessages = [...s.messages, newMsg];
					return {
						...s,
						messages: updatedMessages,
						title: autoTitle(updatedMessages),
						updatedAt: now,
					};
				}),
			);
		},
		[],
	);

	const clearActiveMessages = useCallback(() => {
		if (!activeSessionId) return;
		setSessions((prev) =>
			prev.map((s) =>
				s.id === activeSessionId
					? { ...s, messages: [], title: "New Chat", updatedAt: Date.now() }
					: s,
			),
		);
	}, [activeSessionId]);

	const switchSession = useCallback(
		(sessionId: string) => {
			setActiveSessionId(sessionId);
		},
		[],
	);

	/**
	 * Hydrate sessions from server data (for future server-side persistence).
	 * Called once when loading from an API instead of localStorage.
	 */
	const hydrate = useCallback((serverSessions: ChatSession[], serverActiveId?: string) => {
		setSessions(serverSessions);
		if (serverActiveId) {
			setActiveSessionId(serverActiveId);
		}
	}, []);

	// Auto-create first session if none exist
	useEffect(() => {
		if (isLoaded && sessions.length === 0) {
			createSession();
		}
	}, [isLoaded, sessions.length, createSession]);

	return {
		// State
		sessions: sortedSessions,
		activeSession,
		activeSessionId,
		activeMessages,
		isLoaded,

		// Actions
		createSession,
		deleteSession,
		addMessage,
		clearActiveMessages,
		switchSession,
		hydrate,
	};
}
