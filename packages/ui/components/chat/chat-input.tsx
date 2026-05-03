import * as React from "react";

import { cn } from "../../lib";

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
	({ className, ...props }, ref) => (
		<textarea
			autoComplete="off"
			ref={ref}
			name="message"
			className={cn(
				"max-h-12 px-4 py-3 text-sm h-16 flex w-full resize-none items-center rounded-md bg-background placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	),
);
ChatInput.displayName = "ChatInput";

export { ChatInput };
