import { streamToEventIterator } from "@orpc/client";
import { convertToModelMessages, streamText, textModel, type UIMessage } from "@repo/ai";
import z from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { CREDIT_RATES } from "../../entitlements/credit-rates";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";

export const streamMessage = protectedProcedure
	.use(creditGate("chat", CREDIT_RATES.chat))
	.route({
		method: "POST",
		path: "/ai/stream",
		tags: ["AI"],
		summary: "Stream AI response",
		description: "Stream an AI response without storing the chat",
	})
	.input(
		z.object({
			messages: z.array(z.any() as z.ZodType<UIMessage>),
		}),
	)
	.handler(async ({ input, context }) => {
		const { creditReservationId } = context as unknown as CreditGateContext;
		const { messages } = input;

		let response: Awaited<ReturnType<typeof streamText>>;
		try {
			response = await streamText({
				model: textModel,
				messages: await convertToModelMessages(messages as unknown as UIMessage[]),
			});
		} catch (err) {
			// Release reservation on stream creation failure
			await releaseCreditReservation(creditReservationId);
			throw err;
		}

		// Commit charge immediately — the stream may be long-lived and we
		// cannot reliably detect premature client disconnect at this layer.
		await commitFlatFeeUsage({
			reservationId: creditReservationId,
			operation: "chat",
			provider: "aacsearch",
			model: "text",
			flatFeeKopecks: CREDIT_RATES.chat,
		});

		return streamToEventIterator(response.toUIMessageStream());
	});
