import 'dotenv/config';

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE env vars");
    return;
  }

  const res = await fetch(`${url}/rest/v1/treasury_bill_auctions?issue_number=in.(2695/091,2669/182,2624/364)&select=id,issue_number,tenor_days,auction_date,issue_date,source_url`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  
  if (!res.ok) {
    console.error(`HTTP Error: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    return;
  }
  
  console.log(JSON.stringify(await res.json(), null, 2));
}

main();
