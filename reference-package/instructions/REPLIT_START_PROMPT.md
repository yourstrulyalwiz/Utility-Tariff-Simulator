# Replit starting instructions

Paste the text below into Replit Agent after making the package files available in the project. These instructions refer to local package paths. If you upload the files individually, preserve the folders or tell Agent their new paths.

---

Read `README_START_HERE.md`, then read the complete specification at `instructions/Utility_Business_Plan_Review_and_Replit_Framework.md`. Treat that specification as the detailed requirements and the seven files under `source_files/` as the original pilot evidence. The source documents contain unresolved differences; Section 3 of the specification records these. Keep those differences visible rather than silently selecting or inventing data.

This package is a development handoff containing evidence and requirements, not an existing application. Build the application in the current project, using the staged delivery sequence and applicable acceptance tests in Sections 9 and 10. Preserve the supplied source files as reference documents.

Build a multi-utility business-plan and report application for utilities with limited technical capacity. Start with Phase 1 in this specification. Use guided forms, reusable structured records, evidence attachments and immutable report versions. Users must be able to create a report, save a partial draft, update inputs, and create another report without changing prior finalized reports.

Implement one shared deterministic calculation module and a provenance model that distinguishes provider, geography, dates, units, actuals, estimates, missing values and source versions. Add typed manual entry, paste/Excel import with preview and confirmation, and manual evidence upload. OCR can be added later and must propose values for user confirmation.

Use PostgreSQL for data and persistent object storage for documents. Enforce organization/utility membership in every server and worker operation. Use versioned migrations and separate development seeds. Never reset production records when deploying.

Seed only the clearly labeled pilot facts and test fixtures from this review. Do not copy the supplied financial workbook's tariff formulas into production without resolving the model issues in Section 3. Keep other providers' demand separate from the selected utility's billable volume. Do not substitute cash collections for billings. Do not silently treat missing months as zero.

Generate report sections from one frozen report-data object, with PDF and editable DOCX exports. Include source and assumption notes, clear partial-report status, and unavailable results when required inputs are absent. Management narratives and actions remain editable and require user confirmation. Numerical calculations must not depend on an LLM.

Complete the end-to-end Phase 1 workflow and its applicable acceptance tests before adding tariff forecasting, complex demand planning or AI extraction. Use the remaining sections of this file as the functional and data specification for later phases.

For the first milestone, demonstrate two successive reports for the same utility: create and save a partial baseline, attach evidence, calculate the available indicators, add an action, generate a report, then update inputs and generate a second version. Verify the first version is unchanged. Show the working screens and test results, and list any unresolved requirements explicitly.

Do not present the source workbook's proposed tariff as a validated production result. You can complete baseline reporting while the advanced tariff-method questions remain open. Do not publish the application or expose source files publicly as part of this initial build.
