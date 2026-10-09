"""Extract primitive cached drivers, never calculated tariff outputs, from pilot evidence."""
import json
import pathlib
import zipfile
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[1]
path = root / "reference-package/source_files/02 Tagbilaran Financial Model.xlsx"
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
with zipfile.ZipFile(path) as z:
    relations = {r.attrib["Id"]: r.attrib["Target"].lstrip("/") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    sheets = {}
    for sheet in ET.fromstring(z.read("xl/workbook.xml")).find("m:sheets", ns):
        target = relations[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
        target = target if target.startswith("xl/") else "xl/" + target
        cells = {}
        for c in ET.fromstring(z.read(target)).findall(".//m:c", ns):
            v = c.find("m:v", ns)
            if v is not None and v.text is not None and c.attrib.get("t") != "s":
                try:
                    cells[c.attrib["r"]] = float(v.text)
                except ValueError:
                    pass
        sheets[sheet.attrib["name"]] = cells
    a = sheets["INPUT DATA  Assumptions"]
    observations = []
    for i in range(10):
        year = 2030 + i
        col = chr(ord("D") + i)
        for metric, row, unit, scope in [
            ("legacy_connections", 4, "connections", "Workbook reference"),
            ("legacy_deep_well", 5, "m³/year", "Workbook reference"),
            ("legacy_pwsp", 6, "m³/year", "Other providers / city-wide"),
            ("legacy_bbwsp", 7, "m³/year", "City-wide net input requirement"),
        ]:
            observations.append(dict(metric=metric, value=a[col+str(row)], unit=unit, periodStart=f"{year}-01-01", periodEnd=f"{year}-12-31", quality="Estimated", source=f"02 Financial Model / INPUT DATA Assumptions!{col}{row} cached driver", scope=scope))
        price_cell = col + ("20" if i < 5 else "21")
        observations.append(dict(metric="legacy_bulk_price", value=a[price_cell], unit="PHP/m³", periodStart=f"{year}-01-01", periodEnd=f"{year}-12-31", quality="Estimated", source=f"02 Financial Model / INPUT DATA Assumptions!{price_cell}", scope="Workbook reference"))
    observations += [
        dict(metric="billedVolume", value=952194, unit="m³", periodStart="2025-01-01", periodEnd="2025-06-30", quality="Known", source="05 Connections, consumption and collections / p.7, Jan–Jun monthly totals; 03 calculations!C5", scope="Utility only"),
        dict(metric="production", value=1385950, unit="m³", periodStart="2025-01-01", periodEnd="2025-06-30", quality="Known", source="07 Production data / p.2, Jan–Jun; 03 calculations!C6", scope="Utility only"),
        dict(metric="collections", value=10129070.87, unit="PHP", periodStart="2025-01-01", periodEnd="2025-06-30", quality="Known", source="05 Collection summary / p.13, Jan–Jun only; July excluded", scope="Utility only"),
        dict(metric="connection_snapshot", value=6084, unit="connections", periodStart="2025-06-30", periodEnd="2025-06-30", quality="Estimated", source="03 summary!E15; June vs August date unresolved; snapshot used as estimate", scope="Utility only"),
        dict(metric="connection_snapshot", value=6314, unit="connections", periodStart="2025-12-31", periodEnd="2025-12-31", quality="Known", source="05 p.1 December 2025 snapshot; not substituted into June baseline", scope="Utility only"),
    ]
    seed = dict(name="Tagbilaran City Waterworks", utility="Tagbilaran City Waterworks", startYear=2030, endYear=2039, currency="PHP",
        inputs=dict(historicalStart="2025-01-01", historicalEnd="2025-06-30", connections=6084,
        production=1385950, billedVolume=952194, collections=10129070.87, billings=None,
        historicalOpex=None, households=None, servedHouseholds=None, currentTariff=None,
        connectionGrowth=None, consumption=None, targetNrw=None, capacity=None, futureOpex=None,
        inflation=a["B15"]*100, energyCost=a["B18"], bulkWaterCost=None, bulkWaterShare=None,
        openingCash=None, collectionFactor=None, chosenTariff=None, workingCapitalMonths=2,
        householdIncome=None, method="workbook_reference", objective="required_tariff",
        notes="Unvalidated workbook reference. Original protected; duplicate to edit. Reviewed utility assumptions must be entered explicitly, not copied from city-wide demand.",
        sourceNotes="Seven original source files supplied. Collections Jan–Jun 2025 are PHP10,129,070.87; Jan–Jul are PHP12,036,951.99. Billings unavailable. 6,084 connection date unresolved (June/August); December 2025 snapshot 6,314 retained separately. Current residential minimum PHP62/first 10m³ effective September 2016, not a universal PHP6.20 flat rate. Selected report projects PHP255.45m vs full model PHP579.24m. External cost workbooks and commissioning dates missing. Pilot facts are source-reported, not approved planning defaults.",
        projects=[
            dict(id="initial-investment", name="Full workbook investment, 2026–2029 (commissioning assumed 2029)", year=2029, amount=a["C10"], grantPercent=100, equityPercent=0, interestRate=5, loanTerm=30, usefulLife=25, graceYears=0, source="02 INPUT DATA Assumptions!C10; commissioning unresolved"),
            dict(id="2035-investment", name="Workbook additional investment", year=2035, amount=a["I10"], grantPercent=100, equityPercent=0, interestRate=5, loanTerm=30, usefulLife=25, graceYears=0, source="02 INPUT DATA Assumptions!I10"),
        ], observations=observations))
    out = root / "data"
    out.mkdir(exist_ok=True)
    (out / "tagbilaran.seed.json").write_text(json.dumps(seed, ensure_ascii=False, indent=2))
    # These are independent test benchmarks and are never used by the runtime engine.
    expected = {"firstFiveYearMinimum": sheets["TARIFF CALC"]["I28"], "secondFiveYearMinimum": sheets["TARIFF CALC"]["P28"],
        "annualRates": [sheets["TARIFF CALC"][c+"22"] for c in ["D","E","F","G","H","K","L","M","N","O"]]}
    (out / "workbook.expected.json").write_text(json.dumps(expected, indent=2))
    print("Extracted driver observations and separate test-only benchmarks.")
