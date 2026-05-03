// ─── Query Rule Types ───────────────────────────────────────────────────────
// Shared between RuleEditorDialog and QueryRulesPanel

export interface QueryRuleCondition {
	field: "query" | "query_string" | "attribute";
	attribute?: string;
	operator:
		| "contains"
		| "not_contains"
		| "starts_with"
		| "ends_with"
		| "exact"
		| "is_empty"
		| "is_not_empty"
		| "regex"
		| "greater_than"
		| "less_than";
	value?: string;
}

export interface QueryRuleAction {
	type: "pin" | "hide" | "boost" | "bury" | "add_filter" | "redirect" | "show_message";
	documentId?: string;
	position?: number;
	filterField?: string;
	filterValue?: string;
	url?: string;
	message?: string;
	boostFactor?: number;
}

export interface QueryRule {
	id: string;
	name: string;
	enabled: boolean;
	priority: number;
	matchMode: "and" | "or";
	applyOnMultipleMatch: boolean;
	conditions: QueryRuleCondition[];
	actions: QueryRuleAction[];
}
