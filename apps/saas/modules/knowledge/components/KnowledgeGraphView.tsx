"use client";

import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────

export interface GraphNode {
	id: string;
	canonicalName: string;
	nodeType: string;
}

export interface GraphEdge {
	relationType: string;
	fromNodeId: string;
	toNodeId: string;
}

export interface KnowledgeGraphViewProps {
	nodes: GraphNode[];
	edges: GraphEdge[];
	className?: string;
}

// ── Layout state (force-directed, 2D) ────────────────────────────────────

interface LayoutNode extends GraphNode {
	x: number;
	y: number;
	vx: number;
	vy: number;
	fixed: boolean;
}

interface LayoutEdge extends GraphEdge {
	source: LayoutNode;
	target: LayoutNode;
}

const NODE_RADIUS = 28;
const REPULSION_STRENGTH = 12_000;
const ATTRACTION_STRENGTH = 0.008;
const CENTER_GRAVITY = 0.008;
const DAMPING = 0.85;
const MIN_VELOCITY = 0.1;
const MAX_ITERATIONS = 200;

function runForceLayout(
	nodesInput: GraphNode[],
	edgesInput: GraphEdge[],
	width: number,
	height: number,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
	const nodeMap = new Map<string, LayoutNode>();
	const nodes: LayoutNode[] = nodesInput.map((n, i) => {
		const angle = (2 * Math.PI * i) / nodesInput.length;
		const radius = Math.min(width, height) * 0.3;
		const node: LayoutNode = {
			...n,
			x: width / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
			y: height / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
			vx: 0,
			vy: 0,
			fixed: false,
		};
		nodeMap.set(n.id, node);
		return node;
	});

	const edges: LayoutEdge[] = edgesInput
		.map((e) => {
			const source = nodeMap.get(e.fromNodeId);
			const target = nodeMap.get(e.toNodeId);
			if (!source || !target) return null;
			return { ...e, source, target };
		})
		.filter((e): e is LayoutEdge => e !== null);

	// Run simulation
	for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
		// Clear forces
		for (const node of nodes) {
			if (node.fixed) continue;
			node.vx *= DAMPING;
			node.vy *= DAMPING;
		}

		// Repulsion (Coulomb's law)
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i];
				const b = nodes[j];
				if (a.fixed && b.fixed) continue;
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				let dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < 1) {
					dx = Math.random() - 0.5;
					dy = Math.random() - 0.5;
					dist = 1;
				}
				const force = REPULSION_STRENGTH / (dist * dist);
				const fx = (dx / dist) * force;
				const fy = (dy / dist) * force;
				if (!a.fixed) {
					a.vx -= fx;
					a.vy -= fy;
				}
				if (!b.fixed) {
					b.vx += fx;
					b.vy += fy;
				}
			}
		}

		// Attraction (Hooke's law)
		for (const edge of edges) {
			if (edge.source.fixed && edge.target.fixed) continue;
			const dx = edge.target.x - edge.source.x;
			const dy = edge.target.y - edge.source.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const force = dist * ATTRACTION_STRENGTH;
			const fx = (dx / (dist || 1)) * force;
			const fy = (dy / (dist || 1)) * force;
			if (!edge.source.fixed) {
				edge.source.vx += fx;
				edge.source.vy += fy;
			}
			if (!edge.target.fixed) {
				edge.target.vx -= fx;
				edge.target.vy -= fy;
			}
		}

		// Center gravity
		for (const node of nodes) {
			if (node.fixed) continue;
			node.vx += (width / 2 - node.x) * CENTER_GRAVITY;
			node.vy += (height / 2 - node.y) * CENTER_GRAVITY;
		}

		// Apply velocities
		let maxVel = 0;
		for (const node of nodes) {
			if (node.fixed) continue;
			node.x += node.vx;
			node.y += node.vy;
			const vel = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
			if (vel > maxVel) maxVel = vel;
		}

		if (maxVel < MIN_VELOCITY) break;
	}

	return { nodes, edges };
}

// ── Node type colours (neutral palette) ──────────────────────────────────

