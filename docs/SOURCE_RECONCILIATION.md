# Source reconciliation and unresolved questions

## Package mismatch
The supplied build brief names `REPLIT_BUILD_PROMPT.md`, `SEED_AND_LANDING_PAGE.md`, `APPLICATION_SPECIFICATION.md`, `data/tagbilaran.seed.json`, `reference/legacy-engine.mjs`, `tests/legacy.test.mjs` and an HTML prototype. Those files were **not present in the supplied ZIP**. The seven original source files and the review/framework were present. This implementation reconstructs the input fixture and arithmetic from those sources; it does not claim to preserve an unavailable original engine.

`scripts/extract-workbook.py` extracts primitive cached driver observations with cell locators. The runtime arithmetic is independent of the test-only cached outputs in `data/workbook.expected.json`. Tests demonstrate both matching outputs and response to changed inputs. The original archive and source copies are retained, outside public frontend assets.

## Pilot facts and unresolved differences
- Jan–June 2025 covers 181 days. Utility billed volume: **952,194 m³**. Utility production/system input: **1,385,950 m³**. Billed MLD 5.260740; production MLD 7.657182; NRW 31.296656%.
- **6,084** connections is an undated/June–August-conflicting snapshot, not a confirmed six-month average. The resulting 26.084649 m³/connection/month is an estimate. The **6,314** December 2025 snapshot is retained separately, never silently substituted.
- Collections Jan–June: **PHP10,129,070.87**; Jan–July: **PHP12,036,951.99**. Billings are absent. Collection efficiency and average billed tariff remain unknown. Cash/m³ is not a tariff.
- Full model initial CAPEX: **PHP579,242,798.998943**, in 2026–2029; additional investment 2035: **PHP114,056,861.657199**. The report's selected **PHP255.45m** pipelines are a different scope. A provisional 2029 commissioning year is labelled in the fixture; expenditure staging and asset acceptance are unresolved.
- External cost workbooks are missing and many workbook cells link externally. Cached planning drivers are traceable but not validated.
- Legacy water denominators combine utility, other-provider and city-wide quantities. They must not become reviewed utility defaults.
- The September 2016 residential schedule has PHP62 minimum for first 10 m³ and progressive marginal blocks; it is not a universal flat PHP6.20/m³ tariff. Legal currency and zero-consumption billing convention need confirmation.
- Legacy first/second five-year minimum charges are PHP214.027136 / PHP267.523495 for **10 m³**, not per m³. These are reconstructed comparison outputs, not recommended tariffs.

## Deliberate modelling limits
Reviewed calculations are an indicative annual cash-recovery scenario, not a validated regulatory revenue requirement or tariff-structure optimization. First-year average forecast connections are entered separately from historical snapshots. NRW, capacity and customer consumption are entered annual constants; growth and inflation are annual scalar factors. Projects have one spending/commissioning year, equal-principal independent loan cohorts, interest-only grace, and explicit grant/equity shares. Debt drawdown dates, amortization alternatives, monthly staging, tax and reserve policies require later calibration.

Historical totals always refer to the selected historical period. Unknown investment programs remain unknown until explicitly confirmed. Fixed first-year OPEX excludes optional separate volume-driven energy and bulk-water costs to prevent double counting. Depreciation is shown, not deducted again from cash. Reports are frozen to saved input and engine revisions. Affordability is not assessed without a confirmed household bill and income evidence.

The framework's full 35-page narrative and validated financial viability certification are **not** claimed. Generated reports explicitly say partial/indicative; source validation is still required.
