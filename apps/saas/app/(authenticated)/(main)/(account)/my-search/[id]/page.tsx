import { getSession } from "@auth/lib/server";
import { getActiveOrganization } from "@auth/lib/server";
import { MySearchIndexPage } from "@my-search/components/pages/MySearchIndexPage";
import { redirect } from "next/navigation";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function MySearchIndexRoute({ params }: Props) {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const { id } = await params;
	const organization = await getActiveOrganization();

	return <MySearchIndexPage organizationId={organization.id} indexId={id} />;
}
