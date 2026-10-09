# Replit instructions: interactive Utility Tariff Simulator proof of concept

## Build this in the existing application

Repository: https://github.com/yourstrulyalwiz/Utility-Tariff-Simulator
Reviewed main commit: 557e9f96955d9d300502025a62efd0be048338c2
Prepared: 9 October 2026

Implement these changes in the existing app. Aim for a focused first build within approximately one hour, using the existing calculation engine, Recharts components, saved simulations and authentication. Deliver working interactions, not a static mockup.

Before editing, check whether main has advanced beyond the reviewed commit and inspect changes affecting the files listed below. Preserve unrelated functionality and saved data. This document is the consolidated instruction for this proof of concept.

### Latest user decisions — these override earlier UI proposals

1. Simplify the tool for utility staff with limited financial/modelling capacity.
2. Keep only basic setup as background information. Do NOT retain the eight-step input wizard as the main interface, or duplicate its fields elsewhere.
3. Provide separate areas for the first tariff calculation and the operational interventions, with interactive charts in both.
4. Use exactly the annual OPEX that generates the workbook tariff. For 2030 this is PHP266,854,479.77779043. Subsequent years use their own calculated OPEX, not the 2030 figure repeated or inflated again.
5. Operational controls: collection efficiency, NRW and an O&M cost reduction. Calculate O&M coverage as an outcome.
6. Use an editable assumed 80% baseline collection efficiency to calibrate an illustrative billing base to the reported January–June 2025 collections of PHP10,129,070.87.
7. Users can adjust the applied average tariff. Show resulting billings and collections alongside the tariff requirement.
8. Every change updates the relevant cards and charts automatically. Independent and combined intervention effects must come from one consistent calculation.

## 1. Scope and application structure

Replace the visible eight-step navigation with three tabs or sections:

| Section | Contents |
| --- | --- |
| 1. Setup | Simulation name, utility name, first/last forecast year, currency |
| 2. Tariff simulator | Editable assumptions, workbook tariff reproduction, annual tariff chart and revenue preview |
| 3. Operational improvements | Three intervention switches/controls, baseline versus intervention results, separate comparison charts |

Open existing Tagbilaran copies directly in Tariff simulator. New scenarios begin in Setup.

Keep historical reporting dates beside the historical calibration data in the revenue panel, not as extra setup tasks. Remove household counts, affordability inputs, long source forms, investment financing questionnaires and narrative action-plan text from the primary POC flow. Retain existing saved fields and underlying APIs; hiding a field must not delete its saved value.

Keep the landing-page simulation cards, duplication, save, ownership and authentication. The original Tagbilaran example remains protected: use the existing duplicate-to-edit action, with a simple label such as "Try your own scenario". Do not reset or overwrite the original seed or saved runs.

Scope the new workbook-based POC to the supplied zero-debt, zero-equity, 100%-grant example and its editable copies. Retain the existing reviewed financing engine for existing records; do not redesign borrowing, debt ratios or repayment schedules in this hour. Do not silently change a reviewed-method saved scenario into a workbook-reference scenario.

Do not populate a new unrelated utility with Tagbilaran facts. The example is a usable preset; blank scenarios require their own inputs. Keep access to existing reviewed records through the existing saved-results behaviour if necessary.

## 2. Interactive behaviour and visual design

Use the existing design system and Recharts. Prioritise clear labels, units and readable numbers over decoration.

- Editable KPI-style cards: large value, unit, short label, numeric input and optional slider.
- Display PHP/m3, PHP/year, m3/year, percentage or connections on every relevant input.
- A year selector changes the inspected year. Its selection is for viewing annual results; the forecast still covers the full period.
- Numeric cards for annual workbook observations edit that selected year. Label them "Selected year".
- Global cost assumptions explicitly say "Applies across the forecast".
- Recalculate while typing or dragging, with about 200–300 ms debounce for server preview.
- Show a quiet "Updating" state; never show old values as if they reflect the newest inputs.
- Keep the latest complete result visible while updating. Ignore late responses from older requests.
- Blank input is missing, not zero. Do not jump to zero while the user is editing.
- Keep selected tab, year and input focus during updates.
- Save is separate from preview. Do not create a database revision or frozen run for every slider movement.
- Provide "Reset interventions" and "Reset to workbook assumptions" as distinct actions. Resetting interventions must not erase tariff/demand edits.
- Keep detailed costs in one expandable "Cost assumptions" area, not duplicated in background forms.
- Sources and technical notes belong behind a compact details link. Do not expose engine versions, API fields or implementation terminology in the primary flow.
- Use the same draft state for all visible representations of an assumption.

