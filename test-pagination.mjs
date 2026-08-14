const supabaseUrl = "https://caawgzuofnujrznwbuxk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/news_articles_public?select=*&order=date_published.desc`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) throw new Error(await res.text());
  const news = await res.json();
  
  const allArticles = news;
  const categories = {
    "Stocks": (a) => !!a.related_stock_id,
    "MMFs": (a) => {
      const regex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
      return regex.test(a.title) || (a.summary && regex.test(a.summary));
    },
    "FX Rates": (a) => {
      const regex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
      return a.category === "FX & Currency" || regex.test(a.title);
    },
    "Commodities": (a) => {
      const regex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
      return regex.test(a.title);
    }
  };

  console.log(`| Tab         | Before | After | Oldest Accessible |`);
  console.log(`| ----------- | -----: | ----: | ----------------- |`);
  for (const [name, filterFn] of Object.entries(categories)) {
    const total = allArticles.filter(filterFn);
    const beforeFix = allArticles.slice(0, 60).filter(filterFn);
    
    console.log(`| ${name.padEnd(11)} | ${beforeFix.length.toString().padStart(6)} | ${total.length.toString().padStart(5)} | ${(total.length > 0 ? new Date(total[total.length-1].date_published).toISOString().split('T')[0] : 'N/A').padEnd(17)} |`);
  }
}

run().catch(console.error);
