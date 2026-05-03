"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Loader2 } from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";
import * as React from "react";

import { cn } from "../lib";

// --- Types ---

export type TimelineSize = "sm" | "md" | "lg";
export type TimelineStatus = "completed" | "in-progress" | "pending";
export type TimelineColor = "primary" | "secondary" | "muted" | "accent" | "destructive";

export interface TimelineElement {
	id: number;
	date: string;
	title: string;
	description: string;
	icon?: React.ReactNode | (() => React.ReactNode);
	status?: TimelineStatus;
	color?: TimelineColor;
	size?: TimelineSize;
	loading?: boolean;
	error?: string;
}

// --- Timeline ---

const timelineVariants = cva("flex flex-col relative", {
	variants: {
		size: {
			sm: "gap-4",
			md: "gap-6",
			lg: "gap-8",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

interface TimelineProps
	extends React.HTMLAttributes<HTMLOListElement>, VariantProps<typeof timelineVariants> {
	iconsize?: "sm" | "md" | "lg";
}

const Timeline = React.forwardRef<HTMLOListElement, TimelineProps>(
	({ className, iconsize, size, children, ...props }, ref) => {
		const items = React.Children.toArray(children);

		if (items.length === 0) {
			return <TimelineEmpty />;
		}

		return (
			<ol
				ref={ref}
				aria-label="Timeline"
				className={cn(
					timelineVariants({ size }),
					"max-w-2xl py-8 relative mx-auto min-h-[600px] w-full",
					className,
				)}
				{...props}
			>
				{React.Children.map(children, (child, index) => {
					if (
						React.isValidElement(child) &&
						typeof child.type !== "string" &&
						"displayName" in child.type &&
						child.type.displayName === "TimelineItem"
					) {
						return React.cloneElement(child, {
							iconsize,
							showConnector: index !== items.length - 1,
						} as React.ComponentProps<typeof TimelineItem>);
					}
					return child;
				})}
			</ol>
		);
	},
);
Timeline.displayName = "Timeline";

// --- TimelineItem ---

interface TimelineItemProps extends Omit<HTMLMotionProps<"li">, "ref"> {
	date?: string;
	title?: string;
	description?: string;
	icon?: React.ReactNode;
	iconColor?: TimelineColor;
	status?: "completed" | "in-progress" | "pending";
	connectorColor?: TimelineColor;
	showConnector?: boolean;
	iconsize?: "sm" | "md" | "lg";
	loading?: boolean;
	error?: string;
}

const TimelineItem = React.forwardRef<HTMLLIElement, TimelineItemProps>(
	(
		{
			className,
			date,
			title,
			description,
			icon,
			iconColor,
			status = "completed",
			connectorColor: _connectorColor,
			showConnector = true,
			iconsize,
			loading,
			error,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			initial,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			animate,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			transition,
			...props
		},
		ref,
	) => {
		const commonClassName = cn("mb-8 last:mb-0 relative w-full", className);

		// Loading State
		if (loading) {
			return (
				<motion.li
					ref={ref}
					className={commonClassName}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					role="status"
					{...props}
				>
					<div className="px-4 grid grid-cols-[minmax(auto,8rem)_auto_1fr] items-start">
						<div className="pr-4 text-right">
							<div className="h-4 w-24 animate-pulse rounded bg-muted" />
						</div>

						<div className="mx-3 gap-y-2 flex flex-col items-center justify-start">
							<div className="h-8 w-8 animate-pulse relative flex items-center justify-center rounded-full bg-muted ring-8 ring-background">
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							</div>
							{showConnector && <div className="w-0.5 animate-pulse h-full bg-muted" />}
						</div>

						<div className="gap-2 pl-2 flex flex-col">
							<div className="space-y-2">
								<div className="h-4 w-24 animate-pulse rounded bg-muted" />
								<div className="h-3 w-48 animate-pulse rounded bg-muted" />
							</div>
						</div>
					</div>
				</motion.li>
			);
		}

		// Error State
		if (error) {
			return (
				<motion.li
					ref={ref}
					className={cn(commonClassName, "border border-destructive/50 bg-destructive/10")}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					role="alert"
					{...props}
				>
					<div className="px-4 grid grid-cols-[minmax(auto,8rem)_auto_1fr] items-start">
						<div className="pr-4 text-right">
							<TimelineTime className="text-destructive">{date}</TimelineTime>
						</div>

						<div className="mx-3 gap-y-2 flex flex-col items-center justify-start">
							<div className="h-8 w-8 relative flex items-center justify-center rounded-full bg-destructive/20 ring-8 ring-background">
								<AlertCircle className="h-4 w-4 text-destructive" />
							</div>
							{showConnector && <TimelineConnector status="pending" className="h-full" />}
						</div>

						<div className="gap-2 pl-2 flex flex-col">
							<TimelineHeader>
								<TimelineTitle className="text-destructive">{title || "Error"}</TimelineTitle>
							</TimelineHeader>
							<TimelineDescription className="text-destructive">{error}</TimelineDescription>
						</div>
					</div>
				</motion.li>
			);
		}

		const content = (
			<div
				className="gap-4 grid grid-cols-[1fr_auto_1fr] items-start"
				{...(status === "in-progress" ? { "aria-current": "step" } : {})}
			>
				{/* Date */}
				<div className="pt-1 flex flex-col justify-start">
					<TimelineTime className="pr-4 text-right">{date}</TimelineTime>
				</div>

				{/* Timeline dot and connector */}
				<div className="flex flex-col items-center">
					<div className="relative z-10">
						<TimelineIcon icon={icon} color={iconColor} status={status} iconSize={iconsize} />
					</div>
					{showConnector && <div className="h-16 w-0.5 mt-2 bg-border" />}
				</div>

				{/* Content */}
				<TimelineContent>
					<TimelineHeader>
						<TimelineTitle>{title}</TimelineTitle>
					</TimelineHeader>
					<TimelineDescription>{description}</TimelineDescription>
				</TimelineContent>
			</div>
		);

		// Filter out Framer Motion specific props
		const {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			style,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onDrag,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onDragStart,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onDragEnd,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onAnimationStart,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			onAnimationComplete,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			transformTemplate,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			whileHover,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			whileTap,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			whileDrag,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			whileFocus,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			whileInView,
			...filteredProps
		} = props;

		return (
			<li ref={ref} className={commonClassName} {...filteredProps}>
				{content}
			</li>
		);
	},
);
TimelineItem.displayName = "TimelineItem";

// --- TimelineTime ---

interface TimelineTimeProps extends React.HTMLAttributes<HTMLTimeElement> {
	date?: string | Date | number;
	format?: Intl.DateTimeFormatOptions;
}

const defaultDateFormat: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "short",
	day: "2-digit",
};

const TimelineTime = React.forwardRef<HTMLTimeElement, TimelineTimeProps>(
	({ className, date, format, children, ...props }, ref) => {
		const formattedDate = React.useMemo(() => {
			if (!date) return "";

			try {
				const dateObj = new Date(date);
				if (isNaN(dateObj.getTime())) return "";

				return new Intl.DateTimeFormat("en-US", {
					...defaultDateFormat,
					...format,
				}).format(dateObj);
			} catch (error) {
				console.error("Error formatting date:", error);
				return "";
			}
		}, [date, format]);

		return (
			<time
				ref={ref}
				dateTime={date ? new Date(date).toISOString() : undefined}
				className={cn("text-sm font-medium tracking-tight text-muted-foreground", className)}
				{...props}
			>
				{children || formattedDate}
			</time>
		);
	},
);
TimelineTime.displayName = "TimelineTime";

// --- TimelineConnector ---

const TimelineConnector = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		status?: "completed" | "in-progress" | "pending";
		color?: "primary" | "secondary" | "muted" | "accent";
	}
>(({ className, status = "completed", color, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"w-0.5",
			{
				"bg-primary": color === "primary" || (!color && status === "completed"),
				"bg-muted": color === "muted" || (!color && status === "pending"),
				"bg-secondary": color === "secondary",
				"bg-accent": color === "accent",
				"bg-gradient-to-b from-primary to-muted": !color && status === "in-progress",
			},
			className,
		)}
		{...props}
	/>
));
TimelineConnector.displayName = "TimelineConnector";

// --- TimelineHeader ---

const TimelineHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("gap-4 flex items-center", className)} {...props} />
	),
);
TimelineHeader.displayName = "TimelineHeader";

