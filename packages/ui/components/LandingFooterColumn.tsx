import Link from "next/link";

import { cn } from "../lib";

/**
 * A component meant to be used with LandingFooter.
 * It shows a title and a column of links or other content.
 *
 * LandingFooters can have between 1-4 columns.
 */
export const LandingFooterColumn = ({
	className,
	children,
	title,
}: {
	className?: string;
	children: React.ReactNode;
	title?: string;
}) => {
	return (
		<div className={cn("gap-4 text-xs flex w-full flex-col justify-center", className)}>
			<p className="text-slate-900 dark:text-slate-100 font-light text-base">{title}</p>

			<div className="gap-4 flex w-full flex-col flex-wrap justify-center">{children}</div>
		</div>
	);
};
