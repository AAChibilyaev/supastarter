import { useTranslations } from "next-intl";

interface CodeExampleSectionProps {
	namespace: string;
	code: string;
	language: "bash" | "html" | "typescript" | "json";
}

export function CodeExampleSection({ namespace, code, language }: CodeExampleSectionProps) {
	const t = useTranslations(namespace);

	return (
		<section className="py-20 border-b border-border/60">
			<div className="container">
				<div className="max-w-3xl mx-auto">
					<div className="mb-8 text-center">
						<h2 className="font-medium text-3xl tracking-tight md:text-4xl text-balance">
							{t("codeTitle")}
						</h2>
						<p className="mt-3 text-lg text-muted-foreground">{t("codeSubtitle")}</p>
					</div>
					<div className="bg-zinc-950 shadow-lg relative overflow-hidden rounded-xl border border-border/40">
						<div className="gap-1.5 px-4 py-3 border-white/10 bg-zinc-900/80 flex items-center border-b">
							<span className="size-3 bg-red-500/70 rounded-full" />
							<span className="size-3 bg-yellow-500/70 rounded-full" />
							<span className="size-3 bg-green-500/70 rounded-full" />
							<span className="ml-2 text-xs text-zinc-500 font-mono">{language}</span>
						</div>
						<pre className="p-5 text-sm leading-relaxed overflow-x-auto">
							<code className="text-zinc-200 font-mono whitespace-pre">{code.trim()}</code>
						</pre>
					</div>
				</div>
			</div>
		</section>
	);
}
