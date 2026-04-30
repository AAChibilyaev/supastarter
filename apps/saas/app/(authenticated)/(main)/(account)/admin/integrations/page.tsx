import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PageHeader } from "@shared/components/PageHeader";

const checks = [
	{
		name: "Mail provider",
		ok: Boolean(
			process.env.PLUNK_API_KEY ||
			process.env.RESEND_API_KEY ||
			process.env.POSTMARK_SERVER_TOKEN ||
			process.env.MAILGUN_API_KEY ||
			process.env.MAIL_HOST,
		),
	},
	{
		name: "Payments provider",
		ok: Boolean(
			process.env.STRIPE_SECRET_KEY ||
			process.env.LEMONSQUEEZY_API_KEY ||
			process.env.POLAR_ACCESS_TOKEN ||
			process.env.CREEM_API_KEY ||
			process.env.DODO_PAYMENTS_API_KEY,
		),
	},
	{
		name: "Search provider",
		ok: Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_ADMIN_API_KEY),
	},
	{
		name: "Wallet provider (Tochka)",
		ok: Boolean(process.env.TOCHKA_API_BASE_URL && process.env.TOCHKA_JWT_TOKEN),
	},
];

export default function AdminIntegrationsPage() {
	return (
		<>
			<PageHeader
				title="Integrations health"
				subtitle="Runtime readiness checks based on configured environment variables."
			/>

			<div className="gap-4 md:grid-cols-2 grid grid-cols-1">
				{checks.map((check) => (
					<Card key={check.name}>
						<CardHeader>
							<CardTitle>{check.name}</CardTitle>
						</CardHeader>
						<CardContent>
							<p
								className={
									check.ok
										? "font-medium text-emerald-600"
										: "font-medium text-destructive"
								}
							>
								{check.ok ? "Configured" : "Missing configuration"}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</>
	);
}
