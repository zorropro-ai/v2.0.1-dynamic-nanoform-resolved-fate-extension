# K-NanoMFA Web v2.1.1 — Task-Navigated Dynamic Nanoform MFA–Fate Platform


Version 2.1.1 preserves the v2.0.1 scientific engine and the v2.1 six-task interface while adding analysis readiness, linked input review, contextual help, browser autosave/recovery, and guided example scenarios.

## What is new in v2.1.1

- Six-stage analysis-readiness indicator
- Linked run-readiness review with direct navigation to unresolved inputs
- Context help on major panels with chapter-level manual references
- Five-snapshot browser autosave and recovery history
- Guided examples for standard, product-informed, and nanoform-fate analyses
- Complete `K-NanoMFA_User_Manual_v2.1.1.docx` and `.pdf`
- No removal of v2.1 workspaces or v2.0.1 scientific calculations

## Interface foundation inherited from v2.1

- Six task-based interface groups
- Dedicated Nanoform & fate workspace
- Searchable feature directory with direct panel navigation
- Quick workflows for common analysis types


K-NanoMFA is a browser-based platform for product-informed, country- and subnational-domain-resolved material-flow analysis of engineered nanomaterials. Version 2.0 preserves the complete v1.5 application and adds an optional dynamic nanoform-resolved environmental fate engine. The new engine propagates seven operational environmental forms through air, surface water, soil, and active sediment using competing first-order state transitions, intermedia transfers, episodic remobilization, and explicit external sinks.

## Software identity

- Developer: Prof. Younghun Kim
- Affiliation: Kwangwoon University
- Contact: korea1@kw.ac.kr
- Initial release: 17 July 2026
- Current release: 22 July 2026
- Current version: 2.1.1-en
- License: MIT License

## What is new in v2.0.1

Version 2.0.1 retains the full v2.0 workflow and adds an exact coupled linear solver, explicit tracking-basis selection, dedicated water matrix-bound dissolution, separated steady-state annual versus spin-up cumulative sink reporting, a legacy doubled-substep refinement audit, and robust unit-aware CSV import.


- Optional dynamic nanoform-resolved fate calculation, disabled by default for backward-compatible operation
- Four active environmental compartments: air, surface water, soil, and active sediment
- Seven operational forms: matrix-bound, free nanoparticle, small aggregate, large aggregate, dissolved constituent, transformed particulate, and unresolved form
- Competing first-order transformations integrated with exact mass conservation at each numerical substep
- Dynamic aggregation, aggregate growth, fragmentation, dissolution, reprecipitation, particulate transformation, and non-nano transformation sinks
- Form-dependent settling from water to sediment
- Air deposition, soil runoff and erosion, soil-to-air resuspension, sediment resuspension, porewater exchange, burial, advective removal, and irreversible soil retention
- Optional storm-event remobilization in user-entered calendar years
- Static steady-state calculation and dynamic annual fate trajectories
- State- and compartment-specific PEC output
- External state-resolved annual-emission CSV coupling
- Correlated kinetic-parameter uncertainty for dissolution, aggregation/settling, transport/remobilization, and transformation groups
- Complete configuration, results, uncertainty, and evidence metadata in scenario and audit exports
- Revised interface hierarchy, responsive result grids, bounded tables, and page-level overflow prevention
- Added `dynamic_fate.js`, `test_dynamic_fate.js`, `test_browser_v20.py`, and `MANUAL_ADDENDUM_v2.0.1.md`

## v2.0 dynamic nanoform-fate workflow

1. Complete and run a direct or product-informed MFA definition.
2. Open **Evidence, QA and sensitivity** and enable the v1.5 nanoform-state allocation.
3. Open **Advanced MFA and fate** and enable **Dynamic nanoform-resolved environmental fate**.
4. Select a kinetic behavior preset or replace the first-order rate constants with case-specific data.
5. Set the numerical substeps, water residence time, aggregate-size split, and optional initial environmental stocks.
6. Enter storm-event years when episodic remobilization is relevant.
7. Optionally import an external state-resolved annual-emission CSV instead of using the internal release inventory.
8. Run the MFA model and inspect active stocks, state-specific PECs, process transfers, and external sinks in **Results**.
9. Confirm kinetic-fate mass-balance closure before interpreting the outputs.
10. Run correlated kinetic uncertainty and export the result CSV or complete audit JSON.

