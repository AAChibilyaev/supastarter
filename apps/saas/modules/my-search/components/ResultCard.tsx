import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { FileIcon, GlobeIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SearchHit {
	chunk_id: string;
	content: string;
	filename: string;
	file_type: string;
	file_id: string;
	index_id: string;
	source_url?: string;
	uploaded_at: number;
	highlight?: {
		content?: string[];
	};
	text_match?: number;
}

interface ResultCardProps {
	hit: SearchHit;
}

const FILE_TYPE_ICONS: Record<string, LucideIcon> = {
	url: GlobeIcon,
};

export function ResultCard({ hit }: ResultCardProps) {
	const t = useTranslations();
	const FileTypeIcon = FILE_TYPE_ICONS[hit.file_type] ?? FileIcon;

	const highlightedContent = hit.highlight?.content?.[0] ?? hit.content;

	const displayFilename = hit.source_url ?? hit.filename;
	const displayUrl = hit.source_url;

	return (
		<Card className="overflow-hidden">
			<CardContent className="p-4">
				<div className="gap-3 flex items-start">
					<div className="mt-0.5 h-8 w-8 flex shrink-0 items-center justify-center rounded-md bg-muted">
						<FileTypeIcon className="h-4 w-4 text-muted-foreground" />
					</div>
					<div className="min-w-0 space-y-1 flex-1">
						<div className="gap-2 flex items-center">
							<span className="text-sm font-medium truncate">{displayFilename}</span>
							<Badge variant="secondary" className="shrink-0 text-[10px]">
								{hit.file_type}
							</Badge>
						</div>

						{displayUrl && <p className="text-xs truncate text-muted-foreground">{displayUrl}</p>}

						{/* Content with highlights */}
						<div
							className="prose-sm prose text-sm line-clamp-3 text-muted-foreground"
							dangerouslySetInnerHTML={{
								__html: highlightedContent,
							}}
						/>

						{/* Metadata row */}
						<div className="gap-3 pt-1 text-xs flex items-center text-muted-foreground">
							<span>
								{t("mySearch.score")}: {Math.round((hit.text_match ?? 0) * 100)}%
							</span>
							{hit.source_url && (
								<a
									href={hit.source_url}
									target="_blank"
									rel="noopener noreferrer"
									className="underline hover:text-foreground"
								>
									{t("mySearch.openSource")}
								</a>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
