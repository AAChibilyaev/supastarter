import { analytics } from "./procedures/analytics";
import { completionRates } from "./procedures/completion-rates";
import { healthScore } from "./procedures/health-score";
import { listEvents } from "./procedures/list-events";
import { recordEvent } from "./procedures/record-event";

export const onboardingRouter = {
	recordEvent,
	listEvents,
	completionRates,
	analytics,
	healthScore,
};
