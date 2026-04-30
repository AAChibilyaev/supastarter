import { AdminNotificationsView } from "@admin/components/AdminNotificationsView";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminNotificationsPage() {
	return (
		<>
			<PageHeader
				title="Notification control"
				subtitle="Review recent notifications and update delivery preferences."
			/>
			<AdminNotificationsView />
		</>
	);
}
