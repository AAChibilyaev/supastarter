import { getActiveOrganization, getSession } from "@auth/lib/server";
import { isOrganizationAdmin } from "@repo/auth/lib/helper";
import { KnowledgeWorkbench } from "@search/components/KnowledgeWorkbench";
import { notFound } from "next/navigation";

export default async function OrganizationKnowledgePage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [organization, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);

	if (!organization || !session) {
		return notFound();
	}

	return (
		<div className="p-6">
			<KnowledgeWorkbench
				ownerType="ORGANIZATION"
				ownerId={organization.id}
				title="Knowledge Platform"
				subtitle="Ingest CMS/files and run RAG + GraphRAG for this organization"
				canManage={isOrganizationAdmin(organization, session.user)}
			/>
		</div>
	);
}
