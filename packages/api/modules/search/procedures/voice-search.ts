import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import {
	type CreditGateContext,
	commitFlatFeeUsage,
	creditGate,
	releaseCreditReservation,
} from "../../entitlements/middleware/credit-gate";
import { requireOrganizationMember } from "../lib/access";

export const voiceSearch = protectedProcedure
	.use(creditGate("voice_search_transcription", BigInt(200)))
	.route({
		method: "POST",
		path: "/search/voice",
		tags: ["Search"],
		summary: "Speech-to-text preprocessing for voice search",
		description:
			"Accepts base64-encoded audio, transcribes it via OpenAI Whisper, and returns the transcript for downstream search.",
	})
	.input(
		z.object({
			organizationId: z.string(),
			audioBase64: z.string().min(1),
			language: z.string().max(10).default("en"),
			model: z.string().default("whisper-1"),
		}),
	)
	.output(
		z.object({
			transcript: z.string(),
			language: z.string(),
			durationSeconds: z.number(),
		}),
	)
	.handler(async ({ input, context, ...rest }) => {
		const { creditReservationId } = rest as unknown as CreditGateContext;
		await requireOrganizationMember(input.organizationId, context.user.id);
		const { creditReservationId } = context as unknown as CreditGateContext;

		const audioBuffer = Buffer.from(input.audioBase64, "base64");

		let transcript = "";
		let language = input.language;
		let durationSeconds = 0;

		try {
			const OpenAI = await import("openai").then((m) => m.default);
			const openai = new OpenAI();

			const response = await openai.audio.transcriptions.create({
				model: input.model,
				file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
				language: input.language,
				response_format: "verbose_json",
			});

			transcript = response.text ?? "";
			language = response.language ?? input.language;
			durationSeconds = response.duration ?? 0;

			await commitFlatFeeUsage(context, creditReservationId, BigInt(200));
		} catch {
			// Release reservation on error
			await releaseCreditReservation(creditReservationId);
			transcript = "";
			durationSeconds = 0;
			await releaseCreditReservation(context, creditReservationId);
		}

		return {
			transcript,
			language,
			durationSeconds,
		};
	});
