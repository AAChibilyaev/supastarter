"use client";

import type { Post } from "@blog/types";
import { LocaleLink } from "@i18n/routing";
import { useLocale } from "next-intl";
import Image from "next/image";

export function PostListItem({ post }: { post: Post }) {
	const locale = useLocale();
	const { title, excerpt, authorName, image, date, path, authorImage, tags } = post;

	return (
		<div className="p-6 rounded-4xl border bg-card">
			{image && (
				<div className="mb-4 aspect-video -mx-2 -mt-2 relative overflow-hidden rounded-2xl">
					<Image
						src={image}
						alt={title}
						fill
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						className="object-cover object-center"
					/>
					<LocaleLink href={`/blog/${path}`} className="inset-0 absolute" />
				</div>
			)}

			{tags && (
				<div className="mb-2 gap-2 flex flex-wrap">
					{tags.map((tag) => (
						<span
							key={tag}
							className="font-semibold text-xs tracking-wider text-primary uppercase"
						>
							#{tag}
						</span>
					))}
				</div>
			)}

			<LocaleLink href={`/blog/${path}`} className="font-semibold text-xl">
				{title}
			</LocaleLink>
			{excerpt && <p className="opacity-50">{excerpt}</p>}

			<div className="mt-4 flex items-center justify-between">
				{authorName && (
					<div className="flex items-center">
						{authorImage && (
							<div className="mr-2 size-8 relative overflow-hidden rounded-full">
								<Image
									src={authorImage}
									alt={authorName}
									fill
									sizes="96px"
									className="object-cover object-center"
								/>
							</div>
						)}
						<div>
							<p className="font-semibold text-sm opacity-50">{authorName}</p>
						</div>
					</div>
				)}

				<div className="mr-0 ml-auto">
					<p className="text-sm opacity-30">
						{Intl.DateTimeFormat(locale).format(new Date(date))}
					</p>
				</div>
			</div>
		</div>
	);
}
