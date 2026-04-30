import { AdminAuditView } from "@admin/component/AdminAuditView";
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
