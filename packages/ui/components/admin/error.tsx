import { CircleAlert, History } from "lucide-react";
import { useResetErrorBoundaryOnLocationChange, Translate } from "ra-core";
import type { HtmlHTMLAttributes, ErrorInfo } from "react";
import type { FallbackProps } from "react-error-boundary";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../accordion";
import { Button } from "../button";

/**
 * App-wide error component for displaying error boundaries.
 *
 * Displays the error message and a back button.
 * In development mode, also shows the component stack trace in an expandable accordion.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/error Error documentation}
 */
export const Error = (props: InternalErrorProps & {}) => {
	const { error, errorInfo, resetErrorBoundary, ...rest } = props;

	useResetErrorBoundaryOnLocationChange(resetErrorBoundary);

	const errorMessage: string =
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
			? (error.message ?? "")
			: typeof error === "string"
				? error
				: String(error ?? "Unknown error");

	return (
		<div className="md:p-16 gap-5 flex flex-col items-center" {...rest}>
			<h1 className="text-3xl mt-5 mb-5 gap-3 flex items-center" role="alert">
				<CircleAlert className="w-2em h-2em" />
				<Translate i18nKey="ra.page.error" />
			</h1>
			<div>
				<Translate i18nKey="ra.message.error" />
			</div>
			{process.env.NODE_ENV !== "production" && (
				<>
					<Accordion type="multiple" className="mt-1 p-2 lg:w-150 w-full bg-secondary">
						<AccordionItem value="error">
							<AccordionTrigger className="py-2">
								<Translate i18nKey={errorMessage}>{errorMessage}</Translate>
							</AccordionTrigger>
							<AccordionContent className="pt-1 whitespace-pre-wrap">
								<pre className="text-xls">{errorInfo?.componentStack}</pre>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<p className="text-center">Need help with this error? Try the following:</p>
					<div>
						<ul className="list-disc">
							<li>
								Check the{" "}
								<a
									className="text-primary underline-offset-4 hover:underline"
									href="https://marmelab.com/shadcn-admin-kit/docs"
								>
									shadcn-admin-kit documentation
								</a>
							</li>
							<li>
								Search on{" "}
								<a
									className="text-primary underline-offset-4 hover:underline"
									href="https://stackoverflow.com/questions/tagged/shadcn-admin-kit"
								>
									StackOverflow
								</a>{" "}
								for community answers
							</li>
							<li>
								Get help from the core team via{" "}
								<a
									className="text-primary underline-offset-4 hover:underline"
									href="https://marmelab.com/shadcn-admin-kit/"
								>
									Shadcn Enterprise Edition
								</a>
							</li>
						</ul>
					</div>
				</>
			)}
			<div className="mt-8">
				<Button onClick={goBack}>
					<History />
					<Translate i18nKey="ra.action.back" />
				</Button>
			</div>
		</div>
	);
};

interface InternalErrorProps
	extends Omit<HtmlHTMLAttributes<HTMLDivElement>, "title">, FallbackProps {
	className?: string;
	errorInfo?: ErrorInfo;
}

export interface ErrorProps extends Pick<FallbackProps, "error"> {
	errorInfo?: ErrorInfo;
}

function goBack() {
	window.history.go(-1);
}
