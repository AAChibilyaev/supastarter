import { getSession } from "@auth/lib/server";
import { KnowledgeWorkbench } from "@knowledge/components/KnowledgeWorkbench";
import { redirect } from "next/navigation";

export default async function PersonalKnowledgePage() {
	const session = await getSession();
	if (!session) {
		redirect("/login");
	}

	return (
		<div className="p-6">
			<KnowledgeWorkbench
				ownerType="USER"
				ownerId={session.user.id}
				title="Personal Knowledge"
				subtitle="Build your personal RAG + GraphRAG workspace with CMS and files"
				canManage
			/>
		</div>
	);
}
