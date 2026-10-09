# Utility Business Plan Application

## Review and Replit implementation framework

Prepared for Billy Hoo • 8 October 2026

The recommended product is a guided business-planning application with reusable utility records, a transparent calculation engine, and versioned reports. Utilities should enter figures they already recognize from their records, add management decisions through short prompts, and generate progressively more complete reports as information becomes available. The Tagbilaran package is a useful pilot and report reference, but its financial workbook needs methodological reconciliation before its tariff results become production calculation rules.

This review covers all seven supplied files. It combines PDF text extraction, visual inspection of the scanned documents and tariff photograph, and inspection of workbook formulas and saved values. Representative headline figures were independently reconciled. It is not a complete transcription of every scanned cell or a recalculation of the entire Excel model in Excel. The source files have not been changed. Page references below are PDF page numbers, rather than the report's printed page numbers.

## 1 What the files contribute

| File | Contents inspected | Role in the application |
|---|---|---|
| 01 Preliminary business plan | 35-page PDF; baseline, vision and mission, assets and risk, SWOT, action plans, investment and operating costs, tariffs, KPIs, and citywide demand | Reference report structure and a source of workshop decisions. Its figures should be generated from accepted data and results, rather than entered again as report text. |
| 02 Financial model | Nine worksheets, including demand, CAPEX, assumptions, OPEX, depreciation, debt, and tariff calculations | Reference calculation logic and historical benchmark. Contains external dependencies, hardcoded transfers, and issues requiring review. |
| 03 Summarized WSP data | Ten worksheets; Tagbilaran summary, barangay details and calculations, plus other municipalities, several hidden | An intermediate preparation layer. Demonstrates the conversions and estimates needed between utility records and reports. Import only explicitly selected utility, provider and geography records. |
| 04 Filled questionnaire | Nine scanned pages; partial service, facility, finance and staffing responses, with many blanks | Evidence of what staff can readily supply and where documents or assisted completion are needed. It should inform short forms, rather than become one large mandatory online questionnaire. |
| 05 Connections, consumption and collections | Fourteen scanned pages; connection snapshots, monthly consumption by area, collections history and a residential service summary | Historical commercial observations. Separate connection stocks, billed water volumes, money billed and cash collected. Retain source dates and distinguish repeated summaries from additional records. |
| 06 Water rates | Photograph of a tariff schedule marked effective September 2016 | Structured tariff schedule by customer class, minimum charge and consumption band. Also contains due dates and a late-payment penalty, which belong in billing-policy fields. This review does not establish whether the schedule remains legally current. |
| 07 Production data | Eight scanned pages; monthly pumping output, meter readings and pumping-station profiles | Water-input observations and an initial asset register. Pump capacity, measured output and estimates need different field definitions. |

The current preparation process is: utility documents and interviews → manually organized observations → spreadsheet calculations and planning assumptions → workshop decisions → report tables and narrative. The application should make each transition explicit and reusable.

There are three distinct kinds of content. **Facts** include connections, volumes and expenditures. **Calculated results** include NRW, average consumption and projected costs. **Management decisions** include mission statements, priorities, asset assessments and action commitments. Only the second group should be generated automatically from arithmetic. Management content requires user input or review even when AI helps draft it.

## 2 How the report relates to its data

| Report section | Main evidence or calculation | Recommended input and report behavior |
|---|---|---|
| General and socioeconomic profile, PDF pp. 5–9 | Questionnaire and cited demographic/planning sources; several underlying source documents are not separately supplied | Utility profile plus dated population, households, geography and income observations. Preserve actual versus projected population. Income remains unavailable until supplied. |
| Coverage and provider comparison, Tables 1–2 | File 03 `Tagbilaran summary`, `Tagbilaran bgy details`; source documents and interviews | Geography-provider coverage records with dates, household denominators and overlap notes. Provider presence in a barangay is not household coverage. |
| Technical and commercial baseline, Tables 3–4 | Files 05 and 07 → file 03 `calculations` → `Tagbilaran summary` | Enter production, billed volume and connections once. Derive comparable-period indicators automatically. |
| Financial and staffing baseline, Tables 5–6 | Questionnaire Tables 10–13, collections records and summary data | Separate billings, collections, OPEX, subsidies and staffing categories. Never infer billings from a collections total. |
| Vision, mission and values, Table 7 | Workshop responses recorded in file 01 | Short guided prompts with editable text and a named reviewer. |
| Asset registry, criticality and management plan, Tables 8–12 | File 07 pumping profiles plus workshop judgments and illustrative entries | Asset cards with condition, commissioning date, likelihood/consequence scores, proposed work and cost. Retain stable asset IDs across reports. |
| SWOT and goals, Table 13 and action plans | Workshop discussion, PDF pp. 19–22 | Guided issue → objective → action records. Staff confirm every proposed action. |
| Investment program, Table 14 | Selected pipeline rows of `Tagbilaran CAPEX&OPEX_realistic` | Project register with annual costs and an explicit selection of which projects appear in a summary. Show the complete financial-model total separately. |
| Operating expenditure, Table 15 | `INPUT DATA  Assumptions` → `OPEX` | Staff, salaries, electricity, bulk water, treatment and other costs by year; expose the cost drivers and their basis. |
| Historical and proposed tariffs, Tables 16–18 | Historical costs/volumes, file 06, and `TARIFF CALC` | Current tariff, projected revenue requirement and bill examples are separate outputs. The proposed tariff requires a validated revenue model. |
| KPI monitoring, Table 19 | Workshop targets and monitoring arrangements | KPI definition, baseline, target, owner, evidence source and frequency. Targets cited from a draft document are not universal regulatory defaults. |
| Citywide demand, Tables 20–25 | `BOHOL DEMAND PROJECTION`, assumptions about other providers, population, tourism and NRW | Optional advanced planning module with explicit geography and provider boundaries. The report itself says this analysis was outside the original simplified exercise, PDF p. 29. |
| Maps, photographs and organization chart | Embedded in the PDF; editable GIS layers and original diagrams are not supplied | Allow uploads with captions first. GIS editing and automatic organization charts can follow later. |

