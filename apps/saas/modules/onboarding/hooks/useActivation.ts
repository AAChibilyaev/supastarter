"use client";

import { useSession } from "@auth/hooks/use-session";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** NPS activation milestones (0–5). */
export type ActivationMilestone = 0 | 1 | 2 | 3 | 4 | 5;

/** User health classification. */
export type HealthStatus = "activated" | "healthy" | "at-risk" | "churned" | "unknown";

export interface UseActivationReturn {
	/** Current milestone (0 = new user, 5 = fully activated). */
	milestone: ActivationMilestone;
	/** Human-readable label for the current milestone. */
	milestoneLabel: string;
	/** Health status. */
	health: HealthStatus;
	/** Whether the user has activated (milestone >= 4). */
	isActivated: boolean;
	/** Whether the onboarding checklist is fully complete. */
	allCompleted: boolean;
	/** Progress detail from the server (6-step checklist). */
	checklist: {
		completedCount: number;
		totalSteps: number;
		percent: number;
	};
	/** True while fetching data. */
	isLoading: boolean;
	/** Error if the query failed. */
	error: Error | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MILESTONE_LABELS: Record<ActivationMilestone, string> = {
	0: "Signed up",
	1: "Account created",
	2: "Created project",
	3: "Uploaded data",
	4: "Performed search",
	5: "Embedded widget or API key used",
};

/** Days thresholds for health scoring. */
const AT_RISK_DAYS = 14;
const CHURNED_DAYS = 30;
const HEALTHY_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysSince(date: Date): number {
	const now = Date.now();
	const diff = now - date.getTime();
	return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Map the 6-step server checklist to the 5 NPS milestones.
 *
 * Server steps:
 *   1 = has index
 *   2 = has connector token
 *   3 = has sync (data)
 *   4 = has search
 *   5 = has API key
 *   6 = widget embedded
 *
 * NPS milestones:
 *   1 = signed up (always true if user exists)
 *   2 = has index                         ← server step 1
 *   3 = has connector token OR has sync   ← server steps 2 OR 3
 *   4 = has search                        ← server step 4
 *   5 = has API key OR widget             ← server steps 5 OR 6
 */
function computeMilestone(
	serverSteps: Array<{ step: number; completed: boolean }>,
): ActivationMilestone {
	// Milestone 1 is always achieved by having a user account.
	if (serverSteps.length === 0) return 1;

	const get = (step: number) => serverSteps.find((s) => s.step === step)?.completed ?? false;

	// Milestone 2 — created project
	if (!get(1)) return 1;

	// Milestone 3 — uploaded data
	if (!get(2) && !get(3)) return 2;

	// Milestone 4 — performed search
	if (!get(4)) return 3;

	// Milestone 5 — embedded widget or API key
	if (!get(5) && !get(6)) return 4;

	return 5;
}

function computeHealth(milestone: ActivationMilestone, createdAt: Date | null): HealthStatus {
	if (!createdAt) return "unknown";

	const elapsed = daysSince(createdAt);

	// Churned = no login in 30+ days AND not activated
	if (elapsed >= CHURNED_DAYS && milestone < 4) return "churned";

	// At-risk = signed up > 14 days ago, milestone < 3
	if (elapsed >= AT_RISK_DAYS && milestone < 3) return "at-risk";

	// Activated = milestone >= 4
	if (milestone >= 4) {
		// Healthy = activated + recent activity (within 7 days)
		if (elapsed < HEALTHY_DAYS) return "healthy";
		return "activated";
	}

	return "unknown";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivation(): UseActivationReturn {
	const { user } = useSession();
	const { activeOrganization, loaded: orgLoaded } = useActiveOrganization();
	const organizationId = activeOrganization?.id;

	const createdAt = user?.createdAt ? new Date(user.createdAt) : null;

	const {
		data: onboarding,
		isLoading,
		error,
	} = useQuery({
		...orpc.search.onboardingStatus.queryOptions({
			input: { organizationId: organizationId as string },
		}),
		enabled: Boolean(organizationId) && orgLoaded,
	});

	const serverSteps = onboarding?.steps ?? [];
	const completedCount = onboarding?.completedCount ?? 0;
	const totalSteps = onboarding?.totalSteps ?? 6;
	const percent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

	const milestone = computeMilestone(serverSteps);
	const health = computeHealth(milestone, createdAt);

	return {
		milestone,
		milestoneLabel: MILESTONE_LABELS[milestone],
		health,
		isActivated: milestone >= 4,
		allCompleted: onboarding?.allCompleted ?? false,
		checklist: {
			completedCount,
			totalSteps,
			percent,
		},
		isLoading: isLoading || !orgLoaded,
		error,
	};
}
