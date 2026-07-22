# Dynamic Nanoform-Resolved Fate Methods — v2.0

This file documents the computational scope implemented in `dynamic_fate.js`.

## State vector

The environmental state vector contains 28 active states: four compartments multiplied by seven operational forms. External sinks are not retained in the active state vector and are recorded by process and form.

## Mass conservation

At every substep, the sum of destination transfers and external sinks equals the mass removed from each source state. Storm-event transfers are internal and therefore do not change total active plus externally removed mass. Immediate non-nano input identified by the v1.5 state layer is recorded as an external sink.

## Capacity conversion

Air concentration uses geographic area multiplied by mixing height. Water volume uses effective freshwater flow multiplied by the selected residence time. Soil and active-sediment concentrations use the corresponding area, depth, and bulk-density denominators already defined in the geographic and environmental workspaces.

## Uncertainty

Positive kinetic rates are sampled with lognormal multipliers. The common correlation parameter is restricted to the valid equicorrelation range for four process groups. Uncertainty modifies rates only; emission, geographic, and base-MFA uncertainties remain handled by their existing modules.
