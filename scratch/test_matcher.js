function normalizeText(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

const companies = [
  "Bamburi Cement Ltd Ord 5.00",
  "Trans-Century Ltd Ord 0.50",
  "Kenya Power Lighting  Co Plc Ord 20.00",
  "Kenya Pipeline Company",
  "Umeme Ltd Ord 0.50",
];

const patterns = {
  BAMB: ["bamburi cement"],
  TCL: ["trans century", "trans-century"],
  KPLC: ["kenya power lighting", "kenya power"],
  KPC: ["kenya pipeline"],
};

for (const company of companies) {
  const norm = normalizeText(company);
  let matched = false;
  for (const [symbol, pats] of Object.entries(patterns)) {
    if (pats.some(p => norm.includes(normalizeText(p)))) {
      console.log(`${company} => matched ${symbol}`);
      matched = true;
    }
  }
  if (!matched) {
    console.log(`${company} => NO MATCH`);
  }
}
