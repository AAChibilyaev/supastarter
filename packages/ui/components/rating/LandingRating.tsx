import { StarHalfIcon, StarIcon } from "lucide-react";

import { cn } from "../../lib";

/**
 * Shows a rating with stars.
 */
export const LandingRating = ({
	className,
	rating = 5,
	maxRating = 5,
	size = "medium",
}: {
	className?: string;
	rating?: number;
	maxRating?: number;
	size?: "small" | "medium" | "large";
}) => {
	return (
		<div
			className={cn("gap-1 flex items-center", className)}
			aria-description={`Rating: ${rating} out of ${maxRating}`}
		>
			{Array.from({ length: maxRating }).map((_, index) => {
				return (
					<div
						key={index}
						className={cn(
							size === "small" ? "h-3 w-3" : "",
							size === "medium" ? "h-4 w-4" : "",
							size === "large" ? "h-5 w-5" : "",
						)}
					>
						{
							// Return half star for half ratings
							rating % 1 !== 0 &&
							index === Math.floor(rating) &&
							index + 1 === Math.ceil(rating) ? (
								<div className="relative" key={index}>
									<StarIcon
										className="top-0 left-0 text-gray-300 fill-gray-300 absolute h-full w-full"
										aria-hidden="true"
									/>

									<StarHalfIcon
										className="text-yellow-400 fill-yellow-400 relative z-10 h-full w-full"
										aria-hidden="true"
									/>
								</div>
							) : (
								<StarIcon
									key={index}
									className={cn("h-full w-full", {
										"text-yellow-400 fill-yellow-400": index < rating,
										"text-gray-300 fill-gray-300": index >= rating,
									})}
									aria-hidden="true"
								/>
							)
						}
					</div>
				);
			})}
		</div>
	);
};