// --- TimelineTitle ---

const TimelineTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn("font-semibold tracking-tight leading-none text-secondary-foreground", className)}
		{...props}
	>
		{children}
	</h3>
));
TimelineTitle.displayName = "TimelineTitle";

// --- TimelineIcon ---

const TimelineIcon = ({
	icon,
	color = "primary",
	status: _status = "completed",
	iconSize = "md",
}: {
	icon?: React.ReactNode;
	color?: "primary" | "secondary" | "muted" | "accent" | "destructive";
	status?: "completed" | "in-progress" | "pending" | "error";
	iconSize?: "sm" | "md" | "lg";
}) => {
	const sizeClasses = {
		sm: "h-8 w-8",
		md: "h-10 w-10",
		lg: "h-12 w-12",
	};

	const iconSizeClasses = {
		sm: "h-4 w-4",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	};

	const colorClasses = {
		primary: "bg-primary text-primary-foreground",
		secondary: "bg-secondary text-secondary-foreground",
		muted: "bg-muted text-muted-foreground",
		accent: "bg-accent text-accent-foreground",
		destructive: "bg-destructive text-destructive-foreground",
	};

	return (
		<div
			className={cn(
				"shadow-sm relative flex items-center justify-center rounded-full ring-8 ring-background",
				sizeClasses[iconSize],
				colorClasses[color],
			)}
		>
			{icon ? (
				<div className={cn("flex items-center justify-center", iconSizeClasses[iconSize])}>
					{icon}
				</div>
			) : (
				<div className={cn("rounded-full", iconSizeClasses[iconSize])} />
			)}
		</div>
	);
};

