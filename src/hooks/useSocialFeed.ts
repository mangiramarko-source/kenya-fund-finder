import { useMemo } from "react";
import { type NewsFromDB, type FundFromDB } from "@/lib/api";
import { type Stock, type ExchangeRate } from "@/components/home/MarketTicker";

export type FeedItemType = "NEWS" | "STOCK_INSIGHT" | "FUND_MILESTONE" | "FX_ALERT" | "EDUCATION";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  authorName: string;
  authorLabel: string;
  authorAvatar?: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "chart_stock" | "metric_callout" | "video";
  metricValue?: string;
  metricLabel?: string;
  timestamp: Date; 
  likes: number;
  comments: number;
  url?: string;
  rawItem?: any;
  relatedSymbols?: string[];
}

function getHashNumber(id: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const range = max - min + 1;
  return min + (Math.abs(hash) % range);
}

function getPastTime(minutesAgo: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const safeNum = (val: any) => {
  if (val == null) return 0;
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

export function useSocialFeed(
  news: NewsFromDB[],
  stocks: Stock[],
  funds: FundFromDB[],
  fxRates: ExchangeRate[],
  commodities: any[] = []
) {
  return useMemo(() => {
    const feed: FeedItem[] = [];

    // 1. Process News Articles with real summaries
    (news || []).forEach((n: any) => {
      const newsDate = n.date_published ? new Date(n.date_published) : new Date();
      const finalContent = n.summary || n.content || "";
      
      const knownSymbols = ["SCOM", "EQTY", "KCB", "EABL", "BAT", "COOP", "NCBA", "USD/KES", "EUR/KES", "GBP/KES", "Oil", "Gold"];
      const relatedSymbols: string[] = [];
      const contentUpper = finalContent.toUpperCase();
      const titleUpper = (n.title || "").toUpperCase();
      knownSymbols.forEach(sym => {
        if (titleUpper.includes(sym.toUpperCase()) || contentUpper.includes(sym.toUpperCase())) {
          relatedSymbols.push(sym);
        }
      });
      
      feed.push({
        id: `news-${n.id}`,
        type: "NEWS",
        authorName: n.source || "Market News",
        authorLabel: n.category || "News",
        title: n.title,
        content: finalContent,
        mediaUrl: n.image_url || undefined,
        mediaType: n.image_url ? "image" : undefined,
        timestamp: newsDate,
        likes: n.likes || 0,
        comments: n.comments || 0,
        url: n.url,
        rawItem: n,
        relatedSymbols: relatedSymbols.length > 0 ? relatedSymbols : undefined,
      });
    });

    // 2. Generate Unified Daily Market Summary
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const summaryTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0);
    const academyTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0);

    if (stocks.length > 0 || fxRates.length > 0 || commodities.length > 0) {
      const topGainers = [...stocks].sort((a, b) => safeNum(b.day_change_percent) - safeNum(a.day_change_percent)).slice(0, 3);
      const topLosers = [...stocks].sort((a, b) => safeNum(a.day_change_percent) - safeNum(b.day_change_percent)).slice(0, 3);
      
      const usd = fxRates.find(r => r.currency_code === "USD");
      const gbp = fxRates.find(r => r.currency_code === "GBP");
      const eur = fxRates.find(r => r.currency_code === "EUR");

      const gold = commodities.find(c => c.name.toLowerCase().includes("gold"));
      const oil = commodities.find(c => c.name.toLowerCase().includes("crude") || c.name.toLowerCase().includes("oil"));

      const pickStable = (arr: string[], seedOffset: number) => arr[(dateSeed + seedOffset) % arr.length];

      // 1. Dynamic Stock Intro
      let stockPara = pickStable([
        "The market saw relatively quiet trading today.",
        "It was an interesting day for equities.",
        "Trading activity was steady across the board."
      ], 1);

      if (topGainers.length > 0 && topLosers.length > 0) {
        const topGainer = topGainers[0];
        const secondGainer = topGainers[1];
        const topLoser = topLosers[0];
        
        const intro = pickStable([
          "The market saw mixed signals today.",
          "Investors navigated a dynamic session today.",
          "Equities showed varied performance across major sectors."
        ], 2);
        
        const surge = pickStable(["surged by", "climbed", "jumped", "advanced by"], 3);
        const follow = pickStable(["followed suit with solid gains", "also posted strong numbers", "wasn't far behind"], 4);
        const hit = pickStable(["took the biggest hit, sliding", "faced downward pressure, dropping", "retreated by"], 5);

        stockPara = `${intro} **${topGainer.name}** ${surge} **+${safeNum(topGainer.day_change_percent).toFixed(2)}%**, leading the pack`;
        if (secondGainer) {
           stockPara += `, while **${secondGainer.name}** wasn't far behind.`;
        }
        stockPara += `. On the flip side, **${topLoser.name}** ${hit} **${Math.abs(safeNum(topLoser.day_change_percent)).toFixed(2)}%**, pulling back recent momentum.`;
      } else if (topGainers.length > 0) {
         stockPara = `Buyers dominated the floor today! **${topGainers[0].name}** climbed **+${safeNum(topGainers[0].day_change_percent).toFixed(2)}%**, lifting overall investor sentiment.`;
      } else if (topLosers.length > 0) {
         stockPara = `It was a tough session for equities. **${topLosers[0].name}** dropped by **${Math.abs(safeNum(topLosers[0].day_change_percent)).toFixed(2)}%**, weighing heavily on the broader indices.`;
      }

      // 2. Dynamic FX
      let fxPara = "💱 **Currency Watch:** The Kenyan Shilling remains steady.";
      const fxIntro = pickStable(["💱 **Currency Watch:**", "💵 **FX Markets:**", "🌍 **Global Exchange:**"], 6);
      
      if (usd) {
        fxPara = `${fxIntro} The **US Dollar** is exchanging at **KES ${Number(usd.rate || 0).toFixed(2)}**, `;
        if (Number(usd.rate) > 135) fxPara += `putting some pressure on importers, `;
        else fxPara += `helping ease the pressure on fuel imports, `;
        
        if (eur && gbp) {
           fxPara += `while the **Euro** and **Pound** are trading at **${Number(eur.rate || 0).toFixed(2)}** and **${Number(gbp.rate || 0).toFixed(2)}** respectively.`;
        } else {
           fxPara += `keeping the broader macro environment stable.`;
        }
      }

      // 3. Dynamic Commodities
      let cmdPara = "";
      const cmdIntro = pickStable(["🛢️ **Commodities & Resources:**", "📦 **Resource Markets:**", "📊 **Raw Materials:**"], 7);
      
      if (oil && gold) {
        cmdPara = `${cmdIntro} **Oil** is holding at **$${Number(oil.price).toFixed(2)}** per barrel, keeping pump prices stable. Meanwhile, **Gold** is trading at **$${Number(gold.price).toLocaleString()}**, signaling that global investors are monitoring the macroeconomic landscape. Locally, **Tea** and **Coffee** remain vital pillars for the country's export revenues.`;
      } else if (oil) {
        cmdPara = `${cmdIntro} **Oil** is trading at **$${Number(oil.price).toFixed(2)}** per barrel, a key metric for transport and manufacturing costs.`;
      } else if (gold) {
        cmdPara = `🥇 **Commodities & Resources:** **Gold** is trading at **$${Number(gold.price).toLocaleString()}**, as investors balance risk and safety.`;
      }

      // 4. Dynamic News hook
      let newsPara = "📰 **In the News:** Safaricom and banking sectors continue to attract high volumes.";
      if (news && news.length > 0) {
         const headlineIntro = pickStable(["is driving headlines today", "caught the market's attention", "is today's major talking point"], 8);
         newsPara = `📰 **In the News:** *${news[0].title}* ${headlineIntro}, keeping investors on their toes.`;
      }
      
      const conclusion = pickStable([
        "Overall, the Kenyan market is in a healthy position, but investors are keeping a close eye on global events.",
        "That wraps up today's key movements as traders look ahead to tomorrow's session.",
        "Markets continue to react to macroeconomic shifts, leaving plenty of opportunities on the table."
      ], 9);

      const markdownContent = `### 🇰🇪 Daily Market Brief

${stockPara}

${fxPara}

${cmdPara}

${newsPara}

*${conclusion}*`;

      feed.push({
        id: "daily-market-summary",
        type: "STOCK_INSIGHT",
        authorName: "Market Insights",
        authorLabel: "Daily Brief",
        title: "Today's Market Wrap-up",
        content: markdownContent,
        timestamp: summaryTimestamp, 
        likes: 0,
        comments: 0,
        rawItem: null,
      });
    }

    // 3. Generate Educational Snack
    const educationalTips = [
      { 
        title: "Dividend Yield", 
        content: "Think of a dividend yield like the interest a bank pays you for keeping money in a savings account, but for stocks. It is a simple percentage that shows how much cash a company pays out to its shareholders each year compared to the price of its stock. For example, if a stock costs $100 and pays $5 a year in dividends, the dividend yield is 5%. It is a useful number for investors who want to earn regular income from their investments." 
      },
      { 
        title: "Bear vs Bull Market", 
        content: "These terms describe the overall mood of the stock market. A 'Bull' market is when prices are generally going up, and people are feeling confident about the economy. A 'Bear' market is the opposite—prices are falling, and people are more cautious. An easy way to remember this is by how the animals attack: a bull thrusts its horns up into the air, while a bear swipes its paws down." 
      },
      { 
        title: "P/E Ratio", 
        content: "The Price-to-Earnings (P/E) ratio is a tool used to figure out if a stock is expensive or cheap. It compares the price of a single share of stock to the profit (earnings) the company makes per share. If a stock costs $50 and the company makes $5 per share, the P/E ratio is 10. A high P/E might mean people expect the company to grow a lot in the future, while a low P/E might mean it is currently undervalued by the market." 
      },
      { 
        title: "Compound Interest", 
        content: "Compound interest is when you earn interest not only on the money you originally saved, but also on the interest you've already earned. Imagine a snowball rolling down a hill, getting bigger and bigger as it picks up more snow. Over a long period of time, compound interest allows your savings to grow much faster than if you were only earning interest on your original starting amount." 
      },
      { 
        title: "Diversification", 
        content: "Diversification is the financial version of the saying 'don't put all your eggs in one basket.' It means spreading your investments across many different areas—like buying stocks from different industries, or mixing stocks with bonds. Because different types of investments react differently to what's happening in the economy, this strategy helps protect your overall portfolio if one specific area suddenly drops in value." 
      },
      { 
        title: "Liquidity", 
        content: "Liquidity simply means how quickly and easily you can turn an asset into cold, hard cash without having to sell it at a huge discount. Cash in your wallet is perfectly liquid. Stocks are usually very liquid because you can sell them almost instantly on the market. On the other hand, a house is very illiquid, because it can take months of work to find a buyer and actually get the cash in your hands." 
      },
      { 
        title: "Bonds vs Stocks", 
        content: "When you buy a stock, you are buying a tiny slice of ownership in a company. If the company does well, your piece becomes more valuable. When you buy a bond, you are not buying ownership; instead, you are lending your money to a company or government for a set amount of time. In return, they promise to pay you back with regular interest payments. Stocks generally offer higher potential rewards, while bonds offer more predictability." 
      },
      { 
        title: "Inflation", 
        content: "Inflation is the invisible force that makes things more expensive over time. It is the rate at which the general prices for goods and services go up. For example, if inflation is at 3%, a basket of groceries that costs $100 today will cost $103 next year. Because things cost more, the actual purchasing power of your money goes down, which is why keeping cash under a mattress usually loses value over decades." 
      }
    ];
    const tipIndex = dateSeed % educationalTips.length;
    const todayTip = educationalTips[tipIndex];

    feed.push({
      id: `edu-snack-${dateSeed}`,
      type: "EDUCATION",
      authorName: "KenyaFundFinder Academy",
      authorLabel: "Daily Tip",
      title: `💡 Term of the Day: ${todayTip.title}`,
      content: todayTip.content,
      timestamp: academyTimestamp, 
      likes: 0,
      comments: 0,
      rawItem: null,
    });

    return feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [news, stocks, funds, fxRates, commodities]);
}