The v2.0 engine is a spatially aggregated kinetic screening model. It resolves operational nanoform states and size classes more explicitly than the proportional v1.5 post-processing layer, but it does not calculate full particle-size distributions, ionic speciation, pH-dependent surface chemistry, natural-colloid heteroaggregation kernels, or watershed hydraulics.

## Compatibility guarantee

The v2.0.1 kinetic fate module is disabled by default. When it is disabled, the v1.5 calculation and output pathway is retained. All previous workspaces, materials, product-informed inputs, custom countries and subnational domains, custom materials, static and dynamic MFA, uncertainty, sensitivity, benchmarks, multi-material assessment, trade accounting, reconciliation, calibration, reduced-form multimedia fate, validation, life-cycle burden, and export functions remain available. Scenario files from v1.2.1 through v1.5 remain importable; missing v2.0 fields are initialized with disabled defaults.

## What is retained from v1.4.1

- Six task-based groups replace the crowded single-row navigation while preserving every original workspace
- **All workspaces** view restores the complete ten-workspace tab row at any time
- Custom-country manager for user-defined national statistics, environmental denominators, waste routes, and sewage-sludge routes
- Optional custom subnational domains under each user-defined country
- Custom geographies are stored locally, exported/imported as JSON, and embedded in complete scenario JSON files
- Custom countries are available to deterministic, probabilistic, dynamic, multi-material, advanced-fate, validation, comparison, and export modules without a separate calculation engine
- Improved responsive navigation and reduced rendering cost for long tables and charts
- Added `test_geography.js` and headless-browser checks for custom-country creation and scenario portability

## What is corrected in v1.2.1

- Correct handling of negative annual growth down to −100%
- Opening landfill stock included in cumulative dynamic mass-balance accounting
- Mass-conserving repeated reuse when an EoL route is 100% reuse
- Range and finite-number validation for imported percentages, trajectories, dynamic settings, environmental capacities, and mixture inputs
- Water-to-sediment transfer accepts 0% and rejects values above 100%
- Bayesian calibration now refreshes all visible input editors
- Built-in material changes now reset the reduced-form fate preset to the corresponding material class
- Dynamic multi-material summaries and Sankey inputs now use the final-year primary input rather than the first-year input
- Imported mixture projects are normalized and incomplete definitions are rejected with a clear message
- User-entered table values are escaped by default
- Added `test_regression_v121.js` for the corrected edge cases

The scientific scope remains screening-level. This maintenance release corrects implementation and validation errors; it does not convert bundled priors into calibrated national inventories.

## What is new in v1.2

- **Assessment mode** selector for single-material or multiple-material/co-exposure projects
- Parallel MFA calculation for bundled and custom nanomaterials in one country/domain
- Material-specific inputs, growth rates, active years, tracking bases, co-use groups, and evidence metadata
- **Co-formulated product/blend groups** with a shared blend input, composition fractions, use releases, EoL routes, and lifetime distribution
- Material-specific treatment transfer coefficients retained inside co-formulated products
- Multi-material Sankey diagram with common terminal destinations
- Medium-specific co-occurrence tables and material contribution profiles
- Tracking-basis compatibility gate before summing physical mass concentrations
- Component HQ and cumulative HI within user-defined assessment groups
- Automatic blocking of HI when endpoint descriptions are inconsistent within an assessment group
- Optional user-entered pairwise interaction coefficient β; default β = 0
- Dynamic material-specific PEC and HI time series
- Joint Monte Carlo simulation with shared country/environment samples and shared formulation-input uncertainty
- P5/P50/P95 mixture output and probability that HI exceeds 1
- Mixture project JSON and co-exposure CSV export/import
- Complete mixture configuration embedded in the main scenario JSON and audit output

## Product-informed workflow

