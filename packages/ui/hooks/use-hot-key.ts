"use client";

import { useEffect, useRef } from "react";

export function useHotKey(callback: () => void, key: string, options?: { shift?: boolean }): void {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
		function handler(e: KeyboardEvent) {
			const shiftMatch = options?.shift ? e.shiftKey : !e.shiftKey;
			if (
				e.key.toLowerCase() === key.toLowerCase() &&
				(e.metaKey || e.ctrlKey) &&
				shiftMatch
			) {
				callbackRef.current();
			}
		}

		window.addEventListener("keydown", handler);
		return () => {
			window.removeEventListener("keydown", handler);
		};
	}, [key, options?.shift]);
}