### A reproducible operational example

For January–June 2025, file 05 p. 7 lists monthly billed-volume totals of 171,620; 149,775; 149,048; 151,038; 175,997; and 154,716 m³. They sum to **952,194 m³**, matching file 03 `calculations!C5`.

File 07 p. 2 gives production totals of 231,138; 228,560; 241,223; 241,234; 221,798; and 221,997 m³. They sum to **1,385,950 m³**, matching `calculations!C6`.

Using the 181 calendar days in that period:

- Billed volume = 952,194 ÷ 181 ÷ 1,000 = **5.26074 MLD**.
- Production = 1,385,950 ÷ 181 ÷ 1,000 = **7.65718 MLD**.
- NRW = (1,385,950 − 952,194) ÷ 1,385,950 = **31.2967%**.
- The workbook's consumption calculation is 952,194 ÷ 6 ÷ 6,084 = **26.08465 m³/connection/month**.

These reproduce the report's rounded 5.26 MLD, 7.66 MLD, 31% and 26.1 m³. The consumption calculation uses one connection snapshot throughout six months. If monthly active or billed connection counts are available, use connection-months instead; otherwise label the snapshot-based figure as an estimate. The 6,084 connection count's date requires reconciliation across the documents.

### A reproducible tariff example

In file 02, `TARIFF CALC!I28` averages the five annual required rates in `D28:H28`, then multiplies by ten. This produces **PHP214.027136**, reported as a **PHP214.03 minimum monthly charge for the first 10 m³**. `P28` similarly produces PHP267.523495 for the second five-year period. Successive volumetric blocks increase by 5% using `D34` and `K34`.

This explains where the printed tariff came from. It does not establish that the underlying demand boundary, revenue requirement, customer distribution or cash recovery is correct.

## 3 Issues to resolve before translating the model into code

### 3.1 Utility billable water is mixed with other providers' demand

**High priority for model validation.** `TARIFF CALC!D21`, labeled volume sold, sums `INPUT DATA  Assumptions!D5:D7`:

| 2030 component | Annual volume |
|---|---:|
| Deep wells, D5 | 0 m³ |
| PWSP, D6 | 8,557,477.465 m³ |
| BBWSP, D7 | 6,689,710.382 m³ |
| Tariff denominator | **15,247,187.847 m³** |

The PWSP value exactly matches `BOHOL DEMAND PROJECTION!S570 × 365,000`: **23.44514 MLD of unconstrained demand for other WSPs**. The BBWSP value exactly matches `S584 × 365,000`: **18.32797 MLD of net demand** after subtracting other providers' supply. The report's Table 25 uses these same distinctions.

The denominator therefore appears to include other providers' volumes and water requirements that include NRW, while the OPEX calculation principally uses the BBWSP quantity. Confirm whether any contractual resale arrangement justifies inclusion; none was established from this package. Production software should calculate TCWS billable volume from its own customers or its own water balance, with a consistent treatment of NRW. Do not publish a revised tariff by changing only this denominator: the costs, scope, collection assumptions and tariff design need joint reconciliation.

### 3.2 Collections have been relabeled and their period shifted

File 05 p. 13 is headed **Summary of Water Collections**. Its 2024 total is PHP22,887,685.65. Its 2025 total of **PHP12,036,951.99 includes January through July**, including July collections of PHP1,907,881.12. The first six months sum to **PHP10,129,070.87**.

File 03 `Tagbilaran summary!E25` and file 01 Table 5 describe PHP12,036,951.99 as January–June water sales. Questionnaire Table 10 also distinguishes annual billing from annual collection; the billing row is blank. This is a concrete reason to store cash collections, accrued billings, and exact period endpoints separately. Collection efficiency cannot be established from the cash table alone.

### 3.3 The financial workbook is not self-contained

The workbook has 45 external-link records and **95 formulas containing external workbook references**, using link indices 42–45. Eighty-one are in `Tagbilaran CAPEX&OPEX_realistic`; fourteen are in `AMORT SCHED`. Examples include CAPEX unit-cost references, production references and old tariff-model debt inputs. Their source workbooks are not separately included in the seven-file package.

