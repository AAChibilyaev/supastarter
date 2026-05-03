import { db } from "../client";

export type NewsletterSubscriberView = {
	id: string;
	email: string;
	source: string;
	createdAt: Date;
};

export async function subscribeToNewsletter(
	email: string,
	source: string = "roadmap_vote",
): Promise<NewsletterSubscriberView> {
	const subscriber = await db.newsletterSubscriber.upsert({
		where: { email },
		update: { source },
		create: { email, source },
	});
	return {
		id: subscriber.id,
		email: subscriber.email,
		source: subscriber.source,
		createdAt: subscriber.createdAt,
	};
}
