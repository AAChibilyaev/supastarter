"use client";

import { useTranslations } from "next-intl";

interface VideoCard {
	key: string;
	duration: string;
	videoId: string;
}

const VIDEOS: VideoCard[] = [
	{
		key: "quickstart",
		duration: "5:00",
		videoId: "placeholder_quickstart",
	},
	{
		key: "ecommerce",
		duration: "6:30",
		videoId: "placeholder_ecommerce",
	},
	{
		key: "blog",
		duration: "4:15",
		videoId: "placeholder_blog",
	},
	{
		key: "app",
		duration: "5:45",
		videoId: "placeholder_app",
	},
];

export function TutorialsGrid() {
	const t = useTranslations("tutorialsPage");

	return (
		<section className="py-24">
			<div className="container">
				<div className="gap-6 md:grid-cols-2 grid grid-cols-1">
					{VIDEOS.map((video) => (
						<article
							key={video.key}
							className="group p-6 rounded-4xl border bg-card transition-all duration-300 hover:border-primary/30 hover:bg-accent/5"
						>
							{/* YouTube embed placeholder */}
							<div className="mb-4 aspect-video -mx-2 -mt-2 relative overflow-hidden rounded-2xl bg-muted">
								<div className="inset-0 absolute flex items-center justify-center">
									<div className="size-16 flex items-center justify-center rounded-full bg-primary/10 transition-all group-hover:bg-primary/20 group-hover:scale-110">
										<svg
											className="ml-1 size-8 text-primary"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<title>Play</title>
											<path d="M8 5v14l11-7z" />
										</svg>
									</div>
								</div>
								<div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-xs text-white">
									{video.duration}
								</div>
							</div>

							<h3 className="font-semibold text-lg">{t(`videos.${video.key}.title`)}</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{t(`videos.${video.key}.description`)}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
