# Data and Methodological Sources — K-NanoMFA v1.2

## Country and environmental-domain data

- Ministry of Climate, Energy and Environment, Republic of Korea. *2024 Sewerage Statistics*. https://www.mcee.go.kr/home/web/public_info/read.do?publicInfoId=640
- Korea Waste Association. *National Waste Generation and Treatment Status*. https://www.kwaste.or.kr/data/01.php
- Korean Statistical Information Service (KOSIS). Waste generation and treatment statistics. https://kosis.kr/
- World Bank Open Data. Population, land area, and sanitation indicators. https://data.worldbank.org/
- WHO/UNICEF Joint Monitoring Programme. Water, sanitation, and hygiene data. https://washdata.org/
- FAO AQUASTAT. Freshwater-resource and water-use context. https://www.fao.org/aquastat/
- OECD environmental and municipal-waste datasets. https://www.oecd.org/environment/

## Nanomaterial MFA and environmental-release modelling

- Gottschalk, F., Sonderer, T., Scholz, R.W., Nowack, B., 2009. Modeled environmental concentrations of engineered nanomaterials (TiO₂, ZnO, Ag, CNT, fullerenes) for different regions. *Environmental Science & Technology* 43, 9216–9222. https://doi.org/10.1021/es9015553
- Sun, T.Y., Gottschalk, F., Hungerbühler, K., Nowack, B., 2014. Comprehensive probabilistic modelling of environmental emissions of engineered nanomaterials. *Environmental Pollution* 185, 69–76. https://doi.org/10.1016/j.envpol.2013.10.004
- Sun, T.Y., Bornhöft, N.A., Hungerbühler, K., Nowack, B., 2016. Dynamic probabilistic modeling of environmental emissions of engineered nanomaterials. *Environmental Science & Technology* 50, 4701–4711. https://doi.org/10.1021/acs.est.5b05828
- Rajkovic, S., Bornhöft, N.A., van der Weijden, R., Nowack, B., Adam, V., 2020. Dynamic probabilistic material flow analysis of engineered nanomaterials in European waste treatment systems. *Waste Management* 113, 118–131. https://doi.org/10.1016/j.wasman.2020.05.032
- Wang, Y., Nowack, B., 2018. Dynamic probabilistic material flow analysis of nano-SiO₂, nano iron oxides, nano-CeO₂, nano-Al₂O₃, and quantum dots in seven European regions. *Environmental Pollution* 235, 589–601. https://doi.org/10.1016/j.envpol.2018.01.004
- Hong, H., Part, F., Nowack, B., 2022. Prospective dynamic and probabilistic material flow analysis of graphene-based materials in Europe from 2004 to 2030. *Environmental Science & Technology* 56, 13798–13809. https://doi.org/10.1021/acs.est.2c04002
- Hong, H., Part, F., Nowack, B., 2024. Correction to “Prospective Dynamic and Probabilistic Material Flow Analysis of Graphene-Based Materials in Europe from 2004 to 2030.” *Environmental Science & Technology*. https://doi.org/10.1021/acs.est.4c07878

## Built-in literature benchmarks

The benchmark module contains external plausibility checks derived from the following studies.

1. **Gottschalk et al. (2009)**: probabilistic modes across nano-TiO₂, nano-ZnO, nano-Ag, CNT, and fullerenes ranged from 0.003 to 21 ng/L in surface water, from 4 ng/L to 4 µg/L in sewage-treatment effluent, and from 1 ng/kg/y to 89 µg/kg/y as annual increments in sludge-treated soil. These are broad multi-material envelopes, not material-specific acceptance criteria.
2. **Nabi et al. (2021)**: five U.S. WWTPs showed effluent concentrations of 7–30 µg/L for TiO₂ engineered particles and 0.01–0.04 µg/L for Ag engineered particles. The analytical tracking bases are not identical to every K-NanoMFA nanoform definition. Nabi, M.M., et al., *Science of the Total Environment* 753, 142017. https://doi.org/10.1016/j.scitotenv.2020.142017
3. **Hong et al. (2022)**: projected European 2030 graphene-based-material concentrations were 1.4 ng/L in surface water and 20 µg/kg in sludge-treated soil. The application is strongest when the dynamic horizon and receiving-compartment definitions are aligned.

## Environmental fate modelling