## 3. Tariff simulator: preserve and expose the workbook calculation

### 3.1 Cards and single sources of truth

Show selected-year results for required tariff, operating costs and annual revenue requirement prominently.

Editable assumptions:

| Card/group | Source and edit behaviour |
| --- | --- |
| Connections used for staffing | Existing legacy_connections observation for selected year |
| Volume used in workbook tariff | Sum of legacy_deep_well, legacy_pwsp and legacy_bbwsp for selected year; edit those three components in the card's expansion |
| Operating costs | Calculated from the cost components below; optionally edit the total through the explicit scaling rule below |
| Investment and asset life | Existing two project records and useful lives |
| Working-capital allowance | Existing workingCapitalMonths; default 2 |
| Cost assumptions | Salary, staffing, pay months, power, chemicals, bulk price, miscellaneous allowance, service fee, inflation |

Make these current engine constants editable, with defaults reproducing the supplied example:

| Assumption | Default | Unit |
| --- | ---: | --- |
| Staff per 1,000 connections | 4 | staff/1,000 connections, equivalent to one per 250 |
| Monthly salary | 19,090 | PHP/staff/month |
| Paid months per year | 13 | months |
| Booster power cost | 13.13 | PHP/m3 of BBWSP volume |
| Chemical cost | 0.50 | PHP/m3 of deep-well volume |
| Miscellaneous allowance | 5 | percent of direct costs |
| Service fee | 10 | percent of direct costs plus miscellaneous |
| Inflation | 5 | percent/year |
| Working-capital allowance | 2 | months of OPEX |
| Asset life | 25 | years, stored in each project |

Bulk prices are annual observations: PHP19.85/m3 for 2030–2034 and PHP25.80/m3 for 2035–2039. Changing a bulk-price card updates the observation used by the engine, not the currently unused generic bulkWaterCost field in reference mode.

Initial investment: PHP579,242,798.998943. Additional 2035 investment: PHP114,056,861.65719908. Keep current reference depreciation behaviour for reproduction.

If allowing direct entry of the OPEX total, use a single optional opexScale, default 1. Editing the selected-year total sets:

    opexScale = enteredTotal / unscaledCalculatedOpexForSelectedYear

Apply this factor across all forecast years to both fixed and variable cost components. Explain that it scales the annual cost path. Do not maintain two conflicting OPEX totals. Component-only editing is acceptable if it materially reduces implementation time; the aggregate OPEX card must still update live.

### 3.2 Reference arithmetic

Use full precision internally; round only for display. Percentages from UI/API must be converted to fractions exactly once.

For year y, with t = y - 2030:

    inflationFactor = (1 + inflation / 100)^t
    staff = workbookConnections * staffPer1000 / 1000
    salary = staff * monthlySalary * payMonths * inflationFactor
    power = bbwspVolume * powerUnitCost * inflationFactor
    chemicals = deepWellVolume * chemicalUnitCost * inflationFactor
    bulk = bbwspVolume * observedBulkPriceForYear

    markup = (1 + miscellaneousPercent / 100) * (1 + serviceFeePercent / 100)
    fixedOpex = salary * markup * opexScale
    variableOpex = (power + chemicals + bulk) * markup * opexScale
    opex = fixedOpex + variableOpex

    depreciation = existing reference project depreciation calculation
    workingCapitalAllowance = opex * workingCapitalMonths / 12
    requiredRevenue = opex + depreciation + workingCapitalAllowance
    workbookVolume = deepWellVolume + pwspVolume + bbwspVolume
    workbookRequiredTariff = requiredRevenue / workbookVolume

Interest, equity and ROI remain zero for this supplied reference case. Use the existing engine's grant-only restriction for unsupported reference financing.

Do not apply 5% inflation again to already-calculated annual OPEX. Do not turn the original two-month annual allowance into a change-in-reserve calculation in this reference reproduction.

### 3.3 Main chart

Annual line chart: "Required tariff over time", PHP/m3.

- Original workbook reference.
- Current edited assumptions.

The original comparison is calculated from the existing primitive example seed, not from expected-result fixtures. The edited line uses the draft. Editing an assumption must change every affected annual calculation.

Keep the original reference limited to 2030–2039, where source drivers exist. If the user chooses years outside that range, show missing reference data rather than inventing observations or silently extending the last value.

