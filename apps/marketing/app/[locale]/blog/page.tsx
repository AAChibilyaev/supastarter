import { PostListItem } from "@blog/components/PostListItem";
import { getAllPosts } from "@blog/lib/posts";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	const t = await getTranslations({ locale, namespace: "blog" });
	return { title: t("title") };
}

export default async function BlogListPage(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "blog" });
	const posts = await getAllPosts(locale);

	const items = posts.map((post, index) => (
		<PostListItem post={post} key={post.path} priorityImage={index < 2} />
	));

	return (
		<section className="section-padding">
			<div className="container">
				<div className="mb-12 pt-8 text-center">
					<h1 className="mb-2 font-bold text-4xl md:text-5xl lg:text-6xl">{t("title")}</h1>
					<p className="text-lg font-light opacity-50">{t("description")}</p>
				</div>
				<div className="gap-8 md:grid-cols-2 grid grid-cols-1">{items}</div>
			</div>
		</section>
	);
}
