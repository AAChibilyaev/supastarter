import { completionRates } from "./procedures/completion-rates";
import { listEvents } from "./procedures/list-events";
import { recordEvent } from "./procedures/record-event";

export const onboardingRouter = {
	recordEvent,
	listEvents,
	completionRates,
};