Do not use the five-year minimum charge as a PHP/m3 rate. Preserve the existing five-year outputs in optional details, but they are not the main chart.

## 4. Revenue preview: calibrate the collection assumption correctly

### 4.1 Preserve observed data and add explicit scenario assumptions

Existing historical inputs, January–June 2025:

    reportedCollections = 10,129,070.87 PHP
    historicalBilledVolume = 952,194 m3
    historicalSystemInput = 1,385,950 m3
    historicalConnectionSnapshot = 6,084
    coveredMonths = 6
    assumedBaselineCollectionPercent = 80

The user expressly authorised the following POC calibration:

    c0 = assumedBaselineCollectionPercent / 100
    impliedHistoricalBillings = reportedCollections / c0
    inferredAverageTariff = impliedHistoricalBillings / historicalBilledVolume

Results:

    impliedHistoricalBillings = 12,661,338.5875 PHP for six months
    inferredAverageTariff = 13.297015721061042 PHP/m3

Store these as separate inferred scenario results. Do NOT fill observed billings or observed currentTariff with these values. Those historical fields remain unknown. The permission to infer a POC billing base does not make the inferred figure an observed fact.

Use the inferred average rate as the initial "Tariff to test", labelled "Assumed from collections". Once the user manually edits the applied tariff, retain that override. An explicit "Use inferred rate" action can restore the link.

Separate baseline collection efficiency from intervention collection efficiency:
- Changing baseline calibration c0 deliberately recalibrates inferred billings/rate.
- Moving the intervention target c1 must NOT recalibrate inferred billings or the baseline rate.

Treat all reported collections as relating to the calibration period for this illustration. Note in details that arrears timing is not modelled.

### 4.2 Simple annual volume projection

There are TWO distinct volumes. Keep them explicit:

1. Workbook volume: reproduces the original tariff denominator and includes other-provider/projected quantities.
2. Utility billed volume: drives utility revenue estimates.

Never silently substitute workbook city/provider volume for measured utility billings.

Use a compact revenue-input expansion with first-forecast-year average connections, annual connection growth, monthly consumption, assumed baseline collection efficiency and applied average tariff.

For the supplied demo only, offer/prefill these as labelled estimates:

    firstForecastYearConnections = 6,084
    connectionGrowthPercent = 0
    monthlyConsumption = 952,194 / (6,084 * 6)
                       = 26.08464825772518 m3/connection/month

The 6,084 snapshot is not confirmed as an average. Using it for the first forecast year is a flat-demand POC assumption, not a documented 2030 connection forecast.

For t = year - firstForecastYear:

    utilityConnections[y] = firstForecastYearConnections * (1 + growth / 100)^t
    utilityBilledVolume[y] = utilityConnections[y] * monthlyConsumption * 12
    grossBillings[y] = appliedAverageTariff * utilityBilledVolume[y]
    collections[y] = grossBillings[y] * collectionEfficiency / 100

Default annual volume is 1,904,388 m3, equivalent to doubling the six-month data. State "Annualised estimate; no seasonality adjustment". Hold consumption and the applied tariff constant across years in this POC; connection growth changes annual sales. Detailed demand response and tariff escalation schedules are deferred.

If an existing utility scenario has a capacity constraint, preserve the reviewed engine's supply-capped sales calculation. The workbook-based POC is an explicitly unconstrained demand estimate, not proof of supply adequacy.

For this first build, costs retain the workbook's annual projections; connection growth changes the utility revenue forecast. Do not invent an automatic infrastructure or coverage-cost relationship.

### 4.3 Revenue outputs and honest labels

Show gross billings, expected collections and cash O&M coverage:

    cashOmCoverage = collections / opex

Display coverage as a percentage, where 100% means collections cover OPEX.

Two optional balance measures are useful:

    operatingBalance = collections - opex
    revenueTargetBalance = collections - requiredRevenue

Label these "Collections less operating costs" and "Balance against modelled revenue target". They are not full cash-flow closing balances: the workbook revenue target includes non-cash depreciation and its own working-capital allowance.

If showing a collection-adjusted rate, calculate and label:

    tariffToCollectRevenueTarget = requiredRevenue / (utilityBilledVolume * c)

Label it "Tariff to collect the modelled revenue target". Do not call it the reproduced workbook tariff or a regulatory tariff. Its denominator differs from the workbook comparison.

