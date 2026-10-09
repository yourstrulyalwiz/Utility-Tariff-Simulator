import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Notice, PageTitle, Shell } from "@/components/shell";

const TERMS: [string, string][] = [
  ["Non-revenue water (NRW)", "Water the utility produces but cannot bill: leaks, illegal use, meter errors and unmetered use. Lower NRW means more of your water earns money."],
  ["Collection efficiency", "The share of what you bill that you actually receive in cash."],
  ["Required tariff", "The average price per cubic metre needed in a year so that revenue covers costs, loan payments and the cash target."],
  ["Equivalent average tariff", "One system-wide average price per cubic metre that would raise the same total revenue over the period. It is not a household bill."],
  ["Grant, equity and loan", "Grants are gifts for a project. Equity is the utility's own money. The remainder of each project is borrowed and repaid with interest."],
  ["Grace period", "Years at the start of a loan when only interest is paid."],
  ["Useful life", "Years an asset is expected to work. It sets how fast the asset loses accounting value (depreciation)."],
  ["Working capital", "Cash kept on hand, expressed as months of operating cost, to pay bills while waiting for collections."],
  ["Funding gap and cash gap", "Money still missing in a year after revenue, grants, equity and loans are counted."],
  ["Unmet demand", "Water customers would use but the sources and capacity cannot supply."],
  ["Observation quality", "Known means measured or documented. Estimated means a best guess. Not available and Not applicable are kept separate from zero."],
];
const LIMITS = [
  "All calculations run on the server and are saved as immutable runs. Editing inputs never changes an earlier run.",
  "A blank input is treated as unknown, not as zero. Results may be incomplete or show warnings when inputs are missing.",
  "The reviewed method is the default. The workbook reference method reproduces a legacy spreadsheet for comparison.",
  "The legacy five-year minimum example has not been validated. Treat it as historical context only.",
  "The simulator does not design tariff structures, blocks or social tariffs, and it does not give a household bill.",
  "Results are only as good as the evidence behind the inputs. Record sources and quality for each key figure.",
  "Comparisons are only meaningful when scenarios cover the same years and use the same method.",
];

export default function Guide() {
  return (
    <Shell>
      <PageTitle title="Guide" desc="Plain-language meanings of the terms used here, and what the simulator can and cannot tell you." />
      <div className="grid gap-10 lg:grid-cols-2">
        <section><h2 className="font-display text-2xl mb-3">Glossary</h2>
          <Accordion type="multiple" className="rounded-lg border bg-card px-4">
            {TERMS.map(([t, d]) => <AccordionItem key={t} value={t}><AccordionTrigger className="text-left">{t}</AccordionTrigger><AccordionContent>{d}</AccordionContent></AccordionItem>)}
          </Accordion></section>
        <section><h2 className="font-display text-2xl mb-3">Methodology and limitations</h2>
          <div className="mb-4"><Notice tone="warn">Use results to start a conversation with your board and funders, not to publish a final tariff.</Notice></div>
          <ol className="space-y-3 list-decimal pl-5">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ol></section>
      </div>
    </Shell>
  );
}
