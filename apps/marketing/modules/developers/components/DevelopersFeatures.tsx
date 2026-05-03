import { cn } from "@repo/ui";
import { Card, CardContent, CardDescription, CardTitle } from "@repo/ui";
import { FeatureCardHeaderRow } from "@shared/components/FeatureCardHeaderRow";
import {
	BarChart2Icon,
	BoxIcon,
	CodeIcon,
	FileJsonIcon,
	MonitorIcon,
	WebhookIcon,
} from "lucide-react";
import type { ComponentType } from "react";

interface FeatureItem {
	key: "api" | "sdks" | "browserSdk" | "connectorApi" | "openapi" | "dashboard";
	title: string;
	description: string;
}

interface DevelopersFeaturesProps {
	sectionTitle: string;
	features: FeatureItem[];
}

const iconMap: Record<FeatureItem["key"], ComponentType<{ className?: string }>> = {
	api: CodeIcon,
	sdks: BoxIcon,
	browserSdk: MonitorIcon,
	connectorApi: WebhookIcon,
	openapi: FileJsonIcon,
	dashboard: BarChart2Icon,
};

const spanMap: Record<FeatureItem["key"], string> = {
	api: "md:col-span-2",
	sdks: "md:col-span-1",
	browserSdk: "md:col-span-1",
	connectorApi: "md:col-span-1",
	openapi: "md:col-span-1",
	dashboard: "md:col-span-2",
};

export function DevelopersFeatures({ sectionTitle, features }: DevelopersFeaturesProps) {
	return (
		<section className="section-padding border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{sectionTitle}
					</h2>
				</div>

				<div className="mt-16 gap-4 sm:grid-cols-2 md:grid-cols-4 grid grid-cols-1">
					{features.map((feature) => {
						const Icon = iconMap[feature.key];
						return (
							<Card
								key={feature.key}
								className={cn(
									"group transition-colors hover:border-primary/30 hover:bg-accent/5",
									spanMap[feature.key],
								)}
							>
								<FeatureCardHeaderRow icon={Icon}>
									<CardTitle>{feature.title}</CardTitle>
								</FeatureCardHeaderRow>
								<CardContent>
									<CardDescription className="text-sm leading-relaxed">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
