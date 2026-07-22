# K-NanoMFA v1.5 Manual Addendum

## 1. Release purpose

K-NanoMFA v1.5 adds an optional nanoform-state accounting layer and a revised responsive interface. All v1.4.1 functions remain available, including direct and product-informed inventories, bundled and custom geographies, static and dynamic material-flow analysis (MFA), uncertainty and sensitivity analysis, custom materials, multi-material and co-exposure assessment, advanced MFA, reduced-form multimedia fate, validation, and exports.

Nanoform-state tracking is disabled by default. A scenario that does not activate the module reproduces the previous workflow.

## 2. Nanoform states

The module allocates the mass already calculated by the MFA engine among seven operational states:

1. **Matrix-bound nanoform** — material retained within or strongly associated with a product or solid matrix.
2. **Free particulate nanoform** — released particles represented as comparatively dispersed nanoform.
3. **Aggregated/agglomerated nanoform** — particulate mass represented as associated particle structures.
4. **Dissolved constituent** — dissolved elemental or molecular constituent derived from the tracked material.
5. **Transformed particulate form** — particulate mass after chemical, thermal, or environmental transformation.
6. **Unresolved form** — mass for which the nanoform state is not sufficiently specified.
7. **Non-nano/destroyed mass** — mass assigned to irreversible transformation or destruction sinks.

The state names are operational accounting categories. They do not imply that a particle-size distribution, chemical species distribution, or bioavailable fraction has been measured.

## 3. Configuration

Open **Evidence, QA and sensitivity** and locate **Nanoform-state tracking**.

- Enable the module.
- Select a material-behavior preset or use the custom option.
- Select a product-embedding preset or enter a custom initial state allocation.
- Confirm that the editable product-state fractions total 100%.
- Review the air, surface-water, and soil mapping parameters.
- Record the evidence class, source note, and limitations.

### 3.1 Material-behavior presets

The bundled screening presets are:

- Persistent mineral oxide
- Dissolving metal or metal oxide
- Persistent carbonaceous nanomaterial
- Biodegradable nanomaterial
- High-aspect-ratio nanoform
- Custom screening behavior

These presets initialize state-allocation assumptions. They are not calibrated fate models and should be replaced when material- and process-specific evidence is available.

### 3.2 Product-embedding presets

The bundled product-state presets are:

- Bulk matrix embedded
- Surface coating or near-surface layer
- Liquid suspension or dispersion
- Powder formulation
- Porous or weakly bound matrix
- Custom product-state allocation

## 4. Relation to the existing release-form categories

K-NanoMFA already distinguishes four environmental release-form categories: matrix-associated, free nanoform, transformed/dissolved, and unknown. Version 1.5 retains those categories and resolves them as follows:

- Matrix-associated mass → matrix-bound nanoform
- Free-nanoform mass → free particulate and aggregated/agglomerated states
- Transformed/dissolved mass → dissolved constituent and transformed particulate states
- Unknown mass → unresolved form

The free-versus-aggregated and dissolved-versus-transformed splits are independently editable for air, surface water, and soil.

## 5. Static accounting

For a static calculation, environmental releases and terminal destinations are allocated among the seven states. The state inventory is checked against the existing terminal mass total:

`state-balance closure (%) = total state-accounted mass / terminal total × 100`

No mass is added to or removed from the original MFA result. The state module is a conservative disaggregation of the existing output.

## 6. Dynamic accounting

For a dynamic calculation, annual external flows are state-resolved and combined with the final in-use, reuse, landfill, and recycled-feedstock stocks. The cumulative state inventory is checked against the existing cumulative accounted input:

`dynamic state-balance closure (%) = cumulative state-accounted mass / cumulative accounted input × 100`

The calculation preserves the original cohort, lifetime, recycling, reuse, landfill-memory, and growth calculations.

## 7. State-specific predicted environmental concentrations

The module reports state-specific screening predicted environmental concentrations (PECs) for air, surface water, soil, and active sediment. Each existing medium-specific PEC is proportionally divided according to the state fractions assigned to that medium.

These values should be interpreted as **state-resolved accounting outputs under the selected assumptions**, not as mechanistic predictions of size-resolved settling, heteroaggregation, dissolution kinetics, coating loss, speciation, or bioavailability.

## 8. Results and export

The Results workspace provides:

- State-balance closure
- Total mass by nanoform state
- Environmental release state by medium
- State-specific PECs
- Static or dynamic accounting basis
- CSV export of state-resolved results

Nanoform configuration and outputs are also included in complete scenario and audit JSON files. Older scenario files without a nanoform block load with the module disabled.

## 9. Responsive interface changes

Version 1.5 revises the interface to prevent panels, tables, charts, and action rows from overlapping or extending beyond the viewport. The responsive layout was checked at 1600, 1440, 1280, 1024, 768, and 480 px widths for all ten workspaces and the custom-geography manager.

Wide scientific tables remain horizontally scrollable inside their own bounded containers; they do not widen the complete page.

## 10. Scientific limitations

The nanoform-state module is a screening-level, mass-conserving post-processing layer. It does not replace experimentally supported or mechanistic nano-specific fate modelling. In particular, it does not directly solve:

- Particle-size distributions
- Homoaggregation or heteroaggregation kinetics
- pH-, ionic-strength-, or dissolved-organic-matter-dependent attachment
- Time-dependent dissolution or chemical speciation
- Surface-coating degradation
- Sedimentation velocity by size class
- Bioavailability or toxicity-equivalence relationships

Results are defensible only to the extent that the selected state allocations, release-form evidence, and environmental assumptions match the assessed nanoform, product system, geography, and time period.
