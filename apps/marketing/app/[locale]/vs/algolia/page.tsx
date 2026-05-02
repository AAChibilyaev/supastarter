import { redirect } from "next/navigation";

export default async function VsAlgoliaRedirect(props: { params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	redirect(`/${locale}/compare/algolia`);
}
