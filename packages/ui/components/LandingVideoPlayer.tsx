"use client";
import { CircleIcon, PlayIcon } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "../lib";

export const LandingVideoPlayer = ({
	autoPlay = true,
	controls = true,
	muted = true,
	maxWidth = "700px",
	poster,
	src,
	width,
	height,
	loop,
	preload = "metadata",
	variant = "primary",
	className,
}: {
	autoPlay?: boolean;
	controls?: boolean;
	muted?: boolean;
	maxWidth?: string;
	poster?: string;
	src: string;
	width?: string;
	height?: string;
	loop?: boolean;
	preload?: "none" | "metadata" | "auto";
	variant?: "primary" | "secondary";
	className?: string;
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(autoPlay);

	const togglePlay = () => {
		if (!videoRef.current) {
			return;
		}

		if (!isPlaying) {
			setIsPlaying(true);
			videoRef.current.play();

			const shouldLoop = typeof loop === "boolean" ? loop : true;

			if (shouldLoop) {
				videoRef.current.setAttribute("loop", "");
			}
		}
	};

	return (
		<div style={{ maxWidth }} className={cn(className, "shadow-md overflow-hidden rounded-lg")}>
			<div className="bg-white dark:bg-black relative rounded-md">
				{!isPlaying ? (
					<button
						onClick={togglePlay}
						className={cn(
							"inset-0 group absolute flex h-full w-full items-center justify-center bg-gradient-to-r",
							variant === "primary"
								? "from-primary-900/30 to-black/70"
								: "from-secondary-900/40 to-black/70",
						)}
					>
						<div className="w-28 h-28 relative">
							<PlayIcon
								className={cn(
									"top-0 left-0 inset-0 w-28 h-28 absolute z-10 transition-transform group-hover:scale-95",
									variant === "primary"
										? "stroke-primary-200/50 fill-primary-200"
										: "stroke-secondary-200/50 fill-secondary-200",
								)}
							/>

							<CircleIcon
								className={cn(
									"top-0 left-0 w-28 h-28 absolute z-0 origin-center scale-150 stroke-[1px]",
									variant === "primary"
										? "stroke-primary-200/50 group-hover:stroke-primary-200/90"
										: "stroke-secondary-200/50 group-hover:stroke-secondary-200/90",
								)}
							/>
						</div>
					</button>
				) : null}

				<video
					ref={videoRef}
					src={src}
					width={width}
					height={height}
					controls={autoPlay || isPlaying || controls}
					autoPlay={autoPlay}
					loop={loop}
					className={className}
					poster={poster}
					muted={muted}
					onClick={togglePlay}
					playsInline
					preload={preload}
				>
					<track kind="captions" />
					<source src={src} type="video/mp4" />
					Your browser does not support the video tag.
				</video>
			</div>
		</div>
	);
};