Keep different tariff definitions in separate chart views/cards. Do not overlay the PHP21.94 workbook rate and this rate as though they use the same volume and objective.

Use a small revenue chart with billings, collections and OPEX across years. Keep detailed target-balance and adjusted-rate results in an expansion if the main screen becomes crowded.

A single explanatory note is sufficient: "Illustrative forecast: workbook projected costs and utility billed-volume estimates." Do not present this mixed-source POC as a calibrated current utility financial statement.

## 5. Operational improvements: a separate interactive section

This section takes the current base assumptions from Tariff simulator. Do not require staff to enter the same costs, volume or tariff again.

### 5.1 Controls

| Switch/control | Default | Behaviour |
| --- | --- | --- |
| Collect more bills | Off; target equals baseline 80% | When enabled, set target collection percentage |
| Reduce NRW | Off; target equals baseline 31.296655723510945% | When enabled, set target NRW |
| Reduce O&M costs | Off; reduction 0% | Apply a percentage saving to remaining operating costs |
| Annual improvement programme cost | 0, labelled an assumption | Optional extra annual OPEX; incurred when an intervention is active |

Each control has a short explanation, current value, proposed value and percent unit. Apply targets from the first forecast year throughout the horizon for this POC. Defer ramps, intervention-specific start dates and investment financing.

Baseline NRW:

    r0 = 1 - 952194 / 1385950
       = 0.31296655723510945

Using this historical NRW with the workbook cost components is an explicit illustrative sensitivity assumption. It is not a claim that the workbook cost/volume boundary has been validated.

### 5.2 NRW and O&M calculations

Use the fixed/variable components returned by the workbook calculation. Hold billed demand constant between the before/after intervention cases:

    systemInputBefore = utilityBilledVolume / (1 - r0)
    systemInputAfter = utilityBilledVolume / (1 - r1)
    variableCostFactor = systemInputAfter / systemInputBefore
                       = (1 - r0) / (1 - r1)

For zero billed volume, use the fraction expression where valid rather than dividing zero by zero; tariff/revenue ratios with zero denominators remain unavailable.

    opexAfterNrw = fixedOpex + variableOpex * variableCostFactor
    scenarioOpex = opexAfterNrw * (1 - omSavingPercent / 100)
                   + annualImprovementProgrammeCost

NRW reduction changes the identified volume-sensitive costs only. It must not reduce staffing automatically. The additional O&M saving is applied to the remaining cost base, not added as a separate saving from the original baseline.

This control represents physical-loss reduction for the POC. Do not also award extra sales for the same recovered water. Commercial-loss recovery and selling recovered water can be added later.

Recalculate the workbook target:

    scenarioWorkingCapital = scenarioOpex * workingCapitalMonths / 12
    scenarioRequiredRevenue = scenarioOpex + scenarioWorkingCapital + depreciation
    scenarioWorkbookTariff = scenarioRequiredRevenue / workbookVolume

Recalculate revenue and coverage:

    scenarioGrossBillings = appliedAverageTariff * utilityBilledVolume
    scenarioCollections = scenarioGrossBillings * scenarioCollectionPercent / 100
    scenarioCashOmCoverage = scenarioCollections / scenarioOpex
    scenarioTargetCollectionTariff =
        scenarioRequiredRevenue / (utilityBilledVolume * scenarioCollectionPercent / 100)

Collection efficiency alone changes collections, coverage and the rate needed to collect the revenue target. It does not change OPEX, gross billings or the workbook cost-per-volume tariff.

### 5.3 Baseline, combined effects and charts

For every preview:
1. Calculate the current draft WITHOUT interventions.
2. Calculate the SAME draft WITH the currently enabled interventions.
3. Compare annual results and selected-year KPIs.

Always calculate from the base inputs. Never apply a new slider change to already-adjusted outputs. Toggle order and previous runs must not affect the result.

Separate intervention charts:
- Cost-based required tariff: without improvements versus with improvements.
- Collections and operating costs: baseline versus improved scenario over time.

A small chart selector may expose the collection-adjusted target rate, using its own clearly labelled axis/definition. It must not be mixed with the workbook denominator.

Selected-year comparison cards: required tariff, OPEX, collections, cash O&M coverage and change from the no-intervention case. Keep cash O&M coverage calculated; do not add an independent "improve coverage" multiplier.

Show total combined benefit directly. Defer attribution waterfalls and contributions by intervention, because interactions require an explicit attribution convention. Do not sum standalone benefits as the combined answer.