In addition, many demand-projection and supply assumptions are stored as numbers rather than live formulas. The first ten years of `INPUT DATA  Assumptions!D4:M7` contain hardcoded connections and supply volumes. Changing the demand worksheet does not automatically update these cells.

Use available cached values as explicitly labeled historical evidence when necessary. Do not treat a workbook that opens without visible Excel errors as a portable calculation engine. Recover missing cost inputs or record accepted estimates with provenance, then implement self-contained functions.

### 3.4 The report's CAPEX summary covers only part of the model

Table 14's pipeline projects total approximately **PHP255.45 million**, reproducing selected worksheet rows for replacements, coverage expansion and new mains. The model's full 2026–2029 investment in `INPUT DATA  Assumptions!C10` is **PHP579.24 million**. It includes additional items such as meters, equipment and supporting works. A further **PHP114.06 million** appears in 2035 at `I10`.

This is a scope difference, not evidence that either total is necessarily arithmetically wrong. The generated report must explain which costs are summarized and reconcile the displayed project subtotal to the complete amount driving depreciation and tariffs.

### 3.5 Revenue requirements and cash flow need separate methods

The tariff model adds OPEX, interest, depreciation, a full two-month OPEX working-capital amount, equity items and an allowed return. Working capital is added each year as a full amount. Loan principal is not an equivalent annual tariff-line item. The example has 100% grant funding, zero loan share, zero equity and zero ROI, so it does not exercise nonzero debt and equity behavior.

The debt schedule also contains external references and balance-reset patterns; for example `AMORT SCHED!D19 = D15-D17`, and year-six calculations start from a new loan amount. These require explicit tests with outstanding earlier loans, rather than assuming the zero-debt example proves the schedule works.

For the app, keep an operating statement, a cash-flow statement and a tariff revenue-requirement schedule distinct. A cash-flow forecast normally treats working capital as an opening requirement and subsequent changes in the required balance. A tariff method may treat working capital differently, but that should be a named and reviewed method. Do not combine full CAPEX, depreciation and principal repayment indiscriminately in one cost-recovery formula.

Depreciation also begins during the construction years in the reference workbook. Confirm asset commissioning dates before adopting that convention. Bulk purchase and additional pumping costs can both be legitimate, but their boundaries must be explicit to avoid charging again for costs already included in a bulk-water price.

### 3.6 A minimum block charge is not an average volumetric tariff

File 06 shows a **PHP62 minimum for the first 10 m³** for residential and institutional customers. The subsequent marginal rates are PHP7 for 11–20, PHP8 for 21–30, PHP11 for 31–40, PHP14 for 41–50, PHP17 for 51–60, PHP20 for 61–70, and PHP23 above 70 m³. Commercial water is listed at PHP23/m³. The report's PHP6.20/m³ description is the minimum charge divided by ten, not a universal flat rate. Table 5 also presents the PHP62 minimum with a misleading per-m³ label.

The application needs minimum charges, included volumes, customer categories, effective dates and marginal block rates. With the photographed schedule, example residential bills are PHP62 at 10 m³, PHP132 at 20 m³ and PHP212 at 30 m³, before penalties or other charges. Confirm zero-consumption billing and any commercial minimum during tariff setup.

For proposed tariffs, the arithmetic average of five yearly required rates is not necessarily a five-year revenue-recovering rate, and an increasing-block structure produces revenue that depends on the distribution of consumption. Customer or consumption-band data are needed to test that revenue.

### 3.7 Other differences should become validation rules

| Observation | Evidence | Application response |
|---|---|---|
| Different reference dates for the same 6,084 connections | File 03 E15 says June 2025; report Table 4 says August 2025. File 05 contains a separate December 2025 snapshot of 6,314. | Store all snapshots separately, resolve the report's selected date and definition, and never silently overwrite one with another. |
| Provider NRW appears transposed | File 03 `Tagbilaran summary!C8:D8` gives BWUI 10% and Richli 6.8%; report Table 2 gives 7% and 10%, respectively. | Keep provider IDs fixed throughout import and report generation. Confirm source values. |
| Estimated production can look measured | File 03 `calculations!C39` estimates Tagbilaran-only BWUI production from billed volume and the whole-provider NRW rate. | Preserve the estimate method and geographic allocation. Do not describe it as directly measured city production. |
| OPEX period label is inconsistent | Report Table 15 ends with Y5 (2035), but file 02 `OPEX!I4` is 2034. | Generate all headings from one calendar. |
| Operating-ratio direction is ambiguous | Report Table 19 says at least 1.00; `FORMULA!E14` defines OPEX/revenue. | Use explicit names: revenue/OPEX for operating cost coverage; OPEX/revenue for operating ratio. Store target direction with the definition. |
| Coverage exceeds 100% | Report p. 9 reports 103% sanitation coverage. | Retain the original observation but flag denominator, year, overlap or boundary inconsistency. Do not present it as validated coverage. |
| Affordability and positive cash are asserted without a reproducible schedule | Report p. 25 says 2% of low-income earnings and positive cash; p. 5 gives no average-income data. No dedicated cash-flow or income schedule was identified in the supplied workbook. | Ask for the income source, customer bill assumptions and cash-flow schedule before reproducing those conclusions. |
| Service-quality narrative differs | Report baseline says no customer complaints; SWOT mentions 10% failure in sampling. | Keep complaints and laboratory compliance as different indicators. No complaints does not establish compliant water quality. |
| Staff descriptions differ | Report p. 9 mentions 11 regular staff; Table 6 and questionnaire list 9 permanent and 15 job-order staff. | Date staffing records and distinguish employees, contracted staff and FTEs. |
| Old and new values appear in source tables | File 05 p. 1 has December 2025 totals and a detailed area/class table that needs reconciliation. | Sum detail against stated totals before accepting an import. Preserve both if unresolved. |
| Blank future months show zero totals | File 07 p. 2 has data through June and zero totals under later empty months. File 05 p. 7 includes later incomplete/empty months. | Record period completeness. A calculated zero below blank cells is not evidence of zero production or consumption. |

