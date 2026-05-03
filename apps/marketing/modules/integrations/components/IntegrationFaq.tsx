import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@repo/ui/components/accordion";
import { useTranslations } from "next-intl";

interface IntegrationFaqProps {
	namespace: string;
	questionCount?: number;
}

export function IntegrationFaq({ namespace, questionCount = 3 }: IntegrationFaqProps) {
	const t = useTranslations(namespace);
	const questions = Array.from({ length: questionCount }, (_, i) => i + 1);

	return (
		<section className="py-24 border-b border-border/60">
			<div className="container">
				<div className="max-w-2xl mb-12 mx-auto text-center">
					<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
						{t("title")}
					</h2>
				</div>
				<div className="max-w-2xl mx-auto">
					<Accordion type="single" collapsible>
						{questions.map((n) => (
							<AccordionItem key={n} value={`q${n}`}>
								<AccordionTrigger className="text-left">{t(`q${n}.question`)}</AccordionTrigger>
								<AccordionContent className="text-muted-foreground">
									{t(`q${n}.answer`)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</div>
		</section>
	);
}
