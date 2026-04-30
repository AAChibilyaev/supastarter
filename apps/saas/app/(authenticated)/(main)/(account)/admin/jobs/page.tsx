import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { PageHeader } from "@shared/components/PageHeader";

const jobs = [
	{
		name: "Search flush cron",
		path: "/api/cron/search-flush",
		secret: process.env.SEARCH_CRON_SECRET,
	},
	{
		name: "Expire reservations cron",
		path: "/api/cron/expire-reservations",
		secret: process.env.WALLET_CRON_SECRET,
	},
	{
		name: "Reconcile Tochka topups cron",
		path: "/api/cron/reconcile-tochka-topups",
		secret: process.env.WALLET_CRON_SECRET,
	},
];

export default function AdminJobsPage() {
	return (
		<>
			<PageHeader
				title="Background jobs"
				subtitle="Cron endpoint readiness for operational tasks."
			/>

			<div className="gap-4 grid grid-cols-1">
				{jobs.map((job) => (
					<Card key={job.path}>
						<CardHeader>
							<CardTitle>{job.name}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1 text-sm">
							<p>
								<span className="text-foreground/60">Endpoint:</span> {job.path}
							</p>
							<p className={job.secret ? "text-emerald-600" : "text-destructive"}>
								{job.secret ? "Secret configured" : "Missing secret"}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</>
	);
}