## 4 Input design for low-capacity utilities

### Start with records staff already use

The home page should offer **Start a report**, **Continue a draft**, and **Update our records**. After selecting a utility, the user chooses the reporting period and report purpose. For a new period, offer to reuse stable profile information, existing assets and outstanding actions, while leaving new-period actuals blank.

Each information page should offer three equivalent entry routes:

1. **Type the totals.** Plain-language fields, visible units, one reporting period at a time, and examples.
2. **Paste or upload a table.** Accept Excel/CSV and pasted rows. Show the proposed column mapping, dates, totals and detected conflicts before saving accepted observations.
3. **Upload a document or photo.** Save the evidence immediately. In the first release, staff or an adviser can enter values beside it. Later, OCR/AI can propose values for confirmation, with the relevant page or image crop visible.

Every route writes to the same structured records. An uploaded file is evidence, not automatically an accepted set of facts. Avoid requiring account-level customer data: monthly category or utility totals are enough for much of the first release.

### Use progressive modules

| User-facing module | Initial questions | Additional detail only when needed |
|---|---|---|
| About your utility | Name, service area, reporting dates, currency and water/sanitation services | Demographics, other providers, maps, organizational structure |
| Customers and water | Active connections, water supplied and billed volume, dates and units | Monthly customer classes, meter status, area details, source-by-source volumes |
| Money received and spent | Amount billed, cash received, operating cost, reporting basis | OPEX categories, arrears, subsidies, fees, debt and opening cash |
| Current water charges | Customer class, minimum monthly bill, included water, block rates | Meter sizes, seasonal rates, taxes, subsidies, penalty and effective-date rules |
| Service and assets | Hours of supply, main problems, critical assets | Quality tests, pressure, asset risk, replacement dates and costs |
| Your improvement plan | Priority issue, proposed action, responsible person and timing | Annual targets, project quantities, detailed costs, funding and dependencies |
| Future costs and tariffs | Forecast years, connections, consumption, NRW and main costs | Financing cohorts, tariff periods, income groups and sensitivity assumptions |
| Review and report | Missing information, changes from the previous version, narrative confirmation | Adviser comments, approval and report comparison |

Do not ask staff to calculate NRW, MLD, collection efficiency or average tariffs themselves. Ask for the underlying quantities and show the calculation in an optional “How this was calculated” panel.

For example: “How much water did you supply during this period?” with a unit selector and a source field. Help text should distinguish water produced from water bought and warn against entering a combined total plus its components. “How much did you bill customers?” must be separate from “How much cash did you collect?”

### Allow useful reports with partial data

| Output | Minimum useful data | If something is missing |
|---|---|---|
| Utility profile and action plan | Utility/area identity, dates, service description, issues and actions | Generate a partial report with explicit missing sections. |
| Operational baseline | Above plus connections, water input and billed volume with comparable periods | Generate only calculable indicators; identify missing dependencies beside others. |
| Financial diagnostic | Comparable billings or operating revenue, collections and OPEX with accounting definitions | Separate the available cash and accounting views. Do not infer collection efficiency without billings. |
| Indicative business and tariff plan | Baseline; future connections/consumption and water balance; cost assumptions; tariff structure; investment timing/funding when included | Allow draft forecasts based on accepted estimates, clearly labeled. Withhold unsupported affordability, viability or tariff-recovery conclusions. |
| Full report matching the sample's breadth | Above plus assets, risk, SWOT, management strategy, monitoring and optional demand analysis | Missing advanced appendices should not prevent a basic report. |

For every field, distinguish **Known**, **Estimated**, **Not available**, and **Not applicable**. “Known” may still be a utility-reported value awaiting documentary confirmation. Keep evidence review as a separate status. A real zero must remain different from missing information.

Make the first baseline possible with one comparable recent period; invite additional years and monthly detail later. If annual totals are provided alongside monthly data, treat them as alternative totals to reconcile, not extra amounts to add. Never extrapolate a partial year silently. Where staff choose an annual estimate, record its method and show actual versus estimated values separately.

