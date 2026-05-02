"use client";

import { SearchConfigWizard } from "@search/components/wizard/SearchConfigWizard";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";

export function SearchConfigPage({ organizationId }: { organizationId: string }) {
	const { activeOrganization } = useActiveOrganization();

	return (
		<div className="mx-auto max-w-3xl">
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
