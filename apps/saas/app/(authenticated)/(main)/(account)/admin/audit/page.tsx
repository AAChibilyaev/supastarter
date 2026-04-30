import { AdminAuditView } from "@admin/components/AdminAuditView";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminAuditPage() {
	return (
		<>
			<PageHeader
				title="Audit view"
				subtitle="Recent user and organization changes available from admin data sources."
			/>
			<AdminAuditView />
		</>
	);
}