### Reduce recurring effort

Use autosave with a visible saved/unsaved state, large form controls, keyboard-friendly grids, lightweight pages and mobile photo upload. Provide resumable work, a printable collection form, and spreadsheet import for staff with unreliable connectivity. Full offline editing is a later feature; do not claim the first release works offline merely because it autosaves online. Adviser access should allow supported completion without transferring ownership of the utility's records.

Use examples and a short glossary instead of technical language in the forms. Show “6 of 8 sections started” and the exact missing inputs, rather than a score implying that completeness proves reliability. Pilot the workflow with utility staff performing a real task without a facilitator before expanding it.

## 5 Data structure and report versions

### Recommended records

| Entity | Essential fields or relationships |
|---|---|
| Organization and membership | Organization, user, role, assigned utilities; organization isolation on every request |
| Utility and service area | Stable utility ID, geography, services, currency, time zone, profile versions |
| Source document | Owner, utility, original name, immutable storage key, checksum, document date, upload date and version |
| Observation | Metric key, value, unit, currency where relevant, actual/estimate status, start/end or snapshot date, completeness, utility/provider, geography, customer class and source locator |
| Observation revision | Previous version, change reason, author, review decision and timestamp; preserve competing source claims |
| Dataset revision | Explicit accepted observation versions for a baseline or reporting period, with unresolved issues recorded |
| Tariff schedule and band | Category, effective dates, minimum charge, included volume, marginal band limits/rates and billing-rule version |
| Asset and assessment | Asset ID, location, capacity/unit, condition, commissioning date, useful life, risk assessment and evidence |
| Goal, action and project | Objective, KPI, owner, due date, status, area, asset links and expected service effect |
| Project cost and funding schedule | Project/year, price basis, nominal/real status, CAPEX/OPEX classification, funding source, amount and timing |
| Plan revision and scenario | Baseline dataset revision, start/end years, assumptions, selected projects, current/proposed tariffs and named scenario |
| Calculation run | Frozen inputs, engine version, method configuration, validation findings, results and input hash |
| Report version and artifact | Plan revision, calculation run, template version, approved narrative, status, export keys/checksums and creation date |
| Review and audit event | Actor, action, entity/version, previous/new values or references, reason and timestamp |

Use typed operational and financial tables where practical, with a shared provenance structure. A metric dictionary should define allowable units, aggregation, dimensions and dependencies. Avoid an untyped key-value system for every calculation or a single JSON blob as the only database design. Immutable JSON snapshots are useful for reproducible runs and reports.

An observation's identity should include the metric, provider/utility, geography, customer class, measurement basis and period. A connection count is a stock at a date; billed volume is a flow over an interval. Store period dates explicitly. A citywide demand estimate must not be interchangeable with a single utility's production observation.

### New reports and new inputs

1. User selects **New report** and chooses “start fresh,” “use existing records,” or “copy an earlier plan.”
2. The app creates a new draft plan/report revision referencing selected data. Historical accepted observations remain available.
3. Updating an input creates a new observation or revision. Draft results become stale until recalculated; existing issued reports retain their original values.
4. The user can create multiple scenarios from the same baseline, such as current operations and a selected investment plan. Each stores its own assumptions and produces an independent calculation run.
5. **Generate report** saves a frozen input-and-result snapshot, template version and narrative version. Every export uses that snapshot.
6. **Revise this report** creates a child version with a change summary. Correcting a baseline never silently rewrites an already issued report.

Default statuses: Draft → Under review → Finalized. A solo utility may finalize its own report; an adviser-review requirement can be configured for a program. A preliminary report can be exported while incomplete, with its limitations visible. Finalization requires resolving critical calculation conflicts for the conclusions being published, rather than completing every optional field.

## 6 Calculation specification

All calculations should be deterministic, versioned functions shared by the UI and exports. AI may propose structured extractions or editable narrative, but must not act as the numerical calculation engine.

### Historical operations

- **MLD** = volume in m³ ÷ covered days ÷ 1,000. Use the actual calendar, including leap days; keep a documented fixed-day convention only where a planning method explicitly calls for it.
- **Water input** = own production delivered into the selected system + imports entering that system. Define boundaries so internal transfers are not counted twice. Billed exports may be included in billed authorized consumption at the same boundary, or treated in a separate retail boundary, but the two conventions must not be mixed.
- **NRW** = (system input − billed authorized consumption) ÷ system input. Require a matching system boundary and period. Include billed unmetered estimates only when explicitly identified. Zero input makes the ratio unavailable, not zero.
- **Average monthly consumption** = billed volume ÷ connection-months for the matching customer population. An end-period count multiplied by months is an explicit fallback estimate.
- **Average billed tariff** = water-service billings ÷ billed water volume. Exclude unrelated fees, grants and penalties unless the displayed metric explicitly includes them. Cash collections ÷ volume is a different metric.
- **Simple collection ratio** = relevant cash collections in a period ÷ water billings in that period. If collections include older arrears, label that convention; a ratio over 100% may be legitimate. A current-bill collection rate needs payment allocation to the same bill cohort.
- **Operating cost coverage** = defined operating revenue ÷ defined operating costs. Display the accounting basis. The inverse may be shown as operating ratio, with the direction of improvement reversed.
- **Coverage** = unique served households ÷ households in the stated service area. If connections are used as a proxy, disclose the household-sharing assumption and possible overlap across providers.
- **Asset criticality** = likelihood score × consequence score using a named assessment scale. The report's 1–5 scale is a configurable starting example, not an automatic replacement decision.

