"use client";

import * as React from "react";

import { cn } from "../lib";

/**
 * SpotlightCard — a card with a radial gradient spotlight that follows the cursor.
 * Adapted from react-bits (DavidHDev/react-bits, MIT).
 *
 * Usage:
 *   <SpotlightCard spotlightColor="rgba(99,102,241,0.3)">
 *     <p>Content</p>
 *   </SpotlightCard>
 */

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
	/** CSS color string for the spotlight radial gradient. Defaults to rgba(255,255,255,0.12). */
	spotlightColor?: string;
}

export function SpotlightCard({
	children,
	className,
	spotlightColor = "rgba(255, 255, 255, 0.12)",
	style,
	...props
}: SpotlightCardProps) {
	const divRef = React.useRef<HTMLDivElement>(null);
	const [hovered, setHovered] = React.useState(false);
	const [position, setPosition] = React.useState({ x: "50%", y: "50%" });

	const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const el = divRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		setPosition({
			x: `${e.clientX - rect.left}px`,
			y: `${e.clientY - rect.top}px`,
		});
	}, []);

	return (
		<div
			ref={divRef}
			onMouseMove={handleMouseMove}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className={cn(
				"relative overflow-hidden rounded-3xl border bg-card text-card-foreground",
				className,
			)}
			style={style}
			{...props}
		>
			{/* spotlight overlay */}
			<div
				aria-hidden="true"
				className="inset-0 pointer-events-none absolute z-10 rounded-[inherit] transition-opacity duration-500"
				style={{
					opacity: hovered ? 0.6 : 0,
					background: `radial-gradient(circle at ${position.x} ${position.y}, ${spotlightColor}, transparent 80%)`,
				}}
			/>
			{children}
		</div>
	);
}
