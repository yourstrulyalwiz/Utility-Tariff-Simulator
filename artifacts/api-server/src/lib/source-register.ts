export const sources = [
  {id:"01",name:"01 Tagbilaran City Preliminary Business Plan .pdf",role:"Report structure, workshop decisions, selected investments",locator:"35 pages; baseline pp.5–9, tariffs p.25, city-wide demand p.29"},
  {id:"02",name:"02 Tagbilaran Financial Model.xlsx",role:"Unvalidated workbook-reference driver observations",locator:"INPUT DATA Assumptions, OPEX, TARIFF CALC; external links unresolved"},
  {id:"03",name:"03 Tagbilaran WSP data_summarized.xlsx",role:"Provider-specific operational summaries",locator:"Tagbilaran summary; calculations!C5,C6; utility boundaries must be selected"},
  {id:"04",name:"04 Tagbilaran City filled-up questionnaire.pdf",role:"Partial profile, staffing and financial evidence",locator:"9 scanned pages; blank billings and other missing fields preserved"},
  {id:"05",name:"05 Tagbilaran City Waterworks WSC BV and collection data.pdf",role:"Connections, billed volume and cash collections",locator:"p.7 Jan–Jun volume; p.13 Jan–Jul collections; period distinction preserved"},
  {id:"06",name:"06 Tagbilaran City Waterworks Water Rates.jpg",role:"Residential/institutional block schedule and commercial rate",locator:"Effective September 2016; legal currency unconfirmed; PHP62 minimum for first 10m³"},
  {id:"07",name:"07 Tagbilaran City Waterworks production data.pdf",role:"Water-input observations and pumping profiles",locator:"p.2 Jan–Jun 2025 production; missing future months are not zero"},
].map(s=>({...s,available:true,url:`/api/sources/${s.id}/download`}));