### Forecasts

Start with annual projections and optional monthly detail. Basic billed volume can be projected from average active connections by class × consumption per connection-month × months. Apply partial-year timing to new connections. In the basic water balance, required utility input = projected billed authorized volume ÷ (1 − target NRW), with separately specified exports or other boundaries as needed. Do not multiply by (1 + NRW) when NRW is defined as a share of input.

Model capacity and procurement limits. When required supply exceeds available supply, show unmet demand or reduce the billable-volume scenario explicitly. Do not assume that an unconstrained demand estimate is guaranteed sales. Keep connection-growth and service-expansion assumptions consistent to avoid counting the same new customer twice.

For OPEX, offer direct annual cost inputs first and detailed drivers when available: payroll/FTE and paid months; electricity kWh × unit price or eligible pumped m³ × documented cost/m³; bulk purchased m³ × price; treatment costs on the volume actually treated; maintenance and other items. The reference uses 13 salary months, 5% escalation, 1 staff per 250 connections, 5% miscellaneous costs and a 10% service fee. These are example assumptions, not universal defaults. In the workbook, miscellaneous costs are applied to direct OPEX, and service fees to direct OPEX plus miscellaneous costs; labels saying “% of total OPEX” should be clarified.

Preserve cost base year, currency and nominal/real status. Do not inflate costs already supplied in nominal future-year prices a second time. Each project should have annual expenditure, commissioning date, expected effect, funding source and useful life. Expenditure alone should not automatically reduce NRW or create new connections; the user must specify the effect and its timing.

### Tariffs and cash

For a schedule with minimum charge M covering q₀ and marginal rates rᵢ for subsequent bands (Lᵢ,Uᵢ):

`bill(q) = M + sum[r_i × max(0, min(q, U_i) − L_i)]`

Use an open-ended final band and explicit rules for zero consumption, meter size, taxes and customer category. Apply monetary rounding according to the selected billing convention. Test exact thresholds and fractional consumption.

Revenue should be calculated from customer-level bills or an accepted distribution of accounts and consumption across bands. Where only class-average consumption is available, label the result as an approximation: billing the average customer is not generally equal to averaging actual bills. An alternative is category-level account counts plus the total marginal volume charged in each band. Specify whether these are marginal band volumes or the entire consumption of customers in a consumption group.

Maintain two distinct analytical views:

- **Cash planning:** opening cash + collected operating receipts + operating subsidies + grants + loan/equity receipts − cash OPEX − CAPEX − debt service − other cash uses = closing cash. If collections and payments are modeled directly, do not also subtract the same receivables/payables movement as an extra working-capital deduction.
- **Tariff requirement:** use an explicitly selected methodology for eligible OPEX, depreciation or capital recovery, financing costs, allowed return, working-capital treatment and eligible offsetting revenue. For a simple average-rate cash-recovery diagnostic, net cash requirement ÷ (billable volume × expected collection factor) is only appropriate after those boundaries are defined. A proposed block schedule still needs revenue simulation against that requirement.

Track debts as separate cohorts with drawdown dates, interest, term, grace and repayment pattern. Sum simultaneous loans; a new loan must not erase the old balance. Keep principal and interest separate. Grants fund CAPEX or operations as specified and are not tariff sales. Methods for grant-funded depreciation and allowable returns need explicit program or jurisdiction settings.

Affordability = the defined representative monthly bill ÷ monthly household income for a specified income group, place and price year. Do not invent the income denominator or use the sample's 2% statement as a universal threshold. Until the inputs exist, output “Not assessed.” Financial viability should be supported by stated tests and sensitivity results, not automatically inferred from one average tariff.

## 7 Report generation

Use a modular report with these sections: executive summary; utility/service-area profile; baseline performance; service and asset condition; strategy and action plan; investment program and financing; operating forecast and cash flow; current/proposed tariff and affordability; KPI monitoring; assumptions and evidence appendix. Add citywide demand only when enabled.

Each table should draw from a calculation-run result or an accepted structured record. Dates, units, source notes, chart labels and narrative numbers should use the same data objects. Produce PDF for circulation and editable DOCX for refinement; provide a transparent calculation/data export as a further output. Charts should respond to actual data coverage, without interpolating missing historical observations into apparently measured trends.

Use deterministic narrative templates for factual sentences. Optional AI drafting can explain trends or suggest wording using only provided facts and calculated results. Store model/prompt versions and user edits when AI is used. Require confirmation of causal explanations, risk judgments and management commitments. An action suggested by the app is not an adopted utility commitment until accepted.

