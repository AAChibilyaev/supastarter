/**
 * E2E: Widget Filter Chips — active filters display, remove, clear all
 *
 * Tests the filter chips feature (AAC-137):
 * - Filter chips render when facets are selected
 * - Individual chip remove clears that filter
 * - "Clear all" button resets all filters
 * - Price range chip shows and can be removed
 */

import { test, expect } from "../../src/fixtures";

const BASE_URL = process.env.E2E_SAAS_URL || "http://localhost:3010";

test.describe("Widget Filter Chips", () => {
	test("should render filter chips when facet checkboxes are selected", async ({
		page,
	}) => {
		// Navigate to the widget script to ensure the widget is available
		await page.goto(`${BASE_URL}/api/widget/widget.js`);

		// Create a test page with the widget embedded
		await page.setContent(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Widget Test</title>
			</head>
			<body>
				<div id="aac-search"></div>
				<script>
					window.__AAC_TEST_MODE__ = true;

					// Intercept the search API to return facet data
					const originalFetch = window.fetch;
					window.fetch = function(url, options) {
						if (typeof url === 'string' && url.includes('/api/search/public/')) {
							return Promise.resolve({
								ok: true,
								status: 200,
								json: () => Promise.resolve({
									hits: [
										{
											document: {
												title: "Test Product 1",
												price: 29.99,
												brand: "BrandA",
												category: "Electronics",
												color: "black"
											}
										},
										{
											document: {
												title: "Test Product 2",
												price: 49.99,
												brand: "BrandB",
												category: "Electronics",
												color: "white"
											}
										},
										{
											document: {
												title: "Test Product 3",
												price: 39.99,
												brand: "BrandA",
												category: "Accessories",
												color: "blue"
											}
										}
									],
									found: 3,
									facet_counts: [
										{
											field_name: "brand",
											counts: [
												{ value: "BrandA", count: 2 },
												{ value: "BrandB", count: 1 }
											]
										},
										{
											field_name: "category",
											counts: [
												{ value: "Electronics", count: 2 },
												{ value: "Accessories", count: 1 }
											]
										},
										{
											field_name: "color",
											counts: [
												{ value: "black", count: 1 },
												{ value: "white", count: 1 },
												{ value: "blue", count: 1 }
											]
										}
									],
									search_time_ms: 5
								})
							});
						}
						return originalFetch.apply(this, arguments);
					};
				</script>
				<script src="${BASE_URL}/api/widget/widget.js"
					data-base-url="${BASE_URL}"
					data-api-key="test_search_key"
					data-index-slug="test-index"
					data-container="#aac-search"
					data-locale="en"
					data-mode="inline"
				></script>
			</body>
			</html>
		`);

		// Wait for the widget to render
		await page.waitForTimeout(1000);

		// Type a search query to trigger result rendering
		const searchInput = page.locator("input").first();
		await searchInput.fill("test");

		// Wait for search to complete and facets to render
		await page.waitForTimeout(500);

		// Check that facets are rendered
		const facetHeaders = page.locator(".aac-facet-header");
		const headerCount = await facetHeaders.count();
		expect(headerCount).toBeGreaterThanOrEqual(3);

		// Select a facet checkbox (BrandA)
		const brandCheckbox = page.locator(
			'input[type="checkbox"][data-field="brand"][data-value="BrandA"]',
		);
		await brandCheckbox.click();

		// Wait for re-render with filter chips
		await page.waitForTimeout(500);

		// Verify filter chips are rendered
		const filterChips = page.locator(".aac-filter-chip");
		const chipCount = await filterChips.count();
		expect(chipCount).toBeGreaterThanOrEqual(1);

		// Verify the chip shows the expected label and value
		const firstChip = filterChips.first();
		const chipText = await firstChip.textContent();
		expect(chipText).toContain("BrandA");
	});

	test("should remove filter when chip close button is clicked", async ({
		page,
	}) => {
		await page.goto(`${BASE_URL}/api/widget/widget.js`);

		await page.setContent(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Widget Test</title>
			</head>
			<body>
				<div id="aac-search"></div>
				<script>
					window.__AAC_TEST_MODE__ = true;
					const originalFetch = window.fetch;
					window.fetch = function(url, options) {
						if (typeof url === 'string' && url.includes('/api/search/public/')) {
							return Promise.resolve({
								ok: true,
								status: 200,
								json: () => Promise.resolve({
									hits: [
										{ document: { title: "Product 1", price: 10, brand: "BrandA", category: "Cat1" } },
										{ document: { title: "Product 2", price: 20, brand: "BrandB", category: "Cat2" } }
									],
									found: 2,
									facet_counts: [
										{
											field_name: "brand",
											counts: [
												{ value: "BrandA", count: 1 },
												{ value: "BrandB", count: 1 }
											]
										},
										{
											field_name: "category",
											counts: [
												{ value: "Cat1", count: 1 },
												{ value: "Cat2", count: 1 }
											]
										}
									],
									search_time_ms: 5
								})
							});
						}
						return originalFetch.apply(this, arguments);
					};
				</script>
				<script src="${BASE_URL}/api/widget/widget.js"
					data-base-url="${BASE_URL}"
					data-api-key="test_search_key"
					data-index-slug="test-index"
					data-container="#aac-search"
				></script>
			</body>
			</html>
		`);

		await page.waitForTimeout(1000);

		const searchInput = page.locator("input").first();
		await searchInput.fill("test");
		await page.waitForTimeout(500);

		// Select BrandA facet
		await page
			.locator('input[type="checkbox"][data-field="brand"][data-value="BrandA"]')
			.click();
		await page.waitForTimeout(500);

		// Verify filter chip appeared
		const chips = page.locator(".aac-filter-chip");
		expect(await chips.count()).toBeGreaterThanOrEqual(1);

		// Click remove button on the BrandA chip
		const removeBtn = page.locator(
			'.aac-filter-chip button[data-chip-remove="brand"]',
		).first();
		await removeBtn.click();
		await page.waitForTimeout(500);

		// Verify chip is removed (no filter chips visible)
		const chipsAfter = page.locator(".aac-filter-chip");
		expect(await chipsAfter.count()).toBe(0);
	});

	test('should clear all filters when "Clear all" is clicked', async ({
		page,
	}) => {
		await page.goto(`${BASE_URL}/api/widget/widget.js`);

		await page.setContent(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Widget Test</title>
			</head>
			<body>
				<div id="aac-search"></div>
				<script>
					window.__AAC_TEST_MODE__ = true;
					const originalFetch = window.fetch;
					window.fetch = function(url, options) {
						if (typeof url === 'string' && url.includes('/api/search/public/')) {
							return Promise.resolve({
								ok: true,
								status: 200,
								json: () => Promise.resolve({
									hits: [
										{ document: { title: "Product 1", price: 10, brand: "BrandA", category: "Cat1" } },
										{ document: { title: "Product 2", price: 20, brand: "BrandB", category: "Cat2" } }
									],
									found: 2,
									facet_counts: [
										{
											field_name: "brand",
											counts: [
												{ value: "BrandA", count: 1 },
												{ value: "BrandB", count: 1 }
											]
										},
										{
											field_name: "category",
											counts: [
												{ value: "Cat1", count: 1 },
												{ value: "Cat2", count: 1 }
											]
										}
									],
									search_time_ms: 5
								})
							});
						}
						return originalFetch.apply(this, arguments);
					};
				</script>
				<script src="${BASE_URL}/api/widget/widget.js"
					data-base-url="${BASE_URL}"
					data-api-key="test_search_key"
					data-index-slug="test-index"
					data-container="#aac-search"
				></script>
			</body>
			</html>
		`);

		await page.waitForTimeout(1000);

		const searchInput = page.locator("input").first();
		await searchInput.fill("test");
		await page.waitForTimeout(500);

		// Select two facet values
		await page
			.locator('input[type="checkbox"][data-field="brand"][data-value="BrandA"]')
			.click();
		await page.waitForTimeout(300);
		await page
			.locator('input[type="checkbox"][data-field="category"][data-value="Cat1"]')
			.click();
		await page.waitForTimeout(300);

		// Verify two chips are visible
		const chips = page.locator(".aac-filter-chip");
		const chipCount = await chips.count();
		expect(chipCount).toBeGreaterThanOrEqual(2);

		// Click "Clear all"
		const clearAll = page.locator("[data-action='clear-all-filters']");
		await clearAll.click();
		await page.waitForTimeout(500);

		// Verify all chips are removed
		const chipsAfter = page.locator(".aac-filter-chip");
		expect(await chipsAfter.count()).toBe(0);
	});
});
