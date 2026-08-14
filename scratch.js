import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

function isRelevant(a) {
  const titleLower = a.title.toLowerCase();
  const summaryLower = (a.summary || '').toLowerCase();
  const contentLower = (a.content || '').toLowerCase();
  const text = `${titleLower} ${summaryLower} ${contentLower}`;

  const isKenyaRelated = /\b(kenya|kenyan|nairobi|cbk|cma|nse|shilling|kes|ksh|shs?|safaricom|scom|kcb|equity bank|eqty|eabl|co-op bank|coop|ruto|thugge|epra|kra|treasury|turkana|kisumu|mombasa|kiambu|machakos|nakuru)\b/i.test(text);
  const isGlobalMacro = /\b(federal reserve|fed|ecb|brent|opec|us economy)\b/i.test(text);

  return isKenyaRelated || isGlobalMacro;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

async function run() {
  const { data: articles } = await supabase
    .from('news_articles_public')
    .select('title, summary, content, category, date_published')
    .order('date_published', { ascending: false })
    .limit(3000);

  const { data: stocks } = await supabase
    .from('stocks_public')
    .select('symbol, name');

  let stocksList = [];
  let mmfList = [];
  let fxList = [];
  let commoditiesList = [];
  let generalList = [];

  let nseTestCounts = { 'SCOM': 0, 'EQTY': 0, 'KCB': 0, 'EABL': 0, 'COOP': 0 };
  let nseMatches = [];

  const mmfRegex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|yield|interest rate)\b/i;
  const fxRegex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
  const commoditiesRegex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;

  for (const a of articles) {
    if (!isRelevant(a)) continue;

    const title = a.title;
    
    // Stocks
    let hasStock = false;
    for (const s of stocks) {
      const cleanName = s.name.replace(/Group|Holdings|Plc|Ltd|Limited/gi, '').trim();
      const brandAliases = [s.symbol, s.name];
      if (cleanName.length > 3 && cleanName.toLowerCase() !== 'kenya') brandAliases.push(cleanName);
      if (cleanName.toLowerCase() === 'equity') brandAliases.push('Equity Bank');
      if (cleanName.toLowerCase() === 'co-operative') brandAliases.push('Co-op Bank');
      if (s.symbol === 'SCOM') brandAliases.push('Safaricom');
      
      const escapedAliases = brandAliases.map(alias => escapeRegExp(alias));
      const sRegex = new RegExp(`\\b(${escapedAliases.join('|')})\\b`, 'i');
      if (sRegex.test(title)) {
        hasStock = true;
        if (['SCOM', 'EQTY', 'KCB', 'EABL', 'COOP'].includes(s.symbol) && nseTestCounts[s.symbol] < 1) {
          nseTestCounts[s.symbol]++;
          nseMatches.push(`[${s.symbol}] ${title}`);
        }
        break;
      }
    }
    if (hasStock && stocksList.length < 5) stocksList.push(title);

    // MMFs
    if (mmfRegex.test(title) && mmfList.length < 5) mmfList.push(title);
    
    // FX
    if (fxRegex.test(title) && fxList.length < 5) fxList.push(title);
    
    // Commodities
    if (commoditiesRegex.test(title) && commoditiesList.length < 5) commoditiesList.push(title);
    
    // General
    if (generalList.length < 5) generalList.push(title);
  }

  console.log('--- STOCKS (Top 5) ---');
  stocksList.forEach(t => console.log(t));

  console.log('\n--- MMFs (Top 5) ---');
  mmfList.forEach(t => console.log(t));

  console.log('\n--- FX (Top 5) ---');
  fxList.forEach(t => console.log(t));

  console.log('\n--- COMMODITIES (Top 5) ---');
  commoditiesList.forEach(t => console.log(t));

  console.log('\n--- GENERAL (Top 5) ---');
  generalList.forEach(t => console.log(t));
  
  console.log('\n--- NSE TESTS ---');
  nseMatches.forEach(t => console.log(t));
}
run();