If inputs change, mark the preview as needing refresh and show which sections are affected. Preserve custom narrative, but warn where it refers to changed results. Exported reports should show title, utility, period, scenario, version, date and draft/final status. The evidence appendix can carry detailed source and assumption references without cluttering the main report.

## 8 Replit architecture

Use a modular monolith for the first release: a single web application with separate modules for imports, observations, calculations, plans and reports. A suggested implementation is React/TypeScript for the interface, a TypeScript server API, PostgreSQL for structured records, and persistent object storage for evidence and exports. This is a design recommendation, not a requirement to adopt a particular framework or package version.

Replit's current documentation describes PostgreSQL-backed database support, persistent App Storage and separate development/production databases. Use approved capabilities in the actual workspace and verify deployment settings there. Store credentials server-side. Keep report creation and OCR as durable background jobs with status, retries and idempotency, rather than long browser requests.

| Component | Responsibility |
|---|---|
| Web client | Guided forms, paste/import preview, evidence comparison, report preview and change summary |
| Server API | Authentication, utility membership checks, validation, revision management and job submission |
| PostgreSQL | Utility records, immutable revisions, accepted inputs, plans, run metadata, job status and audit events |
| Object storage | Original uploads, extracted page images and immutable report exports using unique versioned keys |
| Calculation module | Pure operations, forecast, tariff, financing and affordability functions with versioned definitions |
| Job worker | OCR/import processing, calculations and PDF/DOCX generation with bounded retries |
| Report renderer | One report data contract, reusable sections and consistent dates/units across output formats |

Do not rely on deployment-local files for persistent utility documents. Replit currently documents that App Storage lacks native object versioning and retention policies; implement source/report versions using unique object keys and database references. Development and production can access an App Storage bucket, so environment separation must be designed explicitly, not assumed from database separation.

Keep authorization at the server and storage-access endpoints; knowing another utility's ID must never grant access. Apply organization/utility scope to every query and job, and verify worker jobs cannot cross tenant boundaries. Adviser access should be an explicit membership. Aggregate utility records are sufficient initially; avoid storing named customers unless a later use case requires them.

Use schema migrations, a separate development seed, and a production backup/recovery procedure. Deployment must not reset accepted utility data or overwrite finalized reports. Test a schema upgrade against a copy containing existing reports and observations. The first release can use a database-backed job queue; do not add distributed services until volume requires them. Index the tenant/utility, metric and period dimensions; paginate histories and cache immutable calculation runs by input hash.

Suggested API operations:

```text
POST /utilities
POST /utilities/:id/sources
POST /utilities/:id/imports
POST /imports/:id/confirm
POST /utilities/:id/observation-revisions
POST /utilities/:id/dataset-revisions
POST /utilities/:id/plans
POST /plans/:id/clone
POST /plans/:id/scenarios
POST /scenarios/:id/calculation-runs
POST /plans/:id/report-versions
POST /report-versions/:id/finalize
GET  /jobs/:id
GET  /report-versions/:id/artifacts
```

Writes should use idempotency keys where retries could duplicate imports or report generation, and optimistic version checks where concurrent edits could overwrite changes. Import confirmation should be transactional. Never trust client-supplied organization IDs without checking membership.

## 9 Implementation sequence and acceptance criteria

### Phase 0 Reconcile definitions and prepare the pilot

Create a Tagbilaran source register and resolve the high-impact questions: utility versus citywide tariff scope; collections period and billing basis; missing externally linked costs; complete CAPEX scope; financing and working-capital method; customer distribution; income evidence; and asset commissioning dates. Record accepted decisions in versioned methodology settings.

Prepare two separate fixtures: a **legacy reference** that documents the supplied workbook's saved values, and a **validated pilot** using the accepted definitions and corrected inputs. Matching the legacy PHP214.03 output is a traceability test, not the success criterion for a corrected tariff method. Do not make the engine reproduce a known inconsistency just to match the report.

### Phase 1 Baseline and repeatable reports

Build utility/accounts, guided forms, manual and spreadsheet/paste entry, evidence upload, indicator calculations, actions, immutable report versions and PDF/DOCX outputs. Allow a simple asset list and manual narrative. Deliver the complete loop of starting a report, saving inputs, generating a report, updating records and issuing a second version.

### Phase 2 Business and tariff planning

Add forecasts, project schedules, costs, debt cohorts, tariff simulation, cash flows and affordability when inputs are supplied. Add scenario comparison and clear links from projects to modeled service outcomes. Keep the citywide demand model optional.

### Phase 3 Assisted extraction and broader use

Add OCR/AI confirmation, reusable import mappings, more complete asset management, program-level monitoring, localization and advanced connectivity support. Measure time and corrections required for staff to generate a usable report. Expand to other utilities through configurable labels, currencies, fiscal calendars, customer classes and method settings rather than copied applications.

### Tests that demonstrate the application works