## 6. Implementation guidance for this repo

### Existing implementation facts

- The engine already reconstructs the workbook from primitive observations.
- All 15 existing engine tests passed at the reviewed commit.
- Workbook reference currently returns null revenue fields.
- The reviewed method already supports chosen-tariff billings, collections, NRW, fixed/variable costs and debt.
- The UI currently requires save/calculate and has eight steps.
- Simulation inputs and run outputs are JSONB, so optional POC fields need no new database table.

### Files to change

| File | Change |
| --- | --- |
| artifacts/utility-tariff/src/pages/simulation.tsx | Replace eight-step primary navigation with Setup / Tariff simulator / Operational improvements; unified draft state |
| artifacts/utility-tariff/src/components/run-view.tsx | Reuse chart structure; add lightweight live preview/comparison components without pretending a preview is a saved run |
| artifacts/utility-tariff/src/lib/fields.ts | Simplify labels/grouping; remove redundant primary inputs |
| artifacts/api-server/src/lib/engine.ts | Parameterise reference constants, expose components, add pure POC baseline/intervention calculations |
| artifacts/api-server/src/routes/simulations.ts | Add validated, non-persisting preview endpoint; integrate saving of optional POC inputs/results |
| lib/api-spec/openapi.yaml | Describe new optional inputs and preview output; regenerate clients and validators |
| tests/engine.test.ts | Preserve existing tests and add focused POC checks |

Small additional components or a pure calculation helper are fine. Do not move the entire architecture or add a new charting library.

### Data and calculation shape

Add a small optional object to SimulationValues, for example interactive, for genuinely new POC settings:
- reference cost parameters currently hardcoded;
- optional opexScale;
- calibration baseline collection percentage, if distinct from existing forecast factor;
- intervention switches, targets, saving percentage and annual programme cost;
- explicit applied-tariff source/override state.

Reuse existing chosenTariff, forecastConnections, connectionGrowth, consumption, inflation, energyCost, workingCapitalMonths, observations and projects where their definitions match. Do not give two different meanings to one field or keep duplicate editable copies.

Keep inferred billings/rates outside observed historical fields. If no interactive object exists, existing engine behaviour and old records must remain readable.

Use one pure function for preview and persisted POC outputs. Existing calculate(snapshot) can expose an optional interactive result block alongside its unchanged legacy result contract. Store the applied input snapshot and engine version with saved output.

Suggested preview:

    POST /api/simulations/:id/preview
    body: validated draft simulation snapshot
    response: baseline, edited tariff series, intervention series and derived cards

Use the same ownership/read-only rules as the existing simulation routes. Editable-copy previews accept draft overrides. The protected reference only previews its saved assumptions; duplicate it for editing. No source documents become public.

Preview must not insert revisions, create runs, reseed data or modify projects. Use request cancellation or a monotonically increasing request ID to reject stale responses.

Saving must preserve all new settings across reload. If the existing report layout cannot show POC results within the hour, keep it explicitly scoped to its existing frozen calculation and do not offer it as an export of the interactive intervention view. Do not silently export different numbers from the displayed scenario.

Regenerate OpenAPI clients/Zod schemas; editing generated files alone will be overwritten. Increment engine version when calculation behaviour changes.

## 7. Numerical acceptance checks

Expected figures are TEST-ONLY. Runtime calculations must use inputs and formulas.

### A. Unchanged workbook

| Year | OPEX, PHP/year | Required tariff, PHP/m3 |
| --- | ---: | ---: |
| 2030 | 266854479.77779043 | 21.938467717258856 |
| 2031 | 233682598.69501808 | 20.676556771652255 |
| 2032 | 241784175.07980686 | 21.058412933653067 |
| 2033 | 250331635.14579704 | 21.459499271708033 |
| 2034 | 259353024.03425560 | 21.880631438308070 |
| 2035 | 309865209.97551996 | 25.794745677923820 |
| 2036 | 320071546.11759865 | 26.250851421086700 |
| 2037 | 330830569.57471687 | 26.729208511246120 |
| 2038 | 342176824.95468605 | 27.230702491669852 |
| 2039 | 354147169.76447517 | 27.756239492749216 |

2030:
- Workbook volume: 15,247,187.847318565 m3.
- Depreciation: PHP23,169,711.95995772.
- Working-capital allowance: PHP44,475,746.629631735.
- Revenue requirement: PHP334,499,938.3673799.
- Five-year minimum outputs remain PHP214.02713626516058 and PHP267.5234951893514 for 10 m3, not per m3.

