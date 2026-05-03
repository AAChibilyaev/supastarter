"use client";

import type {
	DndContextProps,
	DraggableSyntheticListeners,
	DropAnimation,
	UniqueIdentifier,
} from "@dnd-kit/core";
import {
	closestCenter,
	defaultDropAnimationSideEffects,
	DndContext,
	DragOverlay,
	type DragStartEvent,
	type DragEndEvent,
	type DragCancelEvent,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	restrictToHorizontalAxis,
	restrictToParentElement,
	restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
	type SortableContextProps,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Slot, type SlotProps } from "@radix-ui/react-slot";
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "../lib";
import { composeRefs } from "../lib/compose-refs";
import { buttonVariants } from "./button";

const orientationConfig = {
	vertical: {
		modifiers: [restrictToVerticalAxis, restrictToParentElement],
		strategy: verticalListSortingStrategy,
	},
	horizontal: {
		modifiers: [restrictToHorizontalAxis, restrictToParentElement],
		strategy: horizontalListSortingStrategy,
	},
	mixed: {
		modifiers: [restrictToParentElement],
		strategy: undefined,
	},
};

interface SortableProps<TData extends { id: UniqueIdentifier }> {
	value: TData[];
	onValueChange?: (items: TData[]) => void;
	onMove?: (event: { activeIndex: number; overIndex: number }) => void;
	collisionDetection?: DndContextProps["collisionDetection"];
	modifiers?: DndContextProps["modifiers"];
	strategy?: SortableContextProps["strategy"];
	orientation?: "vertical" | "horizontal" | "mixed";
	overlay?: React.ReactNode | null;
	onDragStart?: (event: DragStartEvent) => void;
	onDragEnd?: (event: DragEndEvent) => void;
	onDragCancel?: (event: DragCancelEvent) => void;
	children?: React.ReactNode;
}

function Sortable<TData extends { id: UniqueIdentifier }>({
	value,
	onValueChange,
	onDragStart,
	onDragEnd,
	onDragCancel,
	collisionDetection = closestCenter,
	modifiers,
	strategy,
	onMove,
	orientation = "vertical",
	overlay,
	children,
	...props
}: SortableProps<TData>) {
	const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor),
	);

	const config = orientationConfig[orientation];

	return (
		<DndContext
			modifiers={modifiers ?? config.modifiers}
			sensors={sensors}
			onDragStart={(event: DragStartEvent) => {
				setActiveId(event.active.id);
				onDragStart?.(event);
			}}
			onDragEnd={(event: DragEndEvent) => {
				const { active, over } = event;
				if (over && active.id !== over?.id) {
					const activeIndex = value.findIndex((item) => item.id === active.id);
					const overIndex = value.findIndex((item) => item.id === over.id);

					if (onMove) {
						onMove({ activeIndex, overIndex });
					} else {
						onValueChange?.(arrayMove(value, activeIndex, overIndex));
					}
				}
				setActiveId(null);
				onDragEnd?.(event);
			}}
			onDragCancel={(event: DragCancelEvent) => {
				setActiveId(null);
				onDragCancel?.(event);
			}}
			collisionDetection={collisionDetection}
			{...props}
		>
			<SortableContext items={value} strategy={strategy ?? config.strategy}>
				{children}
			</SortableContext>
			{overlay
				? createPortal(
						<SortableOverlay activeId={activeId}>{overlay}</SortableOverlay>,
						document.body,
					)
				: null}
		</DndContext>
	);
}

const dropAnimationOpts: DropAnimation = {
	sideEffects: defaultDropAnimationSideEffects({
		styles: {
			active: {
				opacity: "0.4",
			},
		},
	}),
};

interface SortableOverlayProps {
	activeId?: UniqueIdentifier | null;
	children?: React.ReactNode;
	dropAnimation?: DropAnimation;
}

function SortableOverlay({
	activeId,
	dropAnimation = dropAnimationOpts,
	children,
	...props
}: SortableOverlayProps & Record<string, unknown>) {
	return (
		<DragOverlay dropAnimation={dropAnimation} {...props}>
			{activeId ? (
				<SortableItem value={activeId} className="cursor-grabbing" asChild>
					{children}
				</SortableItem>
			) : null}
		</DragOverlay>
	);
}

interface SortableItemContextProps {
	attributes: React.HTMLAttributes<HTMLElement>;
	listeners: DraggableSyntheticListeners | undefined;
	isDragging?: boolean;
}

const SortableItemContext = React.createContext<SortableItemContextProps>({
	attributes: {},
	listeners: undefined,
	isDragging: false,
});

function useSortableItem() {
	const context = React.useContext(SortableItemContext);

	if (!context) {
		throw new Error("useSortableItem must be used within a SortableItem");
	}

	return context;
}

interface SortableItemProps extends SlotProps {
	value: UniqueIdentifier;
	asTrigger?: boolean;
	asChild?: boolean;
}

function SortableItem({
	value,
	asTrigger,
	asChild,
	className,
	ref,
	...props
}: SortableItemProps & { ref?: React.Ref<HTMLDivElement> }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: value,
	});

	const context = React.useMemo<SortableItemContextProps>(
		() => ({
			attributes,
			listeners,
			isDragging,
		}),
		[attributes, listeners, isDragging],
	);
	const style: React.CSSProperties = {
		opacity: isDragging ? 0.5 : 1,
		transform: CSS.Translate.toString(transform),
		transition,
	};

	const Comp = asChild ? Slot : "div";

	return (
		<SortableItemContext.Provider value={context}>
			<Comp
				data-state={isDragging ? "dragging" : undefined}
				className={cn(
					"data-[state=dragging]:cursor-grabbing",
					{ "cursor-grab": !isDragging && asTrigger },
					className,
				)}
				ref={composeRefs(ref, setNodeRef as React.Ref<HTMLDivElement>)}
				style={style}
				{...(asTrigger ? attributes : {})}
				{...(asTrigger ? listeners : {})}
				{...props}
			/>
		</SortableItemContext.Provider>
	);
}

interface SortableDragHandleProps extends React.ComponentProps<"button"> {
	withHandle?: boolean;
}

function SortableDragHandle({
	className,
	variant,
	size,
	ref,
	...props
}: SortableDragHandleProps & {
	variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
	size?: "sm" | "md" | "lg" | "icon";
}) {
	const { attributes, listeners, isDragging } = useSortableItem();

	return (
		<button
			ref={composeRefs(ref)}
			type="button"
			data-state={isDragging ? "dragging" : undefined}
			className={cn(
				buttonVariants({ variant, size }),
				"cursor-grab data-[state=dragging]:cursor-grabbing",
				className,
			)}
			{...attributes}
			{...listeners}
			{...props}
		/>
	);
}

export { Sortable, SortableDragHandle, SortableItem, SortableOverlay };
