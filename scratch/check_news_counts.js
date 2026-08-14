const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lftxovmsomvrmgmyxugb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.log("No supabase key found. Can't run script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('news').select('title, category, summary');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Total articles:", data.length);
  
  const stocks = data.filter(a => a.category === 'Stocks' || a.category === 'Equities' || a.category === 'Company News');
  console.log("Stocks (by category):", stocks.length);
  
  const mmfRegex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
  const mmfs = data.filter(a => mmfRegex.test(a.title) || (a.summary && mmfRegex.test(a.summary)));
  console.log("MMFs (by regex):", mmfs.length);

  const fxRegex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
  const fx = data.filter(a => a.category === "FX & Currency" || fxRegex.test(a.title));
  console.log("FX (by regex/cat):", fx.length);

  const commoditiesRegex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
  const commodities = data.filter(a => commoditiesRegex.test(a.title));
  console.log("Commodities (by regex):", commodities.length);
  
  // also let's just log some categories
  const cats = {};
  data.forEach(a => {
    cats[a.category] = (cats[a.category] || 0) + 1;
  });
  console.log("Categories breakdown:", cats);
}

check();
