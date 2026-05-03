"use client";

import { logger } from "@repo/logs";
import { SearchConfigWizard } from "@search/components/wizard/SearchConfigWizard";

export function SearchConfigPage({ organizationId }: { organizationId: string }) {
	return (
		<div className="max-w-3xl mx-auto">
			<SearchConfigWizard
				organizationId={organizationId}
				onComplete={(data) => {
					// Future: persist config via API, redirect to embed step
					logger.info("Search config complete", { data });
				}}
			/>
		</div>
	);
}
