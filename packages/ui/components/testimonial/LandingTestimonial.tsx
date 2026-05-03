import { BadgeCheck } from "lucide-react";

import { cn } from "../../lib";

export interface TestimonialItem {
	className?: string;
	url?: string;
	text: string;
	imageSrc: string;
	name: string;
	handle: string;
	featured?: boolean;
	verified?: boolean;
	size?: "full" | "half" | "third"; // NB: Only applies to testimonials in a list, not grid.
}

/**
 * Shows a testimonial with an image, name, and handle.
 *
 * Meant to be used with a `LandingTestimonialList` or `LandingTestimonialGrid`.
 */
export const LandingTestimonial = ({
	className,
	url,
	text,
	imageSrc,
	name,
	handle,
	featured,
	verified = true,
}: TestimonialItem) => {
	const missingUrl = !url || url === "#";

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"bg-white dark:bg-neutral-900 shadow-md ring-gray-900/5 inline-block w-full rounded-2xl ring-1",
				featured ? "shadow-xl" : "p-6",
				missingUrl
					? "pointer-events-none cursor-default"
					: "hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors",
				className,
			)}
		>
			<figure>
				<blockquote
					className={cn(
						"text-gray-900 dark:text-gray-100",
						featured
							? "p-6 text-lg font-semibold leading-7 tracking-tight sm:text-xl sm:leading-8"
							: "",
					)}
				>
					<p className="whitespace-pre-line">{`“${text}”`}</p>
				</blockquote>

				<figcaption
					className={cn(
						"gap-x-4 flex items-center",
						featured
							? "gap-y-4 border-gray-900/10 px-6 py-4 sm:flex-nowrap flex-wrap border-t"
							: "mt-6",
					)}
				>
					<img
						width={100}
						height={100}
						className="h-10 w-10 bg-gray-50 flex-none rounded-full"
						src={imageSrc}
						alt=""
					/>
					<div className="flex-auto">
						<div className="font-semibold gap-0.5 flex items-center">
							{name}{" "}
							{verified && (
								<BadgeCheck className="-blue-500 text-white w-4 h-4 flex-shrink-0" />
							)}
						</div>
						<div className="text-gray-600">{`${handle}`}</div>
					</div>
				</figcaption>
			</figure>
		</a>
	);
};