Compare to existing data/workbook.expected.json. Rate tolerance 0.000001; money tolerance PHP0.01.

### B. Only O&M saving = 10%, no NRW change, no programme cost

2030:
- OPEX = PHP240,169,031.8000114.
- Revenue requirement = PHP303,366,915.7266377.
- Workbook required tariff = PHP19.89658150502744/m3.
- Depreciation unchanged.
- Volume unchanged.
- Gross billings unchanged if applied tariff and billed volume are unchanged.

### C. Collection calibration and improvement

At baseline c0 = 80%:
- Six-month inferred billings = PHP12,661,338.5875.
- Six-month collections reproduce PHP10,129,070.87.
- With unchanged volume/tariff and c1 = 95%, six-month collections = PHP12,028,271.658125.
- Annualised base collections = PHP20,258,141.74.
- Annualised improved collections = PHP24,056,543.31625.
- Annual increase = PHP3,798,401.57625.
- Workbook required tariff remains PHP21.938467717258856 if costs/volumes are unchanged.

At the flat utility volume of 1,904,388 m3/year, the tariff to collect the full workbook revenue target is about PHP219.5586839232472/m3 at 80%, falling to PHP184.89152330378715/m3 at 95%. These are deliberately different from PHP21.94: the sales denominator and collection adjustment differ. Do not "fix" the discrepancy by silently using the workbook volume as utility sales. It exposes the illustrative mixed-source assumptions.

### D. Only NRW 31.296655723510945% -> 25%

Using the cost split above, 2030:
- Fixed OPEX = PHP12,030,700.8822.
- Variable OPEX = PHP254,823,778.89559045.
- New OPEX = PHP245,460,645.03286234.
- New workbook required tariff = PHP20.30147903980433/m3.
- Utility billed volume and gross billings remain unchanged.
- This is a cost-sensitivity result, not a validated engineering savings estimate.

### E. Combined case

NRW 25%, O&M saving 10%, collection 95%, zero programme cost:
- OPEX = PHP220,914,580.5295761.
- Revenue requirement = PHP280,903,389.2444632.
- Workbook tariff = PHP18.423291695318362/m3.
- Annual collections with default flat utility demand and inferred applied rate = PHP24,056,543.31625.
- Cash O&M coverage = 10.889522664634307%.

### F. Behaviour checks

- All interventions off equals the current Tariff simulator baseline for every year.
- Toggling interventions in any order produces the same result.
- Changing only applied tariff changes billings, collections and coverage, not workbook costs/required tariff.
- Collection-only improvement does not alter inferred baseline billings.
- Editing a cost component changes the aggregate OPEX, allowance and tariff consistently.
- Baseline edits flow into both sections; intervention edits never overwrite baseline assumptions.
- Save/reload preserves all new settings.
- Stale preview responses cannot overwrite newer results.
- Original example remains unchanged.

Validate finite numbers, nonnegative costs/volumes/tariffs, asset life > 0, baseline collection > 0 and <= 100, NRW >= 0 and < 100, O&M saving 0–100%. Target collection may be zero: receipts are zero and the target-collection tariff is unavailable, not Infinity. Zero OPEX makes O&M coverage unavailable with an explanatory label. Handle missing/zero denominators without displaying NaN.

## 8. One-hour build sequence and completion report

| Budget | Work |
| --- | --- |
| First 15 minutes | Parameterise reference costs, expose components and implement pure POC calculations |
| Next 20 minutes | Three-section UI, editable cards and debounced live preview |
| Next 15 minutes | Separate intervention controls and charts, revenue calibration, save/reload integration |
| Final 10 minutes | Existing tests, focused numeric checks, typecheck/build and UI verification |

Defer all 12 WaterCred ratios, monthly cash ledgers, debt optimisation, automatic service-expansion feedback, block-tariff optimisation, uncertainty analysis, attribution waterfalls and report redesign.

Run npm test and the applicable workspace typecheck/build commands. Verify in the running UI that moving a slider changes the selected-year cards and annual charts together. Test save/reload once with all three intervention settings.

When finished, report:
- Which files changed.
- Which numerical benchmarks and UI interactions were verified.
- Any concrete missing pieces, without calling a static or unsaved mockup complete.

The requested deliverable is a simpler, working interactive POC in the existing app. Do not deploy/publish as part of this instruction unless separately requested.