1. Select **Product-informed inventory** under Project settings.
2. Open **Product and life cycle**.
3. For each product category, choose an input basis and enter the product quantity.
4. For product-mass and unit-sales bases, enter ENM content and the nano-enabled market fraction.
5. For area- or volume-based inputs, enter the ENM loading or concentration and the nano-enabled fraction.
6. Review the calculated ENM mass and the automatically derived product allocations.
7. For dynamic runs, enter annual changes in market quantity, content, and nano-enabled share.
8. Document quantity, content, and nano-enabled uncertainty, evidence class, year, geography, and source limitations.
9. Run the model and inspect the product-source contribution results.

The product-informed layer converts market data to nanomaterial mass before geographic scaling and MFA. It does not treat total product mass as nanomaterial mass. Product-specific input uncertainty terms remain independent in v2.0.1; correlations and alternative distribution families are not yet implemented.

## Nanoform-state workflow

1. Complete the base direct or product-informed MFA definition.
2. Open **Evidence, QA and sensitivity**.
3. Enable **Nanoform-state tracking**.
4. Select the material-behavior and product-embedding presets, or enter custom allocations.
5. Confirm that the initial product-state allocation totals 100%.
6. Review medium-specific free/aggregated and dissolved/transformed splits.
7. Record evidence class, source, and limitations.
8. Run the base model and inspect the nanoform-state results in the Results workspace.
9. Confirm state-balance closure before interpreting state-specific PECs.
10. Export the state table or complete audit package.

The v1.5 state-allocation layer conservatively divides the existing MFA mass among operational states. The optional v2.0.1 kinetic fate engine can subsequently propagate these states through first-order aggregation, dissolution, transformation, settling, remobilization, and burial processes. Neither module predicts bioavailability or full geochemical speciation.

## Multi-material workflow

1. Select **Multiple nanomaterials / co-exposure** under Assessment mode.
2. Open **Multi-material / mixtures**.
3. Add at least two bundled materials or capture an edited custom scenario.
4. Use **Direct material input** for independent co-occurrence.
5. For nanomaterials in the same product or blend, create a formulation group and assign fractions that total 100%.
6. Select a common tracking basis only when the physical masses are scientifically commensurable.
7. Enter medium-specific PNECs only for comparable nanoforms, endpoints, and assessment groups.
8. Run the multi-material assessment.
9. Inspect material-specific MFA, PECs, co-occurrence, HQ/HI, and dominant contributors.
10. Run joint mixture uncertainty and export the project and results.

## Independent co-occurrence and co-formulation

### Independent co-occurrence

Each component uses its own product allocation, use-stage releases, EoL routes, treatment coefficients, and lifetime distribution. All components share the selected geographic domain and environmental capacities.

### Co-formulated product or blend

The formulation group defines:

- Total nanomaterial-blend input
- Material fractions
- Use-stage release pattern
- End-of-life routing
- Mean lifetime and Weibull shape
- Active years and growth trajectory

The group fractions are applied to the blend input. Each component then uses its own material-specific WWTP, incineration, landfill, recycling, reuse, and biological-treatment transfer coefficients.

## Mixture screening equations

For component `i`:

```text
HQ_i = PEC_i / PNEC_i
```

For components with a common medium, assessment group, and comparable endpoint:

```text
HI = Σ HQ_i
```

Optional user-entered interaction adjustment:

```text
HI_adjusted = HI + Σ β_ij HQ_i HQ_j
```

The software does not predict β. A nonzero value should be used only when the material pair, medium, endpoint, concentration range, coating, size, and other nanoform conditions are supported by directly relevant evidence.

## Important interpretation boundaries

- A summed concentration is a physical mass-concentration total, not a toxic-equivalence concentration.
- Concentration sums are blocked when component tracking bases differ, unless the user explicitly overrides the compatibility gate and documents the justification.
- HQ/HI is calculated only from user-supplied PNECs and does not create or infer toxicity thresholds.
- HI is a component-based screening index, not proof of additive toxicodynamics.
- Different endpoints must not be combined in one assessment group.
- An interaction-adjusted HI is exploratory and is not a mechanistic mixture-toxicity model.
- The multi-material module runs the existing MFA engines independently for each material; it does not model direct particle-particle transformation, heteroaggregation, surface exchange, or dissolution interactions between mixture components.

