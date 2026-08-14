import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: allNews, error } = await supabase.from('news_articles_public').select('*').order('date_published', { ascending: false }).limit(200);
  if (error) console.error(error);

  const categories = ['Stocks', 'MMFs', 'FX', 'Commodities', 'General'];
  const results = {
    Stocks: [], MMFs: [], FX: [], Commodities: [], General: []
  };

  const isInternationalArticle = (item) => {
    return item?.category === "International" || (item?.source || "").toLowerCase().includes("bbc") || (item?.source || "").toLowerCase().includes("reuters") || (item?.source || "").toLowerCase().includes("bloomberg") || (item?.source || "").toLowerCase().includes("cnbc");
  };

  for (const a of allNews || []) {
    const title = (a.title || "").toLowerCase();
    
    // Evaluate filters
    const isStock = !!a.related_stock_id;
    const isMmf = a.category === "Yield Updates" || a.category === "Fund Announcements" || title.includes("fund") || title.includes("unit trust") || title.includes("yield");
    const isFx = a.category === "International" || title.includes("shilling") || title.includes("dollar") || title.includes("forex") || title.includes("currency") || title.includes("eurobond");
    const isCommodity = title.includes("oil") || title.includes("gold") || title.includes("tea") || title.includes("coffee") || title.includes("agriculture");
    const isIntl = isInternationalArticle(a);
    const isGen = !isStock && !isMmf && !isFx && !isCommodity && !isIntl;
    
    const pushIfRoom = (cat, reason) => {
      if (results[cat].length < 5) {
        results[cat].push({ title: a.title, date_published: a.date_published, source: a.source, reason });
      }
    };

    if (isStock) pushIfRoom('Stocks', 'related_stock_id exists');
    if (isMmf) pushIfRoom('MMFs', `Matches MMF rules (cat: ${a.category}, title: ${title})`);
    if (isFx) pushIfRoom('FX', `Matches FX rules (cat: ${a.category}, title: ${title})`);
    if (isCommodity) pushIfRoom('Commodities', `Matches Commodities rules (title: ${title})`);
    if (isGen) pushIfRoom('General', `Matches no specific rules`);
  }

  console.log(JSON.stringify(results, null, 2));
}

run();
