import { AdminConfigView } from "@admin/component/AdminConfigView";
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
