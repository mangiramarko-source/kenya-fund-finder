// scripts/inspect_funds_data.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const headers = {
  "apikey": SUPABASE_SECRET_KEY,
  "Content-Type": "application/json"
};

async function inspectData() {
  const fundsRes = await fetch(`${SUPABASE_URL}/rest/v1/funds?select=*`, { headers });
  const funds = await fundsRes.json();

  console.log(`Total funds: ${funds.length}`);
  const zeroYield = funds.filter(f => !f.annual_yield || f.annual_yield === 0);
  console.log(`Funds with 0 annual yield: ${zeroYield.length}`);
  const zeroDaily = funds.filter(f => !f.daily_yield || f.daily_yield === 0);
  console.log(`Funds with 0 daily yield: ${zeroDaily.length}`);
  const missingLogos = funds.filter(f => !f.logo_url);
  console.log(`Funds missing logo_url: ${missingLogos.length}`);
  const missingFactSheets = funds.filter(f => !f.fact_sheet_date);
  console.log(`Funds missing fact_sheet_date: ${missingFactSheets.length}`);

  console.log("\nSample funds zero yield or missing descriptions:");
  zeroYield.slice(0, 5).forEach(f => console.log(` - [${f.id}] ${f.name} (${f.manager}): yield=${f.annual_yield}`));
}

inspectData();
