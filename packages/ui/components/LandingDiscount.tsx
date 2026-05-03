import { GiftIcon } from "lucide-react";

import { cn } from "../lib";

/**
 * A component meant to be used in the landing page.
 *
 * Use this to show a discount or offer to encourage users to take action, typically used under call to action buttons.
 */
export const LandingDiscount = ({
	className,
	discountValueText = "$200 off",
	discountDescriptionText = "",
	animated = true,
}: {
	className?: string;
	discountValueText: string;
	discountDescriptionText?: string;
	animated?: boolean;
}) => {
	return (
		<p className={cn("gap-1 text-sm flex flex-wrap items-center", className)}>
			<span className="text-green-500 gap-1 flex flex-shrink-0 items-center">
				<GiftIcon
					className={cn("w-5 h-5 -top-0.5 relative", animated ? "animate-pulse" : "")}
				/>{" "}
				<span className="font-bold">{discountValueText}</span>
			</span>{" "}
			{discountDescriptionText}
		</p>
	);
};
