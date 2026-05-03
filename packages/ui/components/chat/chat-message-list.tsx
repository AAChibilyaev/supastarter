"use client";

import { ArrowDown } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib";
import { buttonVariants } from "../button";
import { useAutoScroll } from "./hooks/useAutoScroll";

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
	smooth?: boolean;
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
	({ className, children, smooth = false, ...props }, _ref) => {
		const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
			smooth,
			content: children,
		});

		return (
			<div className="relative h-full w-full">
				<div
					className={`p-4 flex h-full w-full flex-col overflow-y-auto ${className}`}
					ref={scrollRef}
					onWheel={disableAutoScroll}
					onTouchMove={disableAutoScroll}
					{...props}
				>
					<div className="gap-6 flex flex-col">{children}</div>
				</div>

				{!isAtBottom && (
					<button
						onClick={() => {
							scrollToBottom();
						}}
						className={cn(
							buttonVariants({ variant: "outline", size: "icon" }),
							"bottom-2 shadow-md absolute left-1/2 inline-flex -translate-x-1/2 transform rounded-full",
						)}
						aria-label="Scroll to bottom"
					>
						<ArrowDown className="h-4 w-4" />
					</button>
				)}
			</div>
		);
	},
);

ChatMessageList.displayName = "ChatMessageList";

export { ChatMessageList };
