# Utility Business Plan Replit Package

Integrated source files and implementation instructions

Prepared for Billy Hoo on 8 October 2026.

## Start here

This package contains the seven original Tagbilaran files, the completed review and application specification, and a ready-to-paste Replit starting prompt. It is a development handoff, not a built application. The source files and full review are unchanged from the supplied package and preceding review, respectively.

1. Extract the ZIP before opening the files. Keep the folder structure together so the links work.
2. Read [the review and framework](instructions/Utility_Business_Plan_Review_and_Replit_Framework.md). Sections 1–3 explain the evidence and model issues; Sections 4–7 define inputs, records, calculations and reports; Sections 8–10 give the programming framework and delivery tests.
3. Make the extracted contents available in your Replit project. If your upload route does not unpack a ZIP, upload the extracted files while preserving their folders.
4. Open [the Replit starting prompt](instructions/REPLIT_START_PROMPT.md), copy the instruction text after the divider, and give it to Replit Agent.
5. Start with baseline data entry and repeatable reports. Add financial and tariff planning after resolving its model assumptions. The original example figures are evidence, not automatically approved application defaults.

## Package contents

| Location | Purpose |
|---|---|
| `README_START_HERE.md` | Entry point and source-file map |
| `instructions/Utility_Business_Plan_Review_and_Replit_Framework.md` | Complete review, source relationships, input workflow, data model, calculation rules, implementation phases and acceptance tests |
| `instructions/REPLIT_START_PROMPT.md` | Initial programming instruction referencing the complete specification and source files |
| `source_files/` | All seven original files, with original filenames and unchanged contents |
| `SHA256SUMS.txt` | File checksums for integrity verification |

## Source files and their roles

| File | Use in the application design |
|---|---|
| [01 Tagbilaran City Preliminary Business Plan .pdf](source_files/01%20Tagbilaran%20City%20Preliminary%20Business%20Plan%20.pdf) | Reference report structure, narrative, workshop decisions and output tables. |
| [02 Tagbilaran Financial Model.xlsx](source_files/02%20Tagbilaran%20Financial%20Model.xlsx) | Reference financial calculations and saved outputs; reconcile the issues in specification Section 3 before implementation. |
| [03 Tagbilaran WSP data_summarized.xlsx](source_files/03%20Tagbilaran%20WSP%20data_summarized.xlsx) | Prepared utility summaries and indicator calculations; select the intended utility and geography explicitly. |
| [04 Tagbilaran City filled-up questionnaire.pdf](source_files/04%20Tagbilaran%20City%20filled-up%20questionnaire.pdf) | Partially completed questionnaire; evidence for profile, service, finance and staffing inputs. |
| [05 Tagbilaran City Waterworks WSC BV and collection data.pdf](source_files/05%20Tagbilaran%20City%20Waterworks%20WSC%20BV%20and%20collection%20data.pdf) | Connection snapshots, consumption and cash-collection records; retain dates and definitions. |
| [06 Tagbilaran City Waterworks Water Rates.jpg](source_files/06%20Tagbilaran%20City%20Waterworks%20Water%20Rates.jpg) | Photographed tariff schedule; minimum charges and marginal block rates. |
| [07 Tagbilaran City Waterworks production data.pdf](source_files/07%20Tagbilaran%20City%20Waterworks%20production%20data.pdf) | Production records, meter readings and pumping-station profiles. |

The existing process combines utility records and interviews, manual data preparation, financial assumptions and workshop decisions into a report. The application should store these inputs once and reuse them across indicators, forecasts and report versions. Facts, calculations and management decisions need separate records.

## First working milestone

Deliver guided input screens, evidence attachments, a reusable utility database, basic indicator calculations, actions and report generation. A user must be able to create a partial report, update inputs, and create another report while retaining the first report's original inputs and results. Allow useful partial reports when optional or advanced data are missing.

## Decisions required for tariff planning

Section 3 of the full specification documents the source references and required follow-up. In particular:

- Reconcile TCWS billable volume with citywide and other-provider demand before adopting the tariff denominator.
- Distinguish cash collections from money billed and confirm each reporting period.
- Resolve the financial workbook's external references and hardcoded transfers.
- Reconcile selected project costs in the report with the full investment amount in the model.
- Confirm the working-capital, depreciation, financing and tariff-recovery methods, and provide evidence before stating affordability or financial viability.

These decisions affect advanced calculations. They do not prevent development of the baseline, evidence and report-version workflows.

## Maintaining this package

The full framework is the authoritative detailed specification within this package. The README and starter prompt are navigation and execution aids. Record later methodological decisions as explicit specification changes, and version the application calculation engine when those decisions affect results. Preserve source evidence and previously issued reports.

The spreadsheet and PDF files are original reference materials. They have not been repaired or recalculated for this package. No runnable application, credentials, temporary OCR files or internal analysis scripts are included.
