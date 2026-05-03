import { type AssistantMode } from "../intent-classifier";
import { buildBasePrompt, type BasePromptParams } from "./base-system-prompt";
import { buildConsultationPrompt } from "./consultation-prompt";
import { buildExpertPrompt } from "./expert-prompt";
import { buildOutfitPrompt } from "./outfit-prompt";
import { buildServicePrompt } from "./service-prompt";

export interface PromptBuilderParams extends BasePromptParams {
	mode: AssistantMode;
	availableTools: string[];
	productContext?: {
		productId: string;
		productTitle?: string;
		categorySlug?: string;
	};
	userSegment?: string;
}

function buildModePrompt(mode: AssistantMode): string {
	switch (mode) {
		case "product_consultation":
			return buildConsultationPrompt();
		case "service":
			return buildServicePrompt();
		case "expert_advice":
			return buildExpertPrompt();
		case "outfit":
			return buildOutfitPrompt();
		case "size_help":
			return buildSizeHelpPrompt();
		case "bundle":
			return buildBundlePrompt();
	}
}

function buildSizeHelpPrompt(): string {
	return `
ROLE: Size & Fit Specialist

YOUR GOAL: Help the user select the correct size with confidence.

PROCESS:
1. Get product details via get_product_details (size guide, fit notes).
2. Ask relevant questions: height, weight (for apparel), foot length in cm (for shoes), usual size in known brands.
3. Match their measurements to the brand's size chart.
4. Note any fit quirks: "This model runs narrow — go up a half size if you have wide feet."
5. If unsure between two sizes, give a clear recommendation: "Given your measurements, I'd recommend size M. If you're between sizes and prefer a looser fit, go L."

TONE: Precise and reassuring. Reduce purchase anxiety.`;
}

function buildBundlePrompt(): string {
	return `
ROLE: Activity Kit Builder

YOUR GOAL: Build a complete, practical gear list for the user's activity or situation.

PROCESS:
1. Understand the activity: skill level, intensity, environment (indoor/outdoor, weather), duration.
2. Build a priority-ordered list: essential items first, then recommended, then optional.
3. For each category, use search_products to find available items.
4. Use get_similar_products for alternatives at different price points.
5. Summarize total estimated cost (sum of prices from search results).

FORMAT: Group by category (footwear, clothing, equipment, accessories). Mark items as Essential / Recommended / Optional.`;
}

function buildProductContextInjection(
	productContext: PromptBuilderParams["productContext"],
): string {
	if (!productContext) return "";
	return `
CURRENT CONTEXT: The user is viewing product "${productContext.productTitle ?? productContext.productId}" (ID: ${productContext.productId}${productContext.categorySlug ? `, category: ${productContext.categorySlug}` : ""}). Use this as starting context for the conversation.`;
}

function buildToolsContext(availableTools: string[]): string {
	if (availableTools.length === 0) return "";
	return `
AVAILABLE TOOLS: ${availableTools.join(", ")}
Use tools proactively to get accurate, real-time data. Never answer questions about prices, availability, orders, or user conditions without using the relevant tool.`;
}

export function buildSystemPrompt(params: PromptBuilderParams): string {
	const base = buildBasePrompt({
		brandName: params.brandName,
		brandVoice: params.brandVoice,
		locale: params.locale,
	});

	const modePrompt = buildModePrompt(params.mode);
	const productCtx = buildProductContextInjection(params.productContext);
	const toolsCtx = buildToolsContext(params.availableTools);

	return [base, modePrompt, productCtx, toolsCtx].filter(Boolean).join("\n\n").trim();
}
