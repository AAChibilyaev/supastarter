import { FileQuestion } from "lucide-react";
import { useTranslate } from "ra-core";
import type { ReactNode } from "react";

export const GuesserEmpty = ({
	title = "ra.guesser.empty.title",
	message = "ra.guesser.empty.message",
}: GuesserEmptyProps) => {
	const translate = useTranslate();
	const resolvedTitle = typeof title === "string" ? translate(title, { _: title }) : title;
	const resolvedMessage =
		typeof message === "string" ? translate(message, { _: message }) : message;

	return (
		<div className="gap-2 flex min-h-[50vh] flex-col items-center justify-center text-center">
			<FileQuestion className="h-16 w-16 text-muted-foreground" />
			<h2 className="text-2xl font-semibold">{resolvedTitle}</h2>
			<p className="text-muted-foreground">{resolvedMessage}</p>
		</div>
	);
};

export interface GuesserEmptyProps {
	title?: ReactNode;
	message?: ReactNode;
}
