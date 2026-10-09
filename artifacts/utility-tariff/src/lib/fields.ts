import type { SimulationValues } from "@workspace/api-client-react";

export type NumKey = {
  [K in keyof SimulationValues]-?: SimulationValues[K] extends number | null | undefined ? K : never;
}[keyof SimulationValues];

export interface NumField { key: NumKey; label: string; unit: string; help: string; step?: number }

export const SECTIONS = [
  "Utility and planning period",
  "Current customers, coverage and water volumes",
  "Current revenue, collections, tariffs and operating costs",
  "Future service targets, demand, NRW and water sources",
  "Future operating costs and efficiency improvements",
  "Investments, timing, grants, equity and loans",
  "Assumption review and simulation settings",
  "Results, comparison and reporting",
];

export const SECTION_HELP = [
  "Name the utility and choose the years you want to plan for. The forecast can cover at most 30 years.",
  "Describe who you serve today and how much water you produce and bill. Use the most recent complete year or period.",
  "Enter what the utility billed, what it actually collected, the tariff in force and what it costs to operate.",
  "Say how many more customers you expect, how much they will use, how much water you plan to lose less of, and what your sources can supply.",
  "Tell the simulator how operating costs will change, and describe actions that reduce costs or losses.",
  "List each capital project, when it is built and how it is paid for. Whatever is not grant or equity is borrowed.",
  "Check what is still missing, choose the calculation method and objective, and attach evidence.",
  "Save, calculate, read the results and create a report.",
];

export const NUM_FIELDS: Record<number, NumField[]> = {
  2: [
    { key: "connections", label: "Active service connections", unit: "connections", help: "Metered or billed connections currently served." },
    { key: "households", label: "Households in the service area", unit: "households", help: "All households, served or not." },
    { key: "servedHouseholds", label: "Households served", unit: "households", help: "Households with a utility connection or tap stand access." },
    { key: "production", label: "Water supplied to the system", unit: "cubic metres in selected period", help: "Own production plus imports delivered into this utility's system. Exclude internal transfers counted elsewhere." },
    { key: "billedVolume", label: "Water billed", unit: "cubic metres in selected period", help: "Volume customers were charged for over the same historical period, not city-wide demand." },
  ],
  3: [
    { key: "billings", label: "Total water-service billings", unit: "currency in selected period", help: "Amount invoiced to customers for water service; exclude penalties and unrelated fees." },
    { key: "collections", label: "Total water collections", unit: "currency in selected period", help: "Cash actually received from customers. Record whether older arrears are included in source notes." },
    { key: "historicalOpex", label: "Operating costs", unit: "currency in selected period", help: "Staff, power, chemicals, repairs and other running costs for the historical period." },
    { key: "currentTariff", label: "Current average tariff", unit: "currency per cubic metre", help: "Average price charged today for one cubic metre.", step: 0.01 },
    { key: "openingCash", label: "Opening cash balance", unit: "currency", help: "Cash on hand at the start of the forecast. May be negative." },
    { key: "workingCapitalMonths", label: "Working capital reserve", unit: "months of operating cost", help: "How many months of costs the utility wants to hold in cash.", step: 0.1 },
  ],
  4: [
    { key: "forecastConnections", label: "Average active connections in first forecast year", unit: "connections", help: "Enter the expected average for the first forecast year, separately from the dated historical connection count. Include partial-year connection timing in this average." },
    { key: "connectionGrowth", label: "Annual connection growth", unit: "percent per year", help: "Expected yearly increase in connections.", step: 0.1 },
    { key: "consumption", label: "Average consumption", unit: "cubic metres per connection per month", help: "Typical billed use of one connection.", step: 0.1 },
    { key: "targetNrw", label: "Forecast non-revenue water", unit: "percent of system input", help: "Share of water input that will not be billed. This annual model applies the entered percentage throughout the forecast.", step: 0.1 },
    { key: "capacity", label: "Source and treatment capacity", unit: "cubic metres per year", help: "The most water your current sources can deliver. Demand above this is reported as unmet." },
    { key: "collectionFactor", label: "Collection efficiency", unit: "percent of billings", help: "Share of future billings you expect to collect.", step: 0.1 },
  ],
  5: [
    { key: "futureOpex", label: "Base operating costs (first forecast year)", unit: "currency per year", help: "First-year fixed cash running costs. If you add the separate energy or bulk-water drivers below, exclude them here to avoid double counting." },
    { key: "inflation", label: "Cost inflation", unit: "percent per year", help: "Yearly rise in prices applied to costs.", step: 0.1 },
    { key: "energyCost", label: "Own-pumped water energy cost", unit: "currency per cubic metre", help: "Optional electricity/fuel cost per m³ of own-produced input, added to base OPEX. Workbook reference applies its booster cost to BBWSP volume.", step: 0.01 },
    { key: "bulkWaterCost", label: "Bulk water purchase cost", unit: "currency per cubic metre", help: "Price paid to a bulk supplier.", step: 0.01 },
    { key: "bulkWaterShare", label: "Share of supply bought in bulk", unit: "percent of water produced", help: "Portion of your supply purchased rather than produced.", step: 0.1 },
  ],
  7: [
    { key: "householdIncome", label: "Typical household income", unit: "currency per month", help: "Record the income source, place and price year. Affordability remains not assessed until a representative household bill is confirmed." },
  ],
};

export function numberOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
