# K-NanoMFA v1.4 Manual Addendum

## 1. Scope

Version 1.4 adds an optional product-informed market-input layer. All v1.3 workspaces and calculations remain available. The default input mode is **Direct ENM input**, which reproduces the prior workflow.

## 2. Activating product-informed input

1. Open **Study and material**.
2. Select **Product-informed inventory** under Market-input definition.
3. Open **Product and life cycle**.
4. Enter one inventory row for each product category.

The software calculates ENM mass for each category and then replaces the editable allocation vector with the calculated ENM shares. Switching back to Direct ENM input restores the legacy input logic; the product inventory remains stored but inactive.

## 3. Input bases

- **Direct ENM mass:** entered quantity is kg ENM/y.
- **Product mass × content:** kg product/y × ENM wt fraction × nano-enabled product fraction.
- **Unit sales × unit mass:** items/y × kg product/item × ENM wt fraction × nano-enabled product fraction.
- **Area × ENM loading:** m²/y × g ENM/m² × nano-enabled fraction ÷ 1000.
- **Volume × ENM concentration:** L/y × g ENM/L × nano-enabled fraction ÷ 1000.

All calculated values are converted internally to kg ENM/y before country/domain scaling.

## 4. Dynamic trajectories

Each row accepts annual percentage changes for product-market quantity, ENM content, and nano-enabled share. Changes are compounded from the dynamic start year. Content and nano-enabled shares are bounded to 0–100%. The resulting product-specific annual masses are supplied to the existing cohort engine. Recycled secondary input is distributed using the active product composition for that year.

## 5. Uncertainty and evidence

Quantity, content, and nano-enabled coefficients of variation are combined according to the active input basis and sampled as an independent lognormal product-input term. Evidence class, reference year, geographic scope, and source/limitation notes are stored in the product inventory and complete scenario JSON.

## 6. Results

The Results workspace adds a product-source contribution chart and table. Static runs report effective-domain ENM input and shares. Dynamic runs report final-year and cumulative product-specific primary inputs.

## 7. Import, export, and compatibility

- Product inventory can be imported/exported independently as JSON.
- Complete scenario and audit JSON files contain `product_inventory`.
- v1.2.1 and v1.3 scenario files without this field open in Direct ENM mode.
- Custom countries and subnational domains remain embedded in scenario JSON.
- Current product-informed scenarios captured in the multi-material workspace use the derived national first-year ENM input and active derived product allocation.

## 8. Scientific boundaries

The new module improves the input inventory; it does not yet predict ENM content from product descriptors. Product-specific uncertainty terms are independent, and alternative distribution families and parameter correlations are not included in v1.4. Nanoform state-transition calculations remain outside this release.
