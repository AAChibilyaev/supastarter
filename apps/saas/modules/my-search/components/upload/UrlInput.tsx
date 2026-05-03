"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { GlobeIcon, LinkIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface UrlInputProps {
	onUrlAdd: (url: string) => void;
	disabled?: boolean;
}

export function UrlInput({ onUrlAdd, disabled }: UrlInputProps) {
	const t = useTranslations("mySearch");
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);

	const validateUrl = (value: string): boolean => {
		try {
			const parsed = new URL(value);
			if (!["http:", "https:"].includes(parsed.protocol)) {
				setError(t("urlInvalidProtocol"));
				return false;
			}
			setError(null);
			return true;
		} catch {
			setError(t("urlInvalid"));
			return false;
		}
	};

	const handleAdd = () => {
		if (!url.trim() || disabled) return;
		if (!validateUrl(url.trim())) return;
		onUrlAdd(url.trim());
		setUrl("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAdd();
		}
	};

	return (
		<div className="space-y-1.5">
			<div className="gap-2 flex items-center">
				<div className="relative flex-1">
					<LinkIcon className="left-3 h-4 w-4 pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="url"
						placeholder={t("urlPlaceholder")}
						value={url}
						onChange={(e) => {
							setUrl(e.target.value);
							if (error) setError(null);
						}}
						onBlur={() => url.trim() && validateUrl(url.trim())}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						className="pl-9"
					/>
				</div>
				<Button
					variant="outline"
					size="default"
					onClick={handleAdd}
					disabled={disabled || !url.trim()}
				>
					<GlobeIcon className="mr-2 h-4 w-4" />
					{t("addUrl")}
				</Button>
			</div>
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}
