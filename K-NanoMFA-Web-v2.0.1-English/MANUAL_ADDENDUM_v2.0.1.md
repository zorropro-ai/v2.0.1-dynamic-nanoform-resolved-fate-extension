# K-NanoMFA v2.0.1 Manual Addendum

## 1. Purpose

Version 2.0.1 is a numerical-stability and interpretation update for the optional dynamic nanoform-resolved fate module. All v2.0 material-flow, product-informed, custom-geography, nanoform, mixture, advanced MFA, validation, uncertainty, and export functions remain available.

The update addresses four issues:

1. timestep-dependent cascade delay in the v2.0 substep solver;
2. ambiguity in the mass basis used for dissolution and transformation;
3. possible confusion between steady-state annual sink flux and cumulative spin-up sink mass; and
4. limited validation of imported state-resolved emission CSV files.

## 2. Numerical solver

### 2.1 Exact coupled linear solver

The default solver integrates the complete 28-state linear system simultaneously:

`dM/dt = A M + E(t)`

where `M` is the vector of four environmental compartments multiplied by seven operational nanoform states, `A` is the coupled transfer–transformation matrix, and `E(t)` is the state-resolved emission vector.

The matrix-exponential action is evaluated by a scaled sparse Taylor algorithm. Integrated source-state occupancy is calculated in the same solve, allowing every internal process flux and external sink to be obtained from its rate constant multiplied by the exact time-integrated source mass.

The exact solver does not use the entered legacy substep count. Changing the legacy substep field therefore does not alter exact-solver results.

### 2.2 Legacy substep solver

The v2.0 competing-loss substep solver is retained for backward comparison. When selected, the user may enable a doubled-substep refinement audit. The audit compares the requested substep result with a calculation using twice as many substeps and reports relative differences in final stock and compartment PECs.

The legacy solver should not be used as the primary solver when fast sequential processes are important.

## 3. Tracking mass basis

Each dynamic-fate scenario now stores one explicit tracking basis:

- Constituent-element-equivalent mass
- Pristine nanoform mass
- Total transformed-solid mass
- Composite-associated ENM mass

The default is constituent-element-equivalent mass because dissolution, reprecipitation, and chemical transformation can be interpreted without creating or destroying the tracked constituent.

Selecting another basis does not perform an automatic stoichiometric conversion. The selected basis documents how all imported masses, state stocks, and external sinks are to be interpreted. Rates involving dissolution or transformation should be reviewed carefully when a non-elemental basis is selected.

External losses previously described as “non-nano/destroyed” are now reported as mass transferred outside the selected tracking basis.

## 4. Dedicated matrix-bound dissolution

Water matrix-bound material now has its own editable first-order dissolution parameter. Older v2.0 scenarios load the new parameter from the v2.0.1 default while preserving all existing rate entries.

## 5. Static sink reporting

Static screening results now distinguish:

- steady-state annual external-sink flux, kg/y;
- cumulative external-sink mass accumulated during numerical spin-up, kg; and
- steady-state active environmental stock, kg.

The annual sink flux is the appropriate quantity for comparing annual steady-state input and output. Spin-up cumulative mass is retained as a diagnostic and should not be interpreted as a one-year flux.

If the configured convergence tolerance is not reached within the maximum number of years, the result panel states that no screening steady state was reached.

## 6. External coupling CSV

The parser now supports quoted fields and commas inside quoted source notes. The minimum accepted columns remain:

`year,compartment,form,mass_kg_y`

The extended format is:

`year,compartment,form,mass,unit,tracking_basis,material,country_code,domain_id,source_note`

Supported units are kg/y, g/y, mg/y, and t/y, including common `/yr` variants. Imported values are converted internally to kg/y. Invalid years, negative masses, unsupported compartments, unsupported forms, unsupported units, and unsupported tracking bases are reported rather than silently discarded.

## 7. Interpretation boundary

Version 2.0.1 improves numerical integration and output interpretation. It does not add pH-dependent dissolution, ionic-strength effects, natural-colloid heteroaggregation, continuous particle-size distributions, spatial watershed hydraulics, groundwater, or stoichiometric transformation chemistry. The kinetic parameters remain screening priors unless replaced by material-, medium-, process-, and region-specific evidence.

## 8. Backward compatibility

The dynamic fate module remains disabled by default. Older scenarios without v2.0.1 fields load with:

- exact coupled linear solver;
- constituent-element-equivalent mass basis;
- v2.0 legacy substeps retained as a comparison setting; and
- the new water matrix-bound dissolution rate initialized from the compatible default.

The base MFA numerical files remain unchanged.