| Test | Expected result |
|---|---|
| January–June 2025 Tagbilaran operational fixture | 952,194 m³ billed and 1,385,950 m³ input over 181 days produce 5.26074 MLD, 7.65718 MLD and 31.2967% NRW. |
| Collection cutoff | January–June sums to PHP10,129,070.87; adding July gives PHP12,036,951.99. The report uses the selected period's label. |
| Current residential schedule | 10, 20 and 30 m³ produce PHP62, PHP132 and PHP212 before extra charges. Check 0, 10, 10.5, 11, 20, 21, 70 and above 70 against the approved billing convention. |
| Utility scope | Other providers' demand is excluded from TCWS billable volume unless an explicit, documented utility resale flow is present. |
| Missing and zero | Blank production yields unavailable NRW; zero remains a numeric zero. Blank future-month rows cannot become observed zero months. |
| Period alignment | Mixed January–June production and January–July billing cannot silently produce a comparable-period NRW ratio. Leap-year dates use the correct day count. |
| Aggregation | Annual totals are not added to the same months. Utility totals are not added to their component areas. NRW is a ratio of sums, not an unweighted average of monthly ratios. |
| Source disagreement | A new December connection snapshot does not overwrite a June observation. Conflicting claims remain visible until accepted or rejected. |
| Tariff recovery | Proposed block revenue is simulated against a known consumption distribution; a class-average approximation is visibly labeled. |
| Financing | Nonzero loans, simultaneous cohorts, grace periods and zero interest are tested; principal rolls forward and debt service ends at maturity. |
| Cash and accounting | Depreciation is noncash in the cash statement; principal is a cash outflow. Working capital is not deducted twice. |
| Demand feasibility | Insufficient supply produces a visible shortfall and cannot generate unconstrained sales without an explicit scenario assumption. |
| Report immutability | A baseline update changes a new draft only. The previous report and its exports remain identical and reproducible. |
| Report consistency | Every chart and narrative figure matches the frozen results; unavailable income prevents an affordability conclusion. |
| Retry and concurrency | Repeating an import request does not duplicate observations. Concurrent edits cause a resolvable version conflict. |
| Access control | Another utility cannot access sources, values, jobs or reports by guessing IDs or storage keys. |
| Deployment preservation | A schema update preserves real data and finalized reports; the development seed is never applied to live records automatically. |

Use numerical tolerances appropriate to units, such as PHP0.01 for displayed bills and tighter internal precision for ratios. Retain unrounded values until the defined presentation/billing step.

## 10 Initial instruction to Replit

> Build a multi-utility business-plan and report application for utilities with limited technical capacity. Start with Phase 1 in this specification. Use guided forms, reusable structured records, evidence attachments and immutable report versions. Users must be able to create a report, save a partial draft, update inputs, and create another report without changing prior finalized reports.
>
> Implement one shared deterministic calculation module and a provenance model that distinguishes provider, geography, dates, units, actuals, estimates, missing values and source versions. Add typed manual entry, paste/Excel import with preview and confirmation, and manual evidence upload. OCR can be added later and must propose values for user confirmation.
>
> Use PostgreSQL for data and persistent object storage for documents. Enforce organization/utility membership in every server and worker operation. Use versioned migrations and separate development seeds. Never reset production records when deploying.
>
> Seed only the clearly labeled pilot facts and test fixtures from this review. Do not copy the supplied financial workbook's tariff formulas into production without resolving the model issues in Section 3. Keep other providers' demand separate from the selected utility's billable volume. Do not substitute cash collections for billings. Do not silently treat missing months as zero.
>
> Generate report sections from one frozen report-data object, with PDF and editable DOCX exports. Include source and assumption notes, clear partial-report status, and unavailable results when required inputs are absent. Management narratives and actions remain editable and require user confirmation. Numerical calculations must not depend on an LLM.
>
> Complete the end-to-end Phase 1 workflow and its applicable acceptance tests before adding tariff forecasting, complex demand planning or AI extraction. Use the remaining sections of this file as the functional and data specification for later phases.

## Sources and review boundaries

Local evidence comes from the seven files in `Fw__Business_Plan_and_Tariff_Setting_sample.zip`, identified throughout by file number, PDF page, table, sheet and cell. Scanned totals used in the numerical examples were visually checked. The review preserves unresolved differences rather than selecting a source automatically. Missing external workbooks, underlying income/cash-flow evidence and complete editable planning sources remain limitations of the supplied package.

Current platform documentation consulted on 8 October 2026:

- [Replit Database](https://docs.replit.com/features/data-and-storage/sql-database)
- [Replit App Storage](https://docs.replit.com/features/data-and-storage/object-storage)
- [Replit development and production databases](https://docs.replit.com/features/data-and-storage/development-and-production)

For the direction of operating cost coverage, [MCC Guidance on Common Indicators, WS-10](https://www.mcc.gov/resources/doc/guidance-on-common-indicators/) defines operational revenues divided by operating costs and emphasizes documenting the treatment of maintenance and depreciation. This is used to clarify the naming conflict, not to certify the applicable Philippine tariff or regulatory methodology. The sample's references to draft standards, tariff approval, affordability thresholds and allowed returns require confirmation within the intended program before they become application defaults.
