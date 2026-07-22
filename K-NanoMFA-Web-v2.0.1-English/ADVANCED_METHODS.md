# Advanced Methods in K-NanoMFA v1.2

## 1. Trade-balanced apparent consumption

For year *t*:

\[
C_t=P_t+I_t-E_t-\Delta S_{trade,t}
\]

where \(P_t\) is domestic production, \(I_t\) is imports, \(E_t\) is exports, and \(\Delta S_{trade,t}\) is an increase in technosphere inventory outside the modelled product stock. Negative apparent consumption is constrained to zero.

The bilateral partner matrix allocates total imports and exports for reporting. It does not constitute a multi-regional input-output model.

## 2. Stock-driven dynamic MFA

For each year, the model solves the nonnegative primary inflow \(P_t\) such that the simulated end-of-year in-use stock approaches a target \(S_t^*\):

\[
P_t=\arg\min_{P_t\ge0}\left|S_t(P_t)-S_t^*\right|
\]

The stock response is evaluated with the full cohort model, including Weibull retirement, time-distributed use release, secondary input, reuse, recycling, and landfill processes. A bracketed bisection solver is used. When inherited stock already exceeds the target, primary inflow is set to zero and the positive stock gap is reported.

## 3. Constrained reconciliation

The application minimizes uncertainty-weighted adjustments:

\[
\min_x\sum_i\frac{(x_i-\mu_i)^2}{\sigma_i^2}
\]

subject to:

\[
\sum_i a_i x_i=0,\qquad x_i\ge0
\]

where \(a_i=+1\) for inflows and \(a_i=-1\) for outflows and stock increases. If observations and model priors are both supplied, they are first combined by precision weighting. An active-set projection enforces nonnegativity.

## 4. Bayesian calibration

A positive parameter multiplier \(m\) is assigned a lognormal prior centered on 1. For observed result \(y_{obs}\) and model prediction \(y(m)\), the posterior is evaluated on a logarithmically spaced grid:

\[
p(m\mid y_{obs})\propto p(y_{obs}\mid m)p(m)
\]

Both prior and observation likelihood use user-defined coefficients of variation. The posterior mean, median, and 95% credible interval are reported.

## 5. Reduced-form multimedia fate

Four environmental compartments are represented:

- air
- surface water
- soil
- active sediment

For compartment \(i\):

\[
\frac{dM_i}{dt}=E_i+\sum_j k_{ji}M_j-\left(\sum_j k_{ij}+k_{i,out}+k_{i,tr}\right)M_i
\]

where intermedia transfers conserve mass, while advection, burial, and transformation are external sinks. Competing first-order losses are integrated with an exponential loss fraction at each numerical substep.

Static mode iterates a constant annual emission inventory toward steady state. Dynamic mode propagates annual MFA emissions and environmental stocks through time.

The model does not explicitly resolve heteroaggregation kernels, size distributions, surface chemistry, species-specific dissolution, hydrodynamic routing, or spatial gradients.

## 6. Validation statistics

For paired observations and predictions, the model calculates:

- RMSE
- MAE
- mean bias
- MAPE when observations are nonzero
- fraction within the entered 95% observation interval
- reduced chi-square

These statistics diagnose fit but do not establish external validity when observations are sparse or nonrepresentative.

## 7. Screening life-cycle burden indicator

The net climate indicator is:

\[
B_{net}=\sum_j A_j EF_j-A_{recovered}EF_{credit}
\]

where \(A_j\) is handled mass and \(EF_j\) is an editable climate factor. The module excludes upstream supply chains, co-product allocation, infrastructure, temporal carbon effects, and impact categories other than climate change unless users incorporate them externally.


## 8. Custom nanomaterial parameterisation

The custom-material builder creates a complete editable scenario by copying one bundled material only as an initial structural template. The template does not establish chemical, technological, or environmental equivalence. After initialization, the user can independently replace product categories, market allocation, use-stage releases, end-of-life routes, treatment transfer coefficients, product lifetimes, release-form fractions, uncertainty settings, and multimedia-fate rates.

A custom scenario records the material name, description, initialization template, selected fate-behaviour preset, optional benchmark proxy, evidence class, source, reference URL or DOI, limitations, and the complete parameter snapshot. The scenario can therefore be exported and restored without adding the custom material to the permanent bundled library.

The optional literature benchmark proxy is disabled by default. It should be enabled only when nanoform state, product system, geography, reference year, tracking basis, and environmental endpoint are sufficiently comparable for an order-of-magnitude plausibility check.

## Multi-material MFA and co-exposure module (v1.2)

The multi-material module runs one mass-conserving MFA for each active component under a shared geographic domain. Independent components retain their full material-specific life-cycle definitions. Co-formulated components receive a fraction of a shared nanomaterial-blend input and use a shared synthetic product category for use release, EoL routing, and lifetime, while retaining material-specific treatment transfer coefficients.

For material `m` in formulation group `g`:

```text
Input_m,g(t) = BlendInput_g(t) × Fraction_m,g
```

For each medium, concentrations are retained as a vector:

```text
PEC(t) = [PEC_1(t), PEC_2(t), ..., PEC_n(t)]
```

A physical mass-concentration sum is calculated only when included components have a compatible tracking basis, unless the user explicitly overrides the gate.

Component-based screening uses:

```text
HQ_i = PEC_i / PNEC_i
HI_group = Σ HQ_i
HI_adjusted = HI_group + Σ β_ij HQ_i HQ_j
```

The app requires a common medium and common endpoint description within an assessment group. A zero or missing PNEC excludes that component-medium pair. The interaction coefficient is user supplied and defaults to zero.

In joint Monte Carlo simulation, country-domain and environmental-capacity parameters are sampled once per iteration and shared by all components. Components in the same formulation group also share the sampled blend-input multiplier. Component-specific release, EoL, treatment, lifetime, and PNEC uncertainties are sampled separately.

The module does not model direct particle-particle interactions, heteroaggregation between components, corona exchange, redox coupling, altered dissolution, or mixture-specific bioavailability. These processes require dedicated mechanistic or experimental models.
