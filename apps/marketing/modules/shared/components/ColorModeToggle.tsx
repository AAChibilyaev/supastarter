"use client";

import { cn } from "@repo/ui";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useIsClient } from "usehooks-ts";

export function ColorModeToggle() {
	const { resolvedTheme, setTheme, theme } = useTheme();
	const [value, setValue] = useState<string>(
		(theme === "system" ? resolvedTheme : theme) ?? "light",
	);
	const isClient = useIsClient();
	const t = useTranslations();

	const colorModeOptions = [
		{ value: "light", icon: SunIcon },
		{ value: "dark", icon: MoonIcon },
	] as const;

	useEffect(() => {
		const resolved = theme === "system" ? resolvedTheme : theme;
		if (resolved) {
			setValue(resolved);
		}
	}, [theme, resolvedTheme]);

	if (!isClient) {
		return null;
	}

	const activeIndex = colorModeOptions.findIndex((option) => option.value === value);

	const handleClick = (optionValue: string) => {
		setTheme(optionValue);
		setValue(optionValue);
	};

	return (
		<TooltipProvider delayDuration={0}>
			<div
				className="gap-0 p-0.5 relative inline-flex items-center rounded-full bg-muted"
				data-test="color-mode-toggle"
			>
				{/* Active indicator */}
				<div
					className="left-0.5 top-0.5 h-7 w-7 shadow-sm ease-in-out absolute rounded-full border border-border bg-background transition-transform duration-200"
					style={{
						transform: `translateX(${activeIndex * 100}%)`,
					}}
					aria-hidden="true"
				/>

				{/* Icons */}
				{colorModeOptions.map((option) => {
					const Icon = option.icon;
					const isActive = option.value === value;
					const label = t(`common.colorMode.${option.value}`);

					return (
						<Tooltip key={option.value}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => handleClick(option.value)}
									className={cn(
										"h-7 w-7 relative z-10 flex items-center justify-center rounded-full transition-colors",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
										isActive
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
									data-test={`color-mode-toggle-item-${option.value}`}
									aria-label={`${label} mode`}
									aria-pressed={isActive}
								>
									<Icon className="size-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent>{label}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</TooltipProvider>
	);
}
