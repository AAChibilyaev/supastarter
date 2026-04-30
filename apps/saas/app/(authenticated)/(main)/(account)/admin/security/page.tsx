import { ActiveSessionsBlock } from "@settings/components/ActiveSessionsBlock";
import { PasskeysBlock } from "@settings/components/PasskeysBlock";
import { TwoFactorBlock } from "@settings/components/TwoFactorBlock";
import { PageHeader } from "@shared/components/PageHeader";

export default function AdminSecurityPage() {
	return (
		<>
			<PageHeader
				title="Security operations"
				subtitle="Active sessions, passkeys and two-factor settings for the current admin account."
			/>

			<div className="gap-6 grid grid-cols-1">
				<TwoFactorBlock />
				<PasskeysBlock />
				<ActiveSessionsBlock />
			</div>
		</>
	);
}
