"use client";

import { usePlanData } from "@payments/hooks/plan-data";
import { usePurchases } from "@payments/hooks/purchases";
import { Badge } from "@repo/ui/components/badge";

export function ActivePlanBadge({ organizationId }: { organizationId?: string }) {
	const { planData } = usePlanData();
	const { activePlan } = usePurchases(organizationId);

	if (!activePlan) {
		return null;
	}

	const activePlanData = planData[activePlan.id as keyof typeof planData];

	if (!activePlanData) {
		return null;
	}
	return (
		<Badge status="info" className="gap-1 px-1.5 text-xs flex items-center normal-case">
			{activePlanData.title}
		</Badge>
	);
}
