# K-NanoMFA v1.3 Manual Addendum

The v1.2 Word manual remains applicable to all scientific calculations and original workspaces. Version 1.3 reorganizes access to those workspaces and adds user-defined geographic domains without removing existing functionality.

## Guided interface

The application opens in **Guided stages** view:

1. Study & material
2. Product, waste & environment
3. Evidence & uncertainty
4. Results & compare
5. Expert & reference

Each stage displays its related original workspaces. Select **All workspaces** in the header or click **Show all workspaces** to display the complete ten-workspace row used in v1.2.1.

## Create a custom country

1. Open **Study & material > Model setup**.
2. Click **Create custom country** below the country selector.
3. Enter a unique 2–12 character country code, country name, reference year, and data source.
4. Define the required national domain: population, area, sewered population, wastewater flow, dry-sludge production, and effective freshwater flow.
5. Enter country end-of-life and sewage-sludge percentage vectors. Each vector must total 100%.
6. Click **Save country/domain**.
7. The new country becomes active in the normal country selector.

## Add a custom subnational domain

1. Select the saved custom country and reopen **Edit custom geography**.
2. Click **Add subnational domain**.
3. Enter the subnational statistics and a unique domain ID.
4. Save the country/domain.

The national and subnational domains can use direct-domain input or national input scaled by population, sewered population, or wastewater-flow share.

## Portability and reproducibility

A custom geography can be exported independently as JSON. A complete K-NanoMFA scenario also embeds the active custom-geography definition, allowing the scenario to be imported in another browser without prior manual setup. Browser-saved custom geographies remain local to the browser profile.

## Scientific caution

User-defined geographic data are not treated as verified official statistics. Their evidence class and source note should be revised to reflect the actual source. Waste and sludge route definitions must use compatible system boundaries, and receiving-water flow should represent the assessment domain used for the PEC calculation.
