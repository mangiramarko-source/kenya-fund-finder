import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if(!supabaseKey) throw new Error('Missing key');

const supabase = createClient(supabaseUrl, supabaseKey);

function categorize(text) {
  const lower = text.toLowerCase();
  
  if (/\b(yield|interest rate|cbk|central bank|treasury bill|t-bill|t-bonds)\b/.test(lower)) return "Yield Updates";
  if (/\b(cma|regulator|compliance|policy|law|act|parliament)\b/.test(lower)) return "Regulatory Updates";
  if (/\b(fund manager|unit trust|money market( fund)?|mmf|mutual fund|sacco|pension|ipo|rights issue)\b/.test(lower)) return "Fund Announcements";
  
  if (/\b(shilling|kes|forex|fx|foreign exchange|currency|usd\/kes|exchange rate)\b/.test(lower)) return "FX & Currency";
  
  if (/\b(fed|federal reserve|ecb|imf|world bank|wall street|s&p|nasdaq|ftse|dow jones|eurobond|brent|opec|emerging markets|global|us economy|china|europe)\b/.test(lower)) return "International";
  
  return "Market News";
}

function isRelevant(a) {
  const titleLower = a.title.toLowerCase();
  const summaryLower = (a.summary || "").toLowerCase();
  const contentLower = (a.content || "").toLowerCase();
  const text = `${titleLower} ${summaryLower} ${contentLower}`;
  const sourceLower = (a.source || "").toLowerCase();

  const kenyaKeywords = /\b(kenya|kenyan|nairobi|cbk|cma|nse|shilling|kes|safaricom|scom|kcb|equity bank|eqty|eabl|co-op bank|coop|economy|inflation|gdp|treasury|tax|investment|stock|equities|bonds|market|ruto|thugge)\b/i;
  const financialKeywords = /\b(bank|economy|market|stock|yield|fund|currency|forex|inflation|oil|gold|revenue|profit|dividend|shares|invest|investor|capital|debt|loan)\b/i;
  
  const isBroadSource = /tuko|standard|star|africa report|kbc|pd|people daily/.test(sourceLower);

  if (isBroadSource) {
    return kenyaKeywords.test(text) && financialKeywords.test(text);
  } else {
    return kenyaKeywords.test(text) || financialKeywords.test(text);
  }
}

async function run() {
  console.log("Fetching recent news...");
  const { data: articles, error } = await supabase
    .from('news_articles_public')
    .select('title, summary, source, date_published, category')
    .order('date_published', { ascending: false })
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  let passed = 0;
  let categoryCounts = { "Yield Updates": 0, "Regulatory Updates": 0, "Fund Announcements": 0, "FX & Currency": 0, "International": 0, "Market News": 0 };
  
  const relevantArticles = [];
  const rejectedArticles = [];

  for (const a of articles) {
    const relevant = isRelevant(a);
    if (relevant) {
      passed++;
      const newCat = categorize(`${a.title} ${a.summary}`);
      a.newCategory = newCat;
      categoryCounts[newCat] = (categoryCounts[newCat] || 0) + 1;
      relevantArticles.push(a);
    } else {
      rejectedArticles.push(a);
    }
  }

  console.log(`\nRelevance Filter passed ${passed} out of 100 recent articles.`);
  console.log(`Rejected ${rejectedArticles.length} articles (mainly noise).`);
  
  console.log("\nSample Rejected Articles (Top 5):");
  rejectedArticles.slice(0, 5).forEach(a => console.log(`- [${a.source}] ${a.title}`));
  
  console.log("\nNew Category Distribution (Passed articles):");
  console.log(categoryCounts);
  
  console.log("\nSample Passed Articles & New Categories (Top 10):");
  relevantArticles.slice(0, 10).forEach(a => console.log(`- [${a.newCategory}] ${a.title} (Source: ${a.source})`));

  console.log("\n--- Testing Edge Cases ---");
  console.log("1. 'Tax refund for tea factory' - MMF? ", /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|yield)\b/i.test("Tax refund for tea factory"));
  console.log("2. 'Interest rate holds steady' - Tea? ", /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture)\b/i.test("Interest rate holds steady"));
  console.log("3. 'Funded project by EU' - MMF? ", /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|yield)\b/i.test("Funded project by EU"));
  
  console.log("\n--- Checking specific NSE Company matches ---");
  const testStock = (symbol, name, title) => {
    const regex = new RegExp(`\\b(${symbol}|${name})\\b`, 'i');
    console.log(`Match '${title}' for ${symbol}? `, regex.test(title));
  }
  testStock("SCOM", "Safaricom", "Kenya ranks first globally on AI usage");
  testStock("EQTY", "Equity", "Equity in society is important"); // Will be false because "Equity" generic isn't followed by "Bank" if we don't have Bank, wait, the company name is "Equity Group Holdings" in the DB maybe?
}

run();
