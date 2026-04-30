import { AdminConfigView } from "@admin/components/AdminConfigView";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminConfigPage() {
	return (
		<>
			<PageHeader
				title="Runtime config"
				subtitle="Real-time system configuration, service health, and database statistics."
			/>
			<AdminConfigView />
		</>
	);
}
