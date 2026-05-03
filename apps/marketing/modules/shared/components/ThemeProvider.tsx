"use client";

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from "react";

interface MarketingThemeContextValue {
	theme: "light" | "dark";
	setTheme: (theme: "light" | "dark") => void;
}

const STORAGE_KEY = "theme";

const MarketingThemeContext = createContext<MarketingThemeContextValue | null>(null);

interface MarketingThemeProviderProps extends PropsWithChildren {
	defaultTheme: "light" | "dark";
}

export function MarketingThemeProvider({ children, defaultTheme }: MarketingThemeProviderProps) {
	const [theme, setThemeState] = useState<"light" | "dark">(defaultTheme);

	useEffect(() => {
		const storedTheme = window.localStorage.getItem(STORAGE_KEY);
		if (storedTheme === "light" || storedTheme === "dark") {
			setThemeState(storedTheme);
		}
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", theme === "dark");
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	const value = useMemo<MarketingThemeContextValue>(
		() => ({
			theme,
			setTheme: setThemeState,
		}),
		[theme],
	);

	return <MarketingThemeContext.Provider value={value}>{children}</MarketingThemeContext.Provider>;
}

export function useMarketingTheme() {
	const context = useContext(MarketingThemeContext);

	if (!context) {
		throw new Error("useMarketingTheme must be used within MarketingThemeProvider");
	}

	return context;
}
