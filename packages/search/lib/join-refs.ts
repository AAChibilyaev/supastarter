/**
 * JOIN / Reference Field syntax helpers for Typesense v0.30+.
 *
 * Typesense supports querying across referenced collections using `$CollectionName(fields)` syntax
 * in `include_fields`, `filter_by`, and `sort_by` parameters.
 *
 * ## Schema
 * Reference fields are defined at collection creation via `CollectionFieldInput.reference`:
 * ```ts
 * { name: "category_id", type: "int32", reference: "categories" }
 * ```
 *
 * ## Search-time JOIN syntax
 * - `include_fields: joinRef("Categories", ["name", "icon"])` → `$Categories(name, icon)`
 * - `filter_by: joinFilter("Categories", "price:>=10")` → `$Categories(price:>=10)`
 * - `sort_by: joinSort("Categories", "name", "asc")` → `$Categories(name:asc)`
 * - Left join: `joinRef("Categories", ["name"], "nest_array")` → `$Categories(name, strategy:nest_array)`
 */

/**
 * Reference prefix character used by Typesense for JOIN syntax.
 */
const JOIN_PREFIX = "$";

/**
 * Build a `$Collection(field1, field2)` reference for use in `include_fields`.
 *
 * @param collection - The referenced collection name (case-sensitive)
 * @param fields - Fields to include from the referenced collection
 * @param strategy - Optional join strategy (`"nest_array"` for left join / array nesting)
 *
 * @example
 * ```ts
 * includeFields: joinRef("Categories", ["name", "icon"])
 * // → "$Categories(name, icon)"
 *
 * includeFields: `name, price, ${joinRef("Categories", ["name", "icon"])}`
 * // → "name, price, $Categories(name, icon)"
 *
 * // Left join — includes all documents even if no reference match
 * includeFields: joinRef("Categories", ["name"], "nest_array")
 * // → "$Categories(name, strategy:nest_array)"
 * ```
 */
export function joinRef(
	collection: string,
	fields: string[],
	strategy?: "nest_array",
): string {
	const fieldList = fields.join(", ");
	const strategyPart = strategy ? `, strategy:${strategy}` : "";
	return `${JOIN_PREFIX}${collection}(${fieldList}${strategyPart})`;
}

/**
 * Build a `$Collection(condition)` filter expression for use in `filter_by`.
 *
 * @param collection - The referenced collection name (case-sensitive)
 * @param condition - Typesense filter expression on the referenced collection's fields
 *
 * @example
 * ```ts
 * filterBy: `color:=red && ${joinFilter("Categories", "price:>=10")}`
 * // → "color:=red && $Categories(price:>=10)"
 * ```
 */
export function joinFilter(collection: string, condition: string): string {
	return `${JOIN_PREFIX}${collection}(${condition})`;
}

/**
 * Build a `$Collection(field:order)` sort expression for use in `sort_by`.
 *
 * @param collection - The referenced collection name (case-sensitive)
 * @param field - Field name in the referenced collection to sort by
 * @param order - Sort direction: `"asc"` (default) or `"desc"`
 *
 * @example
 * ```ts
 * sortBy: `${joinSort("Categories", "name", "asc")}, price:desc`
 * // → "$Categories(name:asc), price:desc"
 * ```
 */
export function joinSort(
	collection: string,
	field: string,
	order: "asc" | "desc" = "asc",
): string {
	return `${JOIN_PREFIX}${collection}(${field}:${order})`;
}
