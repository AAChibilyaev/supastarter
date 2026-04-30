import { redirect } from "next/navigation";

export default async function PreviewPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	redirect(`/${organizationSlug}/search?tab=playground`);
}