const NODE_COLORS: Record<string, string> = {
	entity: "#3b82f6",
	concept: "#8b5cf6",
	document: "#10b981",
	person: "#f59e0b",
	organization: "#06b6d4",
	product: "#f97316",
	location: "#14b8a6",
	event: "#e11d48",
	category: "#6366f1",
	keyword: "#84cc16",
};

function getNodeColor(nodeType: string): string {
	return NODE_COLORS[nodeType.toLowerCase()] ?? "#78716c";
}

// ── Component ────────────────────────────────────────────────────────────

export function KnowledgeGraphView({
	nodes: graphNodes,
	edges: graphEdges,
	className,
}: KnowledgeGraphViewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const [dimensions, setDimensions] = useState({ width: 600, height: 420 });
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
	// Pan/zoom state
	const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 600, h: 420 });
	const dragPanRef = useRef<{ startX: number; startY: number; vbx: number; vby: number } | null>(
		null,
	);
	const dragNodeRef = useRef<{
		nodeId: string;
		offsetX: number;
		offsetY: number;
	} | null>(null);

	// Recalculate layout when data changes
	const layout = useMemo(() => {
		if (graphNodes.length === 0) return null;
		return runForceLayout(graphNodes, graphEdges, dimensions.width, dimensions.height);
	}, [graphNodes, graphEdges, dimensions.width, dimensions.height]);

	// Measure container on mount and resize
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					setDimensions({ width, height });
				}
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// Sync viewBox when dimensions change
	useEffect(() => {
		setViewBox((prev) => ({
			x: prev.x,
			y: prev.y,
			w: dimensions.width,
			h: dimensions.height,
		}));
	}, [dimensions]);

	// ── Pan handlers (drag on background) ──────────────────────────────

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<SVGSVGElement>) => {
			// Only pan on background (not on nodes)
			const target = e.target as SVGElement;
			if (target.closest("[data-node-id]")) return;
			dragPanRef.current = {
				startX: e.clientX,
				startY: e.clientY,
				vbx: viewBox.x,
				vby: viewBox.y,
			};
			const svg = svgRef.current;
			if (svg) svg.setPointerCapture(e.pointerId);
		},
		[viewBox],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<SVGSVGElement>) => {
			// Node drag
			if (dragNodeRef.current && layout) {
				const node = layout.nodes.find((n) => n.id === dragNodeRef.current?.nodeId);
				if (node) {
					const svg = svgRef.current;
					if (!svg) return;
					const rect = svg.getBoundingClientRect();
					const scaleX = viewBox.w / rect.width;
					const scaleY = viewBox.h / rect.height;
					node.x =
						(e.clientX - rect.left) * scaleX + viewBox.x - dragNodeRef.current.offsetX;
					node.y =
						(e.clientY - rect.top) * scaleY + viewBox.y - dragNodeRef.current.offsetY;
					node.fixed = true;
					// Trigger re-render
					setDimensions((d) => ({ ...d }));
				}
				return;
			}

			// Pan
			if (!dragPanRef.current) return;
			const dx = e.clientX - dragPanRef.current.startX;
			const dy = e.clientY - dragPanRef.current.startY;
			const svg = svgRef.current;
			if (!svg) return;
			const rect = svg.getBoundingClientRect();
			const scaleX = viewBox.w / rect.width;
			const scaleY = viewBox.h / rect.height;
			setViewBox((prev) => ({
				...prev,
				x: dragPanRef.current!.vbx - dx * scaleX,
				y: dragPanRef.current!.vby - dy * scaleY,
			}));
		},
		[viewBox, layout],
	);

	const handlePointerUp = useCallback(() => {
		dragPanRef.current = null;
		dragNodeRef.current = null;
	}, []);

	// ── Node drag start ────────────────────────────────────────────────

	const handleNodePointerDown = useCallback(
		(e: React.PointerEvent, nodeId: string) => {
			e.stopPropagation();
			const svg = svgRef.current;
			if (!svg || !layout) return;
			const rect = svg.getBoundingClientRect();
			const scaleX = viewBox.w / rect.width;
			const scaleY = viewBox.h / rect.height;
			const node = layout.nodes.find((n) => n.id === nodeId);
			if (!node) return;
			dragNodeRef.current = {
				nodeId,
				offsetX: (e.clientX - rect.left) * scaleX + viewBox.x - node.x,
				offsetY: (e.clientY - rect.top) * scaleY + viewBox.y - node.y,
			};
			svg.setPointerCapture(e.pointerId);
		},
		[layout, viewBox],
	);

	// ── Zoom ───────────────────────────────────────────────────────────

	const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 1.1 : 0.9;
		setViewBox((prev) => {
			const newW = prev.w * delta;
			const newH = prev.h * delta;
			const cx = prev.x + prev.w / 2;
			const cy = prev.y + prev.h / 2;
			return {
				x: cx - newW / 2,
				y: cy - newH / 2,
				w: newW,
				h: newH,
			};
		});
	}, []);

	// ── Empty state ────────────────────────────────────────────────────

	if (!layout || graphNodes.length === 0) {
		return (
			<div
				ref={containerRef}
				className={cn(
					"flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30",
					className,
				)}
			>
				<p className="text-sm text-muted-foreground/60">No graph data to visualize</p>
			</div>
		);
	}

	// ── Render ─────────────────────────────────────────────────────────

	const connectedNodeIds = new Set<string>();
	for (const edge of layout.edges) {
		connectedNodeIds.add(edge.source.id);
		connectedNodeIds.add(edge.target.id);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative min-h-[280px] w-full overflow-hidden rounded-lg border border-border bg-card",
				className,
			)}
		>
			<svg
				ref={svgRef}
				className="size-full cursor-grab active:cursor-grabbing"
				viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onWheel={handleWheel}
			>
				<defs>
					<filter id="kgv-glow">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<marker
						id="kgv-arrowhead"
						markerWidth="8"
						markerHeight="6"
						refX="8"
						refY="3"
						orient="auto"
					>
						<polygon points="0 0, 8 3, 0 6" fill="currentColor" />
					</marker>
				</defs>

				{/* Edges */}
				{layout.edges.map((edge, i) => {
					const isHighlighted =
						hoveredNode === edge.source.id || hoveredNode === edge.target.id;
					const color = isHighlighted ? "currentColor" : "currentColor";
					const opacity = isHighlighted || !hoveredNode ? 0.5 : 0.08;
					const strokeW = isHighlighted ? 2 : 1;
					return (
						<line
							key={`edge-${i}`}
							x1={edge.source.x}
							y1={edge.source.y}
							x2={edge.target.x}
							y2={edge.target.y}
							stroke={color}
							strokeOpacity={opacity}
							strokeWidth={strokeW}
							className="text-border-foreground/20 transition-all duration-200"
						/>
					);
				})}

				{/* Edges text labels */}
				{layout.edges.map((edge, i) => {
					if (
						!hoveredNode ||
						(hoveredNode !== edge.source.id && hoveredNode !== edge.target.id)
					)
						return null;
					const mx = (edge.source.x + edge.target.x) / 2;
					const my = (edge.source.y + edge.target.y) / 2;
					return (
						<text
							key={`edge-label-${i}`}
							x={mx}
							y={my - 6}
							textAnchor="middle"
							className="font-medium fill-muted-foreground/60 text-[10px]"
						>
							{edge.relationType}
						</text>
					);
				})}

				{/* Nodes */}
				{layout.nodes.map((node) => {
					const isSelected = selectedNode === node.id;
					const isHovered = hoveredNode === node.id;
					const isDisconnected =
						!connectedNodeIds.has(node.id) && layout.edges.length > 0;
					const isDimmed =
						hoveredNode &&
						!isHovered &&
						!connectedNodeIds.has(node.id) &&
						!connectedNodeIds.has(node.id);
					const color = getNodeColor(node.nodeType);
					const r = isHovered ? NODE_RADIUS + 4 : NODE_RADIUS;

					return (
						<g
							key={node.id}
							data-node-id={node.id}
							onPointerDown={(e) => handleNodePointerDown(e, node.id)}
							onPointerEnter={() => setHoveredNode(node.id)}
							onPointerLeave={() => setHoveredNode(null)}
							onClick={() => setSelectedNode(isSelected ? null : node.id)}
							className="cursor-pointer transition-all duration-200"
							style={{ cursor: "pointer" }}
						>
							{/* Glow ring for selected */}
							{isSelected && (
								<circle
									cx={node.x}
									cy={node.y}
									r={r + 6}
									fill="none"
									stroke={color}
									strokeWidth={2}
									strokeOpacity={0.3}
								/>
							)}
							{/* Main circle */}
							<circle
								cx={node.x}
								cy={node.y}
								r={r}
								fill={color}
								fillOpacity={
									isDimmed ? 0.15 : hoveredNode && !isHovered ? 0.3 : 0.85
								}
								stroke={
									isSelected ? color : isHovered ? "currentColor" : "currentColor"
								}
								strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
								strokeOpacity={isHovered || isSelected ? 0.8 : 0.2}
								className="transition-all duration-200"
							/>
							{/* Label */}
							<text
								x={node.x}
								y={node.y + r + 4}
								textAnchor="middle"
								className={cn(
									"font-medium pointer-events-none fill-muted-foreground text-[10px] transition-all duration-200",
									isDimmed && "opacity-20",
								)}
							>
								{node.canonicalName.length > 16
									? node.canonicalName.slice(0, 14) + "…"
									: node.canonicalName}
							</text>
							{/* Type badge */}
							{isHovered && (
								<text
									x={node.x}
									y={node.y + r + 16}
									textAnchor="middle"
									className="font-normal pointer-events-none fill-muted-foreground/40 text-[8px]"
								>
									{node.nodeType}
								</text>
							)}
						</g>
					);
				})}
			</svg>

			{/* Legend */}
			<div className="bottom-2 left-2 gap-1.5 px-2 py-1.5 backdrop-blur-sm absolute z-10 flex flex-wrap rounded-md border border-border/50 bg-card/90">
				{Object.entries(NODE_COLORS).map(([type, color]) => {
					const hasType = graphNodes.some((n) => n.nodeType.toLowerCase() === type);
					if (!hasType) return null;
					return (
						<span
							key={type}
							className="gap-1 px-2 py-0.5 font-medium inline-flex items-center rounded-full text-[10px] text-muted-foreground"
						>
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: color }}
							/>
							{type}
						</span>
					);
				})}
			</div>

			{/* Selected node detail */}
			{selectedNode && (
				<div className="right-2 top-2 px-3 py-2 text-xs shadow-sm backdrop-blur-sm absolute z-10 max-w-[200px] rounded-md border border-border/50 bg-card/90">
					{(() => {
						const node = graphNodes.find((n) => n.id === selectedNode);
						if (!node) return null;
						const nodeEdges = graphEdges.filter(
							(e) => e.fromNodeId === node.id || e.toNodeId === node.id,
						);
						return (
							<div className="space-y-1">
								<p className="font-semibold text-foreground">
									{node.canonicalName}
								</p>
								<p className="text-muted-foreground">Type: {node.nodeType}</p>
								{nodeEdges.length > 0 && (
									<div className="pt-1">
										<p className="mb-0.5 text-muted-foreground/60">
											{nodeEdges.length} connection
											{nodeEdges.length !== 1 ? "s" : ""}
										</p>
										{nodeEdges.slice(0, 5).map((edge, i) => {
											const isSource = edge.fromNodeId === node.id;
											const other = isSource
												? graphNodes.find((n) => n.id === edge.toNodeId)
												: graphNodes.find((n) => n.id === edge.fromNodeId);
											return (
												<p
													key={i}
													className="truncate text-muted-foreground/50"
												>
													{isSource ? "→" : "←"} {edge.relationType}
													{other ? `: ${other.canonicalName}` : ""}
												</p>
											);
										})}
										{nodeEdges.length > 5 && (
											<p className="text-muted-foreground/40">
												+{nodeEdges.length - 5} more
											</p>
										)}
									</div>
								)}
							</div>
						);
					})()}
				</div>
			)}

			{/* Hint */}
			<div className="bottom-2 right-2 px-2 py-1 backdrop-blur-sm absolute z-10 rounded-md bg-card/80 text-[10px] text-muted-foreground/40">
				Drag to pan · Scroll to zoom · Click node for details
			</div>
		</div>
	);
}
