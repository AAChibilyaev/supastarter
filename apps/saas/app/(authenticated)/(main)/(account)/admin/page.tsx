import { AdminOverview } from "@admin/components/AdminOverview";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminOverviewPage() {
	return (
		<>
			<PageHeader
				title="Admin overview"
				subtitle="Operational summary across users, organizations and notifications."
			/>
			<AdminOverview />
		</>
	);
}
