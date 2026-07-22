## v2.0.1-en — 22 July 2026
- Added an exact coupled linear state-transition solver with integrated pathway fluxes.
- Retained the v2.0 substep solver as a legacy comparison option.
- Added optional doubled-substep refinement auditing for the legacy solver.
- Added explicit tracking-mass-basis selection and renamed non-nano loss outputs as transfers outside the tracked basis.
- Added a dedicated water matrix-bound dissolution rate.
- Separated steady-state annual external-sink fluxes from cumulative spin-up sink masses.
- Added robust quoted CSV parsing, unit conversion, tracking-basis checks, and import diagnostics.
- Preserved the v2.0 base MFA, product, geography, mixture, nanoform, and advanced calculation pathways.

## v2.0-en — 22 July 2026
- Added an optional mass-conserving dynamic nanoform-resolved fate engine across air, water, soil, and active sediment.
- Added matrix weathering, aggregation, aggregate growth, fragmentation, dissolution, reprecipitation, particulate transformation, settling, deposition, runoff, erosion, resuspension, burial, advection, irreversible retention, and non-nano sinks.
- Added free-particle, small-aggregate, and large-aggregate environmental size classes.
- Added static steady-state and dynamic annual calculations with exact cumulative mass-balance diagnostics.
- Added storm-event soil and sediment remobilization.
- Added external state-resolved annual-emission CSV coupling.
- Added correlated lognormal kinetic-parameter uncertainty across four process groups.
- Added dynamic fate result tables, state-specific PECs, CSV export, scenario persistence, and complete audit output.
- Refined the full interface and verified zero page-level horizontal overflow at 1600, 1280, 1024, 768, and 480 px; all ten workspaces were checked at 1024 px.
- Preserved the v1.5 scientific core and all inherited functions; the new engine is disabled by default.

## v1.5-en — 22 July 2026
- Added optional, mass-conserving nanoform-state accounting for seven operational states.
- Added material-behavior and product-embedding presets with editable state allocations and evidence metadata.
- Added static terminal and dynamic cumulative state-balance checks.
- Added state-resolved environmental releases, screening PECs, result tables, and CSV export.
- Embedded nanoform configuration and outputs in scenario and audit JSON while preserving older scenario compatibility.
- Retained the v1.4.1 direct and product-informed inventory paths, custom geographies, multi-material assessment, advanced MFA/fate, uncertainty, validation, and exports.
- Refined the full interface and added bounded responsive layouts for panels, tables, charts, action rows, and forms.
- Verified zero page-level horizontal overflow in all ten workspaces at 1600, 1440, 1280, 1024, 768, and 480 px.

## v1.4.1-en — 22 July 2026
- Fixed responsive clipping in the custom country and geographic-domain manager.
- Added explicit `geo-identity-grid` and `geo-domain-grid` classes to stabilize the grid layout.
- Prevented input controls, text blocks, and route panels from overflowing the custom-country panel at narrow widths.
- Preserved the existing v1.4 scientific calculation core and product-informed input layer.

# Changelog

## v1.4-en — 22 July 2026

### Added
- Optional product-informed inventory while retaining direct ENM input as the default.
- Product mass, unit-sales, area-loading, and volume-concentration input bases.
- Product-specific ENM content, nano-enabled share, market/content/enabled trends, uncertainty, evidence, year, geography, and source fields.
- Automatic product-specific ENM mass conversion and allocation.
- Product-specific dynamic input trajectories and uncertainty sampling.
- Product-source contribution results and inventory JSON import/export.
- Product-inventory embedding in complete scenario and audit files.
- `product_inventory.js`, `test_product_inventory.js`, and `test_browser_v14.py`.

### Preserved
- Direct ENM input and complete v1.3/v1.2.1 behavior.
- All ten original workspaces, five guided stages, custom geography, advanced functions, multi-material functions, defaults, exports, and scenario compatibility.

## v1.3-en — 22 July 2026

### Added
- Five-stage guided navigation with an optional All workspaces view.
- Custom-country and custom-domain registry with browser persistence.
- User-defined population, area, sewered population, wastewater flow, sludge production, freshwater flow, country waste routes, and sludge-management routes.
- Multiple subnational domains for each custom country.
- Custom-geography JSON import/export and embedding in complete scenario JSON.
- Custom-geography provenance display and validation.
- `geography.js` and `test_geography.js`.

### Preserved
- All v1.2.1 scientific and software functions, default datasets, engines, advanced modules, mixture functions, and regression behavior.

## v1.2.1-en — 18 July 2026

Reviewed maintenance release following a deeper engine, import, and browser-workflow audit.

### Corrected

1. Negative annual growth was previously clamped to zero by the percentage helper. Declining trajectories now work correctly down to −100%.
2. Initial landfill stock is now treated as an opening balance in dynamic mass-balance closure.
3. Matured reuse mass in a 100% reuse route is returned to the reuse process instead of disappearing.
4. Percentage vectors, non-finite values, trajectory continuity, dynamic settings, environmental capacities, and mixture inputs receive stricter validation.
5. Water-to-sediment transfer now permits 0% and is bounded at 100%.
6. Applying a Bayesian posterior mean now refreshes the visible input editors.
7. Changing a built-in material applies its corresponding multimedia-fate preset.
8. Dynamic multi-material result summaries use final-year primary input.
9. Imported scenarios and mixture projects are checked and normalized more defensively.
10. Generic result tables escape user-entered content unless a cell is explicitly marked as trusted internal HTML.

### Added

- `test_regression_v121.js` covering declining input, opening stock, repeated reuse, invalid percentages, and non-consecutive trajectories.
- Additional dynamic export fields: opening technosphere stock and cumulative accounted input.
