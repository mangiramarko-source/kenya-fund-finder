const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const brandAliases = [
  { name: "Safaricom", symbol: "SCOM" },
  { name: "Equity Bank", symbol: "EQTY" },
  { name: "Equity Group", symbol: "EQTY" },
  { name: "KCB", symbol: "KCB" },
  { name: "KCB Group", symbol: "KCB" },
  { name: "EABL", symbol: "EABL" },
  { name: "East African Breweries", symbol: "EABL" },
  { name: "Co-op Bank", symbol: "COOP" },
  { name: "Co-operative Bank", symbol: "COOP" },
  { name: "NCBA", symbol: "NCBA" },
  { name: "Absa Bank", symbol: "ABSA" },
  { name: "Absa Kenya", symbol: "ABSA" },
  { name: "Standard Chartered", symbol: "SCBK" },
  { name: "Stanchart", symbol: "SCBK" },
  { name: "Stanbic", symbol: "SBIC" },
  { name: "I&M", symbol: "IMH" },
  { name: "Diamond Trust Bank", symbol: "DTK" },
  { name: "DTB", symbol: "DTK" },
  { name: "Bamburi", symbol: "BAMB" },
  { name: "KenGen", symbol: "KEGN" },
  { name: "Kenya Power", symbol: "KPLC" },
  { name: "KPLC", symbol: "KPLC" },
  { name: "BAT Kenya", symbol: "BAT" },
  { name: "Kakuzi", symbol: "KUKZ" },
  { name: "Sasini", symbol: "SASN" },
  { name: "Nation Media", symbol: "NMG" },
  { name: "NMG", symbol: "NMG" },
  { name: "Jubilee Holdings", symbol: "JUB" },
  { name: "Britam", symbol: "BRIT" },
  { name: "CIC Insurance", symbol: "CIC" },
  { name: "Liberty Kenya", symbol: "LBTY" },
  { name: "Sanlam Kenya", symbol: "SLAM" },
  { name: "Centum", symbol: "CTUM" },
  { name: "TPS Eastern Africa", symbol: "TPSE" },
  { name: "Serena", symbol: "TPSE" },
  { name: "Umeme", symbol: "UMME" },
  { name: "TotalEnergies", symbol: "TOTL" },
  { name: "Total Kenya", symbol: "TOTL" },
  { name: "Crown Paints", symbol: "CRWN" },
  { name: "BOC Kenya", symbol: "BOC" },
  { name: "Carbacid", symbol: "CARB" },
  { name: "WPP Scangroup", symbol: "SCAN" },
  { name: "Longhorn", symbol: "LKL" },
  { name: "Uchumi", symbol: "UCHM" },
  { name: "Express Kenya", symbol: "XPRS" },
  { name: "Kenya Airways", symbol: "KQ" },
  { name: "Eveready", symbol: "EVRD" },
  { name: "Sameer", symbol: "FIRE" },
  { name: "Flame Tree", symbol: "FTGH" },
  { name: "Home Afrika", symbol: "HAFR" },
  { name: "Kurwitu", symbol: "KURV" },
  { name: "Nairobi Business Ventures", symbol: "NBV" },
  { name: "Olympia", symbol: "OLYM" },
  { name: "Trans-Century", symbol: "TCL" },
  { name: "Bourse Africa", symbol: "BOURSE" },
  { name: "Stanlib Fahari", symbol: "FAHR" },
  { name: "Ilam Fahari", symbol: "FAHR" }
];

async function check() {
  const { data: allItems, error } = await supabase
    .from('news_articles_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1500); // Fetch a lot so we can find 5 for each category even with strict rules
    
  if (error) {
    console.error(error);
    return;
  }

  const mmfRegex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
  const fxRegex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
  const commodityRegex = /\b(gold|oil|brent|crude|coffee|tea|agriculture|copper|wheat|maize|sugar)\b/i;

  const categories = {
    Stocks: [],
    MMFs: [],
    FX: [],
    Commodities: [],
    General: []
  };

  for (const a of allItems) {
    const title = a.title || "";
    const summary = a.summary || "";
    
    // Evaluate Stocks
    let relatedStock = null;
    for (const brand of brandAliases) {
      const regex = new RegExp(`\\b${brand.name.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")}\\b`, 'i');
      if (regex.test(title) || regex.test(summary)) {
        relatedStock = brand;
        break;
      }
    }

    if (categories.Stocks.length < 5 && relatedStock) {
      categories.Stocks.push(a);
      continue;
    }

    // Evaluate MMFs
    if (categories.MMFs.length < 5 && (mmfRegex.test(title) || mmfRegex.test(summary))) {
      categories.MMFs.push(a);
      continue;
    }

    // Evaluate FX
    if (categories.FX.length < 5 && (fxRegex.test(title) || fxRegex.test(summary))) {
      categories.FX.push(a);
      continue;
    }

    // Evaluate Commodities
    if (categories.Commodities.length < 5 && (commodityRegex.test(title) || commodityRegex.test(summary))) {
      categories.Commodities.push(a);
      continue;
    }

    // Evaluate General
    if (categories.General.length < 5 && a.category !== 'Company News' && a.category !== 'Fund Announcements' && a.category !== 'Commodities' && a.category !== 'Global Macro') {
       categories.General.push(a);
    }
  }

  for (const [cat, items] of Object.entries(categories)) {
    console.log(`\n=== ${cat} (${items.length}/5) ===`);
    items.forEach(a => {
      console.log(`Title: ${a.title}\nDate: ${a.created_at}\nSource: ${a.source}\nReason: matched ${cat} rules\n`);
    });
  }
}
check();
