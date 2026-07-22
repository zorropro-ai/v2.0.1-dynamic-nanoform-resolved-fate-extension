# Exact Linear Nanoform-Fate Solver — v2.0.1

## State system

The active state vector has 28 entries: four environmental compartments multiplied by seven operational nanoform states.

For a period with constant rate coefficients and constant state-resolved emissions:

`dM/dt = A M + E`

The off-diagonal entries of `A` contain internal transfer rates. Each diagonal entry is the negative sum of all active-transfer and external-sink rates leaving the corresponding source state.

## Matrix-exponential action

The solution over a period `Δt` is:

`M(t + Δt) = exp(AΔt) M(t) + ∫ exp[A(Δt − τ)] E dτ`

The software evaluates the exponential action with a scaled sparse Taylor series. The scale is selected from the largest total outgoing rate. Series terms are accumulated until the entered relative tolerance is met.

## Integrated process fluxes

An augmented system simultaneously integrates source-state occupancy:

`dJ/dt = M`

For a first-order pathway `j` leaving source state `i`, the integrated pathway mass is:

`F_j = k_j J_i`

This provides internal transfer and external sink totals that are consistent with the exact active-state solution.

## Conservation check

For each dynamic year:

`initial active stock + cumulative input = final active stock + cumulative external sinks`

Storm remobilization is an internal transfer and does not change this equality.

## Legacy comparison

The legacy solver distributes competing losses within sequential substeps. It remains available for reproduction of v2.0 calculations. The optional refinement audit repeats the calculation with twice the selected substeps and reports relative final-stock and PEC differences.

## Numerical limits

The exact solver assumes a linear, time-invariant rate matrix within each simulated year. Event pulses are applied at the configured annual event point. Rate coefficients that depend continuously on concentration, pH, saturation, particle size, or hydrology require a nonlinear or time-varying extension and are outside v2.0.1.