- Meesters, J.A.J., Koelmans, A.A., Quik, J.T.K., Hendriks, A.J., van de Meent, D., 2014. Multimedia modeling of engineered nanoparticles with SimpleBox4nano: model definition and evaluation. *Environmental Science & Technology* 48, 5726–5736. https://doi.org/10.1021/es500548h
- RIVM. SimpleBox4nano. https://www.rivm.nl/en/soil-and-water/simplebox4nano
- Mintis, D.G., et al., 2026. SimpleBox4nano: environmental fate modelling of nanomaterials via the Enalos Cloud Platform. *RSC Sustainability*. https://doi.org/10.1039/D6SU00092D

## Uncertainty, data quality, reconciliation, and sensitivity

The pedigree-style quality matrix is a transparent screening implementation rather than a prescribed regulatory grading standard. Users should document study-specific scoring rules, distributions, correlations, and replacement data.

## Evidence-class qualification

- **A**: official statistic that directly describes the selected geographic domain.
- **B**: peer-reviewed evidence directly addressing the material, process, or model endpoint.
- **C**: peer-reviewed evidence used as a proxy across products, technologies, regions, or nanoforms.
- **D**: harmonised regional or international screening estimate.
- **E**: expert screening assumption requiring replacement when project-specific data are available.

Bundled product allocations, release factors, lifetimes, nanoform fractions, treatment coefficients, country waste pathways, and receiving-environment parameters remain editable priors. Each assessment should record the source, geography, reference year, material state, product category, probability distribution, evidence class, and version history of replacements.

## Licensing

- Open Source Initiative, MIT License. https://opensource.org/license/MIT


## Custom-material evidence requirements

A custom nanomaterial has no automatically validated product allocation, release factor, treatment coefficient, lifetime distribution, environmental-fate rate, or literature benchmark. The initialization template is a modelling convenience only. A defensible custom scenario should document, at minimum, the material identity and tracked mass basis; particle form, size range, coating, and matrix association; intended products and geography; reference year; source for each influential parameter family; uncertainty distribution; evidence class; and limitations of any transferred proxy.

When the optional benchmark proxy is used, the user should justify comparability of nanoform, endpoint, compartment, product system, geography, and time horizon. The proxy remains an external plausibility check and is not evidence that the custom material has been calibrated or validated.

## Combined exposure and mixture-assessment framework used in v1.2

1. OECD, 2018. *Considerations for Assessing the Risks of Combined Exposure to Multiple Chemicals*. OECD Series on Testing and Assessment No. 296. https://doi.org/10.1787/ceca15a9-en

2. World Health Organization, 2009. *Assessment of Combined Exposures to Multiple Chemicals: Report of a WHO/IPCS International Workshop on Aggregate/Cumulative Risk Assessment*. ISBN 978-92-4-156383-3. https://www.who.int/publications-detail-redirect/9789241563833

3. World Health Organization, 2017. *Chemical Mixtures in Source Water and Drinking-Water*. ISBN 978-92-4-151237-4. https://www.who.int/publications/i/item/9789241512374

4. EFSA Scientific Committee, 2019. Guidance on harmonised methodologies for human health, animal health and ecological risk assessment of combined exposure to multiple chemicals. *EFSA Journal* 17, 5634. The v1.2 module follows a component-based screening concept and does not claim regulatory implementation of the full EFSA framework.

5. OECD, 2019. *Guidance Document on Aquatic Toxicity Testing of Difficult Substances and Mixtures*. https://doi.org/10.1787/0ed2f88e-en

### Qualification

These frameworks were developed principally for chemicals and chemical mixtures. Their concentration-addition, assessment-group, and tiered-screening concepts are used in K-NanoMFA only as a transparent structure for user-supplied nanoform-specific PNECs. The application does not infer that different nanomaterials share a mode of action, toxic potency, bioavailability, or interaction behavior. Material-pair interaction coefficients remain zero unless explicitly entered and documented by the user.


## v1.5 nanoform-state presets

The bundled nanoform material-behavior, product-embedding, and terminal-allocation presets are screening initialization assumptions. Unless replaced and documented by the user, they should be treated as evidence class E rather than as measured nanoform-specific transfer factors. Their role is to support transparent, mass-conserving scenario exploration; they do not establish mechanistic particle-fate validation.


## v2.0 dynamic nanoform-fate presets

The v2.0 kinetic presets are transparent initialization priors rather than fitted universal constants. They organize relative behavior for persistent mineral oxides, dissolving metals or metal oxides, persistent carbonaceous nanomaterials, biodegradable nanomaterials, and high-aspect-ratio nanoforms. Every rate remains editable and should be replaced with directly applicable material-, medium-, temperature-, chemistry-, and process-specific evidence. The source and evidence note fields must document the basis of any replacement.
