"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { SearchConfigWizard } from "@search/components/wizard/SearchConfigWizard";

export function SearchConfigPage({ organizationId }: { organizationId: string }) {
	const { activeOrganization } = useActiveOrganization();

	return (
		<div className="max-w-3xl mx-auto">
			<SearchConfigWizard
				organizationId={organizationId}
				onComplete={(data) => {
					// Future: persist config via API, redirect to embed step
					console.log("Config complete:", data);
				}}
			/>
		</div>
	);
}
