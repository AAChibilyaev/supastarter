import Link from "next/link";

import { cn } from "../lib";

/**
 * A component meant to be used with LandingFooter / LandingFooterColumn.
 * It shows a title and a column of links or other content.
 */
export const LandingFooterLink = ({
	href = "#",
	children,
	variant = "primary",
	className,
}: {
	href?: string;
	children: string | React.ReactNode;
	variant?: "primary" | "secondary";
	className?: string;
}) => {
	return (
		<Link
			href={href}
			className={cn(
				"text-xs transition-colors",
				variant === "primary"
					? "text-gray-900 dark:text-gray-200 hover:text-primary-500 dark:hover:text-primary-500"
					: null,
				variant === "secondary"
					? "text-gray-900 dark:text-gray-200 hover:text-secondary-500 dark:hover:text-secondary-500"
					: null,
				className,
			)}
		>
			{children}
		</Link>
	);
};
