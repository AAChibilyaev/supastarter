# AAC-137: Price Range Slider Widget

## Changes to `/Users/aac/Projects/ts/supastarter/packages/widget/src/index.ts`

1. **SearchState**: Add `priceRange: { min: number; max: number } | null`
2. **doSearch()**: Include `price:>=min && price:<=max` in filterBy when priceRange is set
3. **renderFacets()**: Detect price-type facets (field name contains "price"), render slider instead of checkboxes
4. **renderPriceRangeSlider()**: New method — dual-thumb range slider using two `<input type="range">`
5. **attachEvents()**: Add handlers for price range slider with debounce
6. **CSS**: Add styles for range inputs, slider track, labels
7. **render()**: Pass price range state to price slider