// --- TimelineDescription ---

const TimelineDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p ref={ref} className={cn("max-w-sm text-sm text-muted-foreground", className)} {...props} />
));
TimelineDescription.displayName = "TimelineDescription";

// --- TimelineContent ---

const TimelineContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("gap-2 pl-2 flex flex-col", className)} {...props} />
	),
);
TimelineContent.displayName = "TimelineContent";

// --- TimelineEmpty ---

const TimelineEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("p-8 flex flex-col items-center justify-center text-center", className)}
			{...props}
		>
			<p className="text-sm text-muted-foreground">{children || "No timeline items to display"}</p>
		</div>
	),
);
TimelineEmpty.displayName = "TimelineEmpty";

// --- TimelineLayout ---

interface TimelineLayoutProps {
	items: TimelineElement[];
	size?: "sm" | "md" | "lg";
	iconColor?: "primary" | "secondary" | "muted" | "accent";
	customIcon?: React.ReactNode;
	animate?: boolean;
	connectorColor?: "primary" | "secondary" | "muted" | "accent";
	className?: string;
}

const TimelineLayout = ({
	items,
	size = "md",
	iconColor,
	customIcon,
	animate = true,
	connectorColor,
	className,
}: TimelineLayoutProps) => {
	return (
		<Timeline size={size} className={className}>
			{[...items].reverse().map((item, index) => (
				<motion.div
					key={index}
					initial={animate ? { opacity: 0, y: 20 } : false}
					animate={animate ? { opacity: 1, y: 0 } : false}
					transition={{
						duration: 0.5,
						delay: index * 0.1,
						ease: "easeOut",
					}}
				>
					<TimelineItem
						date={item.date}
						title={item.title}
						description={item.description}
						icon={typeof item.icon === "function" ? item.icon() : item.icon || customIcon}
						iconColor={item.color || iconColor}
						connectorColor={item.color || connectorColor}
						showConnector={index !== items.length - 1}
					/>
				</motion.div>
			))}
		</Timeline>
	);
};

// --- Exports ---

export {
	Timeline,
	TimelineItem,
	TimelineConnector,
	TimelineHeader,
	TimelineTitle,
	TimelineIcon,
	TimelineDescription,
	TimelineContent,
	TimelineTime,
	TimelineEmpty,
	TimelineLayout,
};
