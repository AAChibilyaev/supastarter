"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

import { Button } from "@repo/ui/components/button";
import { FileUpIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

interface DropZoneProps {
	onFilesSelected: (files: File[]) => void;
	disabled?: boolean;
}

const ACCEPTED_TYPES = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/plain",
	"text/csv",
	"application/json",
	"text/markdown",
	"application/epub+zip",
];

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.csv,.json,.md,.epub";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024; // 1 GB

export function DropZone({ onFilesSelected, disabled }: DropZoneProps) {
	const t = useTranslations("mySearch");
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const validateFiles = useCallback(
		(files: FileList | File[]): File[] => {
			setError(null);
			const fileArray = Array.from(files);

			const invalid = fileArray.find(
				(f) =>
					!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|docx|txt|csv|json|md|epub)$/i),
			);
			if (invalid) {
				setError(t("fileTypeNotSupported"));
				return [];
			}

			const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE);
			if (oversized) {
				setError(t("fileTooLarge"));
				return [];
			}

			const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
			if (totalSize > MAX_TOTAL_SIZE) {
				setError(t("totalTooLarge"));
				return [];
			}

			return fileArray;
		},
		[t],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);
			if (disabled) return;
			const valid = validateFiles(e.dataTransfer.files);
			if (valid.length > 0) {
				onFilesSelected(valid);
			}
		},
		[disabled, onFilesSelected, validateFiles],
	);

	const handleClick = () => {
		if (disabled) return;
		inputRef.current?.click();
	};

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files || disabled) return;
			const valid = validateFiles(e.target.files);
			if (valid.length > 0) {
				onFilesSelected(valid);
			}
			e.target.value = "";
		},
		[disabled, onFilesSelected, validateFiles],
	);

	return (
		<div
			className={`p-8 relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${
				isDragging
					? "border-primary bg-primary/5"
					: "border-muted-foreground/25 hover:border-muted-foreground/50"
			} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onClick={handleClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleClick();
				}
			}}
			aria-label={t("dropZoneLabel")}
		>
			<input
				ref={inputRef}
				type="file"
				className="hidden"
				accept={ACCEPTED_EXTENSIONS}
				multiple
				onChange={handleInputChange}
			/>
			<div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-muted">
				<FileUpIcon className="h-6 w-6 text-muted-foreground" />
			</div>
			<p className="text-sm font-medium">{t("dropZoneText")}</p>
			<p className="mt-1 text-xs text-muted-foreground">{t("dropZoneFormats")}</p>
			<p className="mt-1 text-xs text-muted-foreground">{t("dropZoneLimits")}</p>

			{error && (
				<div className="mt-3 gap-2 px-3 py-2 text-xs flex items-center rounded-md bg-destructive/10 text-destructive">
					<XIcon className="h-3.5 w-3.5 shrink-0" />
					<span>{error}</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-5 w-5 ml-auto"
						onClick={(e) => {
							e.stopPropagation();
							setError(null);
						}}
					>
						<XIcon className="h-3 w-3" />
					</Button>
				</div>
			)}
		</div>
	);
}
