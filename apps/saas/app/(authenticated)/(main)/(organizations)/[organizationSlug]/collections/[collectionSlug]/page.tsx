import { redirect } from "next/navigation";

export default async function CollectionDetailRedirect({
	params,
}: {
	params: Promise<{ organizationSlug: string; collectionSlug: string }>;
}) {
	const { organizationSlug, collectionSlug } = await params;
	// Redirect to the existing index detail page which has full document management
	redirect(`/${organizationSlug}/search/${collectionSlug}`);
}
