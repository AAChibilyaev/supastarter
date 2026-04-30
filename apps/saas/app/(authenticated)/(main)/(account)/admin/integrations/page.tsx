import { AdminIntegrationsView } from "@admin/components/AdminIntegrationsView";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminIntegrationsPage() {
	return (
		<>
			<PageHeader
				title="Integrations health"
				subtitle="Real-time connectivity checks for all configured external services."
			/>
			<AdminIntegrationsView />
		</>
	);
}
