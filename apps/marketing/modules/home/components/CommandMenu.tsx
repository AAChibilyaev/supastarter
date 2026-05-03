"use client";

import { config } from "@config";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@repo/ui/components/command";
import {
	BarChart3Icon,
	BookOpenIcon,
	CameraIcon,
	CodeIcon,
	CopyIcon,
	ImageIcon,
	KeyIcon,
	KeyboardIcon,
	MessageSquareIcon,
	MicIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

type SearchMode = "text" | "voice" | "photo" | "image" | "chat";

interface CommandMenuProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onModeSelect: (mode: SearchMode) => void;
}

const MODE_ICONS: Record<SearchMode, typeof SearchIcon> = {
	text: KeyboardIcon,
	voice: MicIcon,
	photo: CameraIcon,
	image: ImageIcon,
	chat: MessageSquareIcon,
};

const MODE_BADGES: Record<SearchMode, { label: string; status?: string }> = {
	text: { label: "Available" },
	voice: { label: "Voice", status: "Private beta" },
	photo: { label: "Photo", status: "Coming soon" },
	image: { label: "Image", status: "Coming soon" },
	chat: { label: "AI Chat", status: "Private beta" },
};

export function CommandMenu({ open, onOpenChange, onModeSelect }: CommandMenuProps) {
	const t = useTranslations("home");

	const handleModeSelect = (mode: SearchMode) => {
		onModeSelect(mode);
		onOpenChange(false);
	};

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<Command>
				<CommandInput placeholder={t("hero.searchPlaceholder")} />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>

					{/* Search modes — 5 input modes */}
					<CommandGroup heading="Search by">
						{(Object.entries(MODE_ICONS) as [SearchMode, typeof SearchIcon][]).map(
							([key, Icon]) => {
								const badge = MODE_BADGES[key];
								return (
									<CommandItem key={key} onSelect={() => handleModeSelect(key)}>
										<Icon className="size-4 shrink-0" />
										<span className="flex-1">{badge.label}</span>
										{badge.status && (
											<span className="px-2 py-0.5 font-light rounded-full bg-muted text-[10px] text-muted-foreground">
												{badge.status}
											</span>
										)}
									</CommandItem>
								);
							},
						)}
					</CommandGroup>

					<CommandSeparator />

					{/* Quick actions */}
					<CommandGroup heading="Quick actions">
						<CommandItem
							onSelect={() => {
								window.open(config.saasUrl, "_blank");
								onOpenChange(false);
							}}
						>
							<BarChart3Icon className="size-4 shrink-0" />
							<span>Go to Dashboard</span>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								window.open(config.docsUrl, "_blank");
								onOpenChange(false);
							}}
						>
							<BookOpenIcon className="size-4 shrink-0" />
							<span>Open documentation</span>
						</CommandItem>
						<CommandItem
							onSelect={() => {
								navigator.clipboard.writeText(
									"Visit https://aacsearch.com/docs to get started",
								);
								onOpenChange(false);
							}}
						>
							<CodeIcon className="size-4 shrink-0" />
							<span>Quickstart guide</span>
							<CopyIcon className="size-3 ml-auto text-muted-foreground" />
						</CommandItem>
						<CommandItem
							onSelect={() => {
								window.open(`${config.saasUrl}/settings/api-keys`, "_blank");
								onOpenChange(false);
							}}
						>
							<KeyIcon className="size-4 shrink-0" />
							<span>API Keys</span>
						</CommandItem>
					</CommandGroup>

					<CommandSeparator />

					{/* Recent / Tips */}
					<CommandGroup heading="Search tips">
						<CommandItem disabled>
							<SearchIcon className="size-4 shrink-0" />
							<span className="text-muted-foreground">
								Press ⌘K anytime to search
							</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
