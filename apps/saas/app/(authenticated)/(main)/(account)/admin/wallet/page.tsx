import { AdminWalletOps } from "@admin/components/AdminWalletOps";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminWalletPage() {
	return (
		<>
			<PageHeader
				title="Wallet operations"
				subtitle="Manual AI wallet adjustments for organizations."
			/>
			<AdminWalletOps />
		</>
	);
}
