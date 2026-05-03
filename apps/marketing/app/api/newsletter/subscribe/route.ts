import { subscribeToNewsletter } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const subscribeSchema = z.object({
	email: z.string().email(),
	source: z.string().default("roadmap_vote"),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = subscribeSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
		}

		const { email, source } = parsed.data;

		if (!process.env.DATABASE_URL?.trim()) {
			// Graceful fallback when no DB is available
			return NextResponse.json({
				message: "Subscribed (no DB)",
				email,
			});
		}

		const subscriber = await subscribeToNewsletter(email, source);

		return NextResponse.json({
			message: "Subscribed successfully",
			email: subscriber.email,
		});
	} catch (error) {
		console.error("Newsletter subscribe error:", error);
		return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
	}
}
