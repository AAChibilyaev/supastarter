import { cn } from "@repo/ui";
import { CameraIcon, ImageIcon, MicIcon, MessageSquareIcon, SearchIcon } from "lucide-react";

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

const MODE_ICONS = {
	text: SearchIcon,
	voice: MicIcon,
	photo: CameraIcon,
	image: ImageIcon,
	chat: MessageSquareIcon,
} as const;

interface SearchInputMockProps {
	query: string;
	mode?: SearchMode;
	latency?: string;
	className?: string;
}

export function SearchInputMock({
	query,
	mode = "text",
	latency,
	className,
}: SearchInputMockProps) {
	const Icon = MODE_ICONS[mode];

	return (
		<div
			className={cn(
				"gap-3 px-4 py-3 flex items-center rounded-lg border border-border bg-background",
				className,
			)}
		>
			<Icon className="size-4 shrink-0 text-primary" />
			<span className="min-w-0 text-sm flex-1 truncate text-foreground">{query}</span>
			{latency && (
				<span className="rounded px-2 py-0.5 font-mono shrink-0 bg-muted text-[10px] text-muted-foreground">
					{latency}
				</span>
			)}
		</div>
	);
}
