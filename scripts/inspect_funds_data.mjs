// scripts/inspect_funds_data.mjs
const SUPABASE_URL = "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMyMjQ4NiwiZXhwIjoyMDkxODk4NDg2fQ.RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE";

const headers = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
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
