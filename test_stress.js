const rejectList = [
  "US bank announces new CEO",
  "Nigeria capital market reforms announced",
  "European loan demand rises",
  "Hollywood star launches investment fund",
  "South African stocks rally",
  "World Bank funds project in Uganda",
  "Celebrity receives tax refund"
];

const acceptList = [
  "Kenyan shilling strengthens against US dollar",
  "Safaricom reports profit jump",
  "CBK raises base lending rate",
  "New unit trust launched in Nairobi",
  "Global oil prices surge amid tensions"
];

function isKenyaRelated(text) {
  const isKenyanEntity = /\b(cbk|cma|nse|safaricom|scom|kcb|equity bank|eqty|eabl|co-op bank|coop|epra|kra|treasury|nairobi securities exchange|capital markets authority|central bank of kenya)\b/i.test(text);
  const mentionsKenya = /\b(kenya|kenyan|nairobi|shilling|kes|ksh|shs?)\b/i.test(text);
  const mentionsFinance = /\b(stock|equity|shares|dividend|earnings|profit|loss|revenue|tax|bond|yield|interest rate|inflation|cpi|gdp|economy|fund|mmf|unit trust|investment|investor|market|trade|export|import|price|commodity|gold|oil|agriculture|budget|deficit|debt|loan|mortgage|bank|banking)\b/i.test(text);
  const isKenyanFinance = mentionsKenya && mentionsFinance;
  const isGlobalMacro = /\b(federal reserve|fed|ecb|brent|opec|us economy|global oil|global inflation)\b/i.test(text);
  
  return isKenyanEntity || isKenyanFinance || isGlobalMacro;
}

console.log("=== MUST REJECT ===");
rejectList.forEach(t => {
  const text = t.toLowerCase();
  console.log(`${isKenyaRelated(text) ? 'FAIL' : 'PASS'} - ${t}`);
});

console.log("\n=== MUST ACCEPT ===");
acceptList.forEach(t => {
  const text = t.toLowerCase();
  console.log(`${isKenyaRelated(text) ? 'PASS' : 'FAIL'} - ${t}`);
});
