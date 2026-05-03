import { redirect } from "next/navigation";

export default async function SettingsApiKeysPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	redirect(`/${organizationSlug}/api-keys`);
}