## Included nanomaterials

- Carbon nanotubes
- Carbon black
- Graphene and graphene-based nanomaterials
- Fullerenes
- Silver nanoparticles
- Nano-TiO₂
- Nano-ZnO
- Nano-SiO₂
- Nanocellulose
- Nanoclay
- Custom nanomaterial scenario

## Geographic domains

National domains are included for the Republic of Korea, China, United States, Japan, Germany, France, United Kingdom, India, Canada, and Australia. Korea additionally contains 17 subnational domains.

## Model modes

- **Static deterministic MFA:** one year, fixed parameters.
- **Static probabilistic MFA:** one-year uncertainty and P5/P50/P95 output.
- **Dynamic probabilistic MFA:** inflow-driven cohorts, stocks, delayed EoL, recycling, reuse, and landfill stock.
- **Stock-driven dynamic MFA:** inverse solution for a target stock in the single-material advanced workspace.

The multi-material module supports the static deterministic, static probabilistic, and inflow-driven dynamic structures. Stock-driven inverse calculation remains a single-material advanced module in v1.2.

## Run locally

```bash
python -m http.server 8080
```

Open `http://localhost:8080`. Windows users may run `serve_local.bat`; macOS and Linux users may run `./serve_local.sh`.

## Verification

```bash
node test_engine.js
node test_advanced.js
node test_custom_material.js
node test_mixture.js
node test_regression_v121.js
node test_geography.js
node test_product_inventory.js
node test_nanoform.js
node test_dynamic_fate.js
python test_browser_v20.py
```

The tests cover product-market conversion, product-specific trajectories and uncertainty, bundled and custom national domains, custom subnational domains, bundled and custom materials, static and dynamic mass-balance closure, PEC calculation, formulation fractions, component-based co-exposure, joint uncertainty, reconciliation, stock-driven inverse MFA, reduced-form multimedia fate, validation statistics, five-stage navigation, preservation of all ten original workspaces, and scenario portability. The Python browser test requires Playwright and Chromium; all numerical tests require Node.js only.

## User manual

Open `K-NanoMFA_User_Manual_v2.1.1.docx`, `MANUAL_ADDENDUM_v1.3.md`, and `MANUAL_ADDENDUM_v2.0.1.md`, or use the manual links in the application.

## License and disclaimer

K-NanoMFA is distributed under the MIT License. Free use, modification, and redistribution are permitted if the copyright and license notices are retained. See `LICENSE` and `DISCLAIMER.md`.


## v1.4.1 maintenance

Version 1.4.1 corrects a responsive-layout defect in the custom country and geographic-domain manager. The country-identity grid, domain grid, route grids, and action rows now wrap cleanly at narrower widths without clipping the right-hand panel or input fields. No scientific calculation logic was changed in this maintenance release.


## v2.0.1 numerical and interpretation update

- The default dynamic-fate solver evaluates the coupled linear state system simultaneously rather than delaying downstream transformations until the next user-selected substep.
- The legacy substep solver remains available and can be checked with a doubled-substep refinement audit.
- Every dynamic-fate scenario records an explicit tracking mass basis.
- Static output separates steady-state annual sink flux from cumulative spin-up sink mass.
- The external coupling importer supports quoted CSV fields, unit conversion, tracking-basis checks, and explicit error reporting.
- Existing base MFA engines and v2.0-disabled behavior remain unchanged.
## Current manual

- `K-NanoMFA_User_Manual_v2.1.1.pdf` — browser-readable complete manual
- `K-NanoMFA_User_Manual_v2.1.1.docx` — editable complete manual
- `MANUAL_ADDENDUM_v2.1.1.md` — concise release notes


## v2.1.1 usability stabilization

Version 2.1.1 adds analysis-readiness indicators, a linked run-readiness review, contextual panel help, rotating browser autosaves, recovery controls, and three transparent example starting scenarios. The v2.0.1 scientific engines and v2.1 task organization are preserved.
