import { redirect } from "next/navigation";

export default async function ApiKeysPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	redirect(`/${organizationSlug}/search?tab=apiKeys`);
}
