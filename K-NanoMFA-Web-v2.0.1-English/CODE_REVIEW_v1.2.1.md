# K-NanoMFA v1.2.1 Code Review and Correction Report

## Review scope

The review covered the browser interface, core static and dynamic engines, advanced modules, multi-material calculations, scenario import/export, input validation, mass-balance accounting, and automated tests.

## Corrected implementation errors

1. **Negative annual growth**
   - Previous behavior: negative growth was passed through a percentage helper that clamps negative values to zero.
   - Consequence: a −10% trajectory remained constant rather than declining.
   - Correction: growth is calculated as `1 + growth/100`; finite growth from −100% upward is accepted and values below −100% are rejected.

2. **Opening landfill stock in dynamic closure**
   - Previous behavior: initial landfill stock was included in closing stock but omitted from cumulative input.
   - Consequence: closure could exceed 100% and the residual was negative.
   - Correction: opening landfill stock is now included in `cumulative_accounted_input_kg`. Primary input remains separately reported.

3. **Mass loss for a 100% reuse route**
   - Previous behavior: matured reuse stock was redistributed only across non-reuse routes. When reuse was 100%, the denominator was zero and no route received the mass.
   - Correction: matured material returns to the reuse process and remains mass-conserving.

4. **Insufficient percentage and finite-number validation**
   - Previous behavior: imported values such as −10% and 110% could sometimes pass sum-based validation.
   - Correction: all percentage entries are individually required to be finite and within 0–100%, in addition to vector-sum checks.

5. **Trajectory validation**
   - Correction: dynamic trajectories must contain consecutive integer years and finite non-negative inputs matching the selected horizon.

6. **Water-to-sediment transfer bounds**
   - Previous behavior: 0% was rejected while values above 100% were not specifically blocked.
   - Correction: the accepted range is 0–100%.

7. **Bayesian-calibration editor refresh**
   - Previous behavior: model state was updated, but visible tables and input fields could remain stale.
   - Correction: all relevant editors are refreshed after applying the posterior mean.

8. **Material-specific fate preset**
   - Previous behavior: changing the target material could leave the fate preset from the previously selected material.
   - Correction: built-in material changes now select the corresponding fate-behavior preset.

9. **Dynamic multi-material input display**
   - Previous behavior: final-year flows and PECs were paired with first-year input in the summary and Sankey root.
   - Correction: the final-year primary input is reported with final-year outputs; initial input is retained separately in the result object.

10. **Multi-material validation and import robustness**
    - Correction: shared environmental capacities, component definitions, formulation percentages, growth, years, PNECs, and imported project structures are validated and normalized.

11. **Table output safety**
    - Previous behavior: generic result-table cells accepted raw strings as HTML.
    - Correction: cells are escaped by default; only explicitly marked internal cells may contain trusted HTML.

## Added regression tests

`test_regression_v121.js` verifies:

- −10% annual decline;
- rejection of growth below −100%;
- mass closure with opening landfill stock;
- mass closure under 100% reuse;
- rejection of negative percentages; and
- rejection of non-consecutive trajectories.

## Test status

The following checks passed:

- JavaScript syntax checks for all application modules;
- country-domain and material regression tests;
- static and dynamic mass-balance tests;
- advanced reconciliation, stock-driven MFA, multimedia fate, and validation tests;
- custom-material tests;
- multi-material deterministic, formulation, dynamic, and uncertainty tests;
- v1.2.1 regression tests;
- static DOM audit for duplicate and missing element IDs; and
- headless Chromium integration tests for environment bounds, declining trajectories, fate-preset changes, calibration refresh, escaped table output, dynamic mixture input reporting, mixture validation, and old-project normalization.

## Scientific boundary

Passing software tests demonstrates implementation consistency for the tested cases. It does not establish empirical validity of bundled screening priors or national predictive accuracy. Project-specific calibration and external validation remain necessary for decision-grade applications.
