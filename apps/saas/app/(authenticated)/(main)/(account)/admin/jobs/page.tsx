import { AdminJobsView } from "@admin/component/AdminJobsView";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminJobsPage() {
	return (
		<>
			<PageHeader
				title="Background jobs"
				subtitle="Cron job configuration status and recent sync job activity."
			/>
			<AdminJobsView />
		</>
	);
}
