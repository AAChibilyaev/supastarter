"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { cn } from "../lib";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HierarchicalFacetValue {
	raw: string;
	segments: string[];
	level: number;
	value: string;
	path: string;
	parentPath: string | null;
}

export interface HierarchicalFacetTreeProps {
	/** Raw facet counts from Typesense */
	facetValues: Array<{ value: string; count: number }>;
	/** The hierarchy separator character (e.g. "/") */
	separator: string;
	/** Currently selected filter path */
	selectedPath?: string | null;
	/** Called when a facet value is selected/deselected */
	onSelect: (path: string | null) => void;
	/** Label for the "All" / reset option */
	allLabel?: string;
	/** Max hierarchy depth to show */
	maxDepth?: number;
	/** Optional class name */
	className?: string;
	/** Show counts next to values */
	showCounts?: boolean;
}

// ─── Utility ────────────────────────────────────────────────────────────────

function parseHierarchicalValues(
	values: Array<{ value: string; count: number }>,
	separator: string,
): HierarchicalFacetValue[] {
	const result: HierarchicalFacetValue[] = [];
	const seen = new Set<string>();

	for (const v of values) {
		const segments = v.value.split(separator).filter(Boolean);
		if (segments.length === 0) continue;

		for (let i = 0; i < segments.length; i++) {
			const level = i + 1;
			const path = segments.slice(0, level).join(separator);
			const parentPath = level > 1 ? segments.slice(0, level - 1).join(separator) : null;
			const key = `${path}:${level}`;

			if (!seen.has(key)) {
				seen.add(key);
				result.push({
					raw: v.value,
					segments: [...segments],
					level,
					value: segments[i]!,
					path,
					parentPath,
				});
			}
		}
	}

	return result;
}

// ─── Tree Node ──────────────────────────────────────────────────────────────

interface TreeNode {
	value: string;
	path: string;
	count: number;
	level: number;
	parentPath: string | null;
	children: TreeNode[];
}

function buildTree(parsed: HierarchicalFacetValue[], countMap: Map<string, number>): TreeNode[] {
	const rootNodes: TreeNode[] = [];
	const nodeMap = new Map<string, TreeNode>();

	for (const item of parsed) {
		const node: TreeNode = {
			value: item.value,
			path: item.path,
			count: countMap.get(item.path) ?? 0,
			level: item.level,
			parentPath: item.parentPath,
			children: [],
		};
		nodeMap.set(item.path, node);

		if (item.parentPath === null) {
			rootNodes.push(node);
		} else {
			const parent = nodeMap.get(item.parentPath);
			if (parent) {
				parent.children.push(node);
			} else {
				rootNodes.push(node);
			}
		}
	}

	return rootNodes;
}

// ─── Tree Node Component ────────────────────────────────────────────────────

function TreeNodeItem({
	node,
	selectedPath,
	onSelect,
	depth,
	maxDepth,
}: {
	node: TreeNode;
	selectedPath: string | null | undefined;
	onSelect: (path: string | null) => void;
	depth: number;
	maxDepth: number;
}) {
	const [expanded, setExpanded] = useState(
		selectedPath != null && selectedPath.startsWith(node.path),
	);
	const isSelected = selectedPath === node.path;
	const hasChildren = node.children.length > 0 && depth < maxDepth;

	const handleToggle = useCallback(() => {
		setExpanded((prev) => !prev);
	}, []);

	const handleSelect = useCallback(() => {
		if (isSelected) {
			onSelect(node.parentPath);
		} else {
			onSelect(node.path);
		}
	}, [isSelected, node.path, node.parentPath, onSelect]);

	return (
		<div className="space-y-0.5">
			<div
				className={cn(
					"gap-1.5 px-2 py-1.5 text-sm flex items-center rounded-md transition-colors",
					isSelected
						? "font-medium bg-primary/10 text-primary"
						: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
				)}
				style={{ paddingLeft: `${12 + depth * 16}px` }}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={handleToggle}
						className="size-4 rounded flex shrink-0 items-center justify-center hover:bg-muted"
					>
						{expanded ? (
							<ChevronDownIcon className="size-3" />
						) : (
							<ChevronRightIcon className="size-3" />
						)}
					</button>
				) : (
					<div className="size-4 shrink-0" />
				)}
				<button
					type="button"
					onClick={handleSelect}
					className="gap-2 flex flex-1 items-center justify-between text-left"
				>
					<span className="truncate">{node.value}</span>
					<span className="text-xs shrink-0 text-muted-foreground/60 tabular-nums">
						{node.count.toLocaleString()}
					</span>
				</button>
			</div>
			{hasChildren && expanded && (
				<div className="space-y-0.5">
					{node.children.map((child) => (
						<TreeNodeItem
							key={child.path}
							node={child}
							selectedPath={selectedPath}
							onSelect={onSelect}
							depth={depth + 1}
							maxDepth={maxDepth}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HierarchicalFacetTree({
	facetValues,
	separator,
	selectedPath,
	onSelect,
	allLabel = "All",
	maxDepth = 5,
	className,
	showCounts = true,
}: HierarchicalFacetTreeProps) {
	const tree = useMemo(() => {
		const parsed = parseHierarchicalValues(facetValues, separator);
		const countMap = new Map<string, number>();
		for (const item of parsed) {
			// Use the last count we encounter for this path
			const rawItem = facetValues.find((v) => v.value === item.path);
			if (rawItem) {
				countMap.set(item.path, rawItem.count);
			}
		}
		return buildTree(parsed, countMap);
	}, [facetValues, separator]);

	const totalCount = useMemo(() => {
		return facetValues.reduce((sum, v) => sum + v.count, 0);
	}, [facetValues]);

	return (
		<nav className={cn("space-y-1", className)} role="tree" aria-label="Facet tree">
			{/* "All" / reset option */}
			<button
				type="button"
				onClick={() => onSelect(null)}
				className={cn(
					"gap-1.5 px-2 py-1.5 text-sm flex w-full items-center rounded-md transition-colors",
					selectedPath === null
						? "font-medium bg-primary/10 text-primary"
						: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
				)}
				style={{ paddingLeft: "12px" }}
			>
				<div className="size-4 shrink-0" />
				<span className="truncate">{allLabel}</span>
				{showCounts && (
					<span className="text-xs ml-auto shrink-0 text-muted-foreground/60 tabular-nums">
						{totalCount.toLocaleString()}
					</span>
				)}
			</button>

			{/* Tree nodes */}
			{tree.map((node) => (
				<TreeNodeItem
					key={node.path}
					node={node}
					selectedPath={selectedPath}
					onSelect={onSelect}
					depth={0}
					maxDepth={maxDepth}
				/>
			))}
		</nav>
	);
}
