# Expert Review and v1.2 Response

## Main weaknesses identified before v0.8

The earlier prototype required stronger provenance, uncertainty differentiation, sensitivity analysis, tracking-basis definition, nanoform-state reporting, scenario comparison, and a reproducible MFA-to-fate emission inventory. These items were addressed in v0.8.

## Additional limitations identified after v0.8

1. **No formal reconciliation of redundant measurements.** A balanced model could not assimilate conflicting measured inputs, outputs, and stock changes according to their uncertainties.
2. **No posterior calibration.** Observed concentrations or flows could not update uncertain parameter multipliers.
3. **Only inflow-driven dynamic MFA.** The model could not infer the inflow needed to meet a target stock trajectory.
4. **No explicit trade balance.** Production, imports, exports, and inventory changes were not separated.
5. **PECs remained screening dilution or residence-time calculations.** Intermedia transfers and external fate sinks were not dynamically connected.
6. **No independent fit statistics.** Users could not enter measured datasets and quantify predictive residuals.
7. **No environmental-burden co-indicator.** Circularity scenarios could be compared by mass but not by an editable treatment and recovery burden screen.

## Implemented through v1.0

- Nonnegative uncertainty-weighted constrained data reconciliation.
- Optional combination of model priors and observations before balance closure.
- Grid-based Bayesian calibration of positive scalar multipliers.
- Stock-driven inverse cohort MFA with target-stock and achieved-stock diagnostics.
- Static and annual trade-balanced apparent consumption.
- Bilateral partner allocation matrix for import and export reporting.
- Four-compartment, mass-conserving reduced-form multimedia fate model.
- Static steady-state and dynamic multimedia PEC outputs.
- User-entered validation datasets with RMSE, MAE, bias, MAPE, coverage, and reduced chi-square.
- Editable screening climate-burden factors and avoided-production credit.
- Advanced assumptions and outputs included in scenario and audit files.

## Remaining scientific qualification

The added functions close important architectural gaps but do not make the bundled priors nationally validated. The multimedia module uses first-order rates rather than particle-resolved aggregation, dissolution chemistry, hydrodynamics, or spatial routing. The trade module does not constitute a full multi-regional input-output supply-chain model. The burden indicator is not a complete ISO life-cycle assessment. External validation remains controlled by the availability, comparability, and representativeness of measured nanoform data.


## v1.1 custom-material extension

The fixed target-material list was a practical limitation for emerging or project-specific nanoforms. Version 1.1 adds a custom-material builder that initializes a complete editable scenario from a selected bundled template while preserving the distinction between an initialization proxy and evidence of material equivalence. Users can replace the full life-cycle, uncertainty, fate, provenance, and validation parameter set and retain it in scenario JSON.

No packaged benchmark is assigned automatically to a custom material. An optional proxy benchmark can be selected only with an explicit evidence record and qualification note. This prevents an unreviewed custom material from inheriting a literature benchmark merely because it was initialized from a similar bundled material.

## v1.2 addition: multiple materials and combined exposure

Version 1.2 addresses the previous single-material limitation by providing independent and co-formulated multi-material projects. The implementation preserves material identity through MFA and PEC calculations, uses a compatibility gate before summing concentrations, and restricts HI calculation to user-defined groups with matching endpoint descriptions. Shared geographic uncertainty and shared formulation-input uncertainty are retained in the joint Monte Carlo calculation.

The module is intentionally screening-level. It does not infer common modes of action, generate PNECs, or estimate interaction coefficients. It also does not mechanistically simulate particle-particle interactions. These boundaries should remain explicit in publications and public deployment.
