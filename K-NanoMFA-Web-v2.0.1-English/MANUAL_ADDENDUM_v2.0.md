# K-NanoMFA v2.0 Manual Addendum

## 1. Purpose

Version 2.0 adds an optional dynamic nanoform-resolved fate layer without removing or replacing any v1.5 function. The module accepts the v1.5 state-resolved environmental release inventory or an imported annual coupling inventory and propagates mass through air, surface water, soil, and active sediment.

## 2. Tracked environmental forms

- Matrix-bound form
- Free nanoparticle
- Small aggregate
- Large aggregate
- Dissolved constituent
- Transformed particulate form
- Unresolved form

The v1.5 aggregated release is divided into small and large aggregate inputs using the editable large-aggregate fraction.

## 3. Numerical formulation

For each source compartment–form state, all applicable first-order pathways compete over a substep of duration Δt:

`L = m [1 − exp(−K Δt)]`

where `m` is the source-state mass and `K = Σ k_j` is the sum of applicable pathway rate constants. The mass assigned to pathway `j` is:

`L_j = L k_j / K`

Internal transfers are added to their destination states. Advective removal, burial, irreversible soil retention, and transformation outside the tracked nanoform basis are accumulated as external sinks. Emissions are added by symmetric half-step addition before and after the process update.

## 4. Static and dynamic calculations

### Static MFA

The annual state-resolved emission inventory is repeated until the absolute compartment–form stock change divided by total active stock is below the entered convergence tolerance or the maximum iteration year is reached.

### Dynamic MFA

Each MFA year supplies a separate state-resolved emission inventory. Environmental stocks are carried from one year to the next. Results include annual stocks, form-specific PECs, external sinks, internal process fluxes, and cumulative mass-balance closure.

## 5. Process groups

The editable rate table contains:

- Matrix weathering
- Free-particle aggregation
- Aggregate growth and fragmentation
- Particulate dissolution
- Dissolved reprecipitation
- Particulate transformation and aging
- Form-dependent settling
- Air deposition
- Soil runoff, erosion, and resuspension
- Sediment resuspension and dissolved exchange
- Advective loss
- Sediment burial
- Irreversible soil retention
- Transformation to a non-nano external sink

All rate constants use y⁻¹.

## 6. Storm-event remobilization

The optional event module transfers an entered fraction of eligible soil forms to water or sediment and an entered fraction of sediment forms to water. Event years are entered as comma- or space-separated calendar years. A blank year field applies the event fractions every simulated year.

## 7. External coupling CSV

The coupling format is:

`year,compartment,form,mass_kg_y`

Accepted compartments are `air`, `water`, `soil`, and `sediment`. Accepted forms are `matrix_bound`, `free_particle`, `small_aggregate`, `large_aggregate`, `dissolved`, `transformed_particle`, and `unresolved`.

When external coupling is enabled, the imported inventory replaces the internally generated nanoform release inventory for the v2.0 fate calculation only. The base MFA remains unchanged.

## 8. Correlated kinetic uncertainty

Rate constants are assigned to four groups:

1. Dissolution and reprecipitation
2. Aggregation, fragmentation, and settling
3. Transport, remobilization, burial, retention, and advection
4. Transformation

A Gaussian-copula lognormal multiplier is sampled using the entered rate coefficient of variation and common between-group correlation. The reported P5, P50, and P95 values cover compartment PECs, final active stock, dissolved share, and large-aggregate share.

## 9. Interpretation boundary

The v2.0 engine is a kinetic screening model, not a calibrated site-specific fate model. It does not explicitly resolve continuous particle-size distributions, ionic speciation, surface-complexation chemistry, pH and ionic-strength dependence, natural-colloid heteroaggregation kernels, spatial watersheds, river reaches, or local exposure gradients. Rate presets are initialization priors and should be replaced when material-, medium-, process-, and region-specific data are available.

## 10. Backward compatibility

The v2.0 module is disabled by default. Older scenario files load with the module disabled. The existing direct-input, product-informed, custom-geography, custom-material, uncertainty, mixture, advanced MFA, reduced-form fate, validation, and export functions remain available.
