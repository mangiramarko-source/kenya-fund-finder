import { escapeHtml } from "./communications.ts";

export interface MarketBriefMover { ticker: string; company: string; price: string; changePercent: number; sevenDayChange?: number; note?: string; }
export interface MarketBriefMoverGroup { label: string; items: MarketBriefMover[]; }
export interface MarketBriefFx { pair: string; rate: string; change: string; }
export interface MarketBriefNewsItem { category: string; headline: string; summary: string; url: string; }
export interface MarketBriefUpdate { company: string; title: string; description: string; }
export interface MarketBriefWatchItem { title: string; detail: string; }
export interface MarketBriefDiscoveryAction { label: string; url: string; }
export interface MarketBriefEmailData {
  date: string; demo: boolean; theme?: "light" | "dark"; firstName?: string; marketHeadline: string; readTime?: string;
  breadth: { gainers: number; losers: number; unchanged: number; today?: string; sevenDay?: string };
  usdKes: { rate: string; change: string }; summary: string; movers?: MarketBriefMover[]; moverGroups?: MarketBriefMoverGroup[]; currencies?: MarketBriefFx[];
  importantUpdates?: MarketBriefUpdate[]; watchlist?: MarketBriefMover[]; watchItems?: MarketBriefWatchItem[];
  news?: MarketBriefNewsItem[]; discoveryActions?: MarketBriefDiscoveryAction[]; ctaUrl: string; watchlistUrl?: string;
}
export interface RenderedMarketBriefEmail { subject: string; html: string; text: string; }

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const DARK_MARKET_BRIEF_HERO_URL = "https://kenyafundfinder.com/market-brief-hero.png";
const DARK_MARKET_BRIEF_HERO_ALT = "KenyaFundFinder — What to watch in Kenyan markets";
const tone = (value: number | string) => String(value).trim().startsWith("-") || String(value).trim().startsWith("−") ? "#c84545" : "#17734c";
const title = (value: string) => `<tr><td style="padding:31px 20px 11px;font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:31px;font-weight:700;letter-spacing:-.4px;color:#202938">${escapeHtml(value)}</td></tr>`;
const panel = (content: string, padding = "18px") => `<tr><td style="padding:0 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e6e2d8;border-radius:15px"><tr><td style="padding:${padding}">${content}</td></tr></table></td></tr>`;
const row = (label: string, main: string, sub?: string, color?: string) => `<tr><td style="padding:12px 0;border-bottom:1px solid #ece9e1;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;color:#263141">${escapeHtml(label)}</td><td align="right" style="padding:12px 0;border-bottom:1px solid #ece9e1;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:${color ?? "#202938"}">${escapeHtml(main)}${sub ? `<span style="padding-left:9px;font-size:12px;font-weight:400;color:#7b8490">${escapeHtml(sub)}</span>` : ""}</td></tr>`;
const mover = (item: MarketBriefMover) => `<tr><td style="padding:13px 0;border-bottom:1px solid #ece9e1"><div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:#202938">${escapeHtml(item.ticker)}</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#697483">${escapeHtml(item.company)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</div></td><td align="right" style="padding:13px 0;border-bottom:1px solid #ece9e1"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#202938">${escapeHtml(item.price)}</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:700;color:${tone(item.changePercent)}">${pct(item.changePercent)}${item.sevenDayChange === undefined ? "" : `<span style="font-size:11px;font-weight:400;color:#7b8490"> · 7D ${pct(item.sevenDayChange)}</span>`}</div></td></tr>`;

function movers(items?: MarketBriefMover[], groups?: MarketBriefMoverGroup[]) {
  const explicitGroups = groups?.filter((group) => group.items.length) ?? [];
  const inferredGroups = items && items.length >= 10
    ? [
        { label: "Top gainers · sample", items: items.filter((item) => item.changePercent >= 0) },
        { label: "Top losers · sample", items: items.filter((item) => item.changePercent < 0) },
      ].filter((group) => group.items.length)
    : [];
  const grouped = explicitGroups.length ? explicitGroups : inferredGroups;
  if (!items?.length && !grouped.length) return "";
  const body = grouped.length
    ? grouped.map((group, index) => `<div style="${index ? "padding-top:18px;" : ""}padding-bottom:8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1px;color:${group.label.toLowerCase().includes("loser") ? "#c84545" : "#17734c"}">${escapeHtml(group.label)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${group.items.map(mover).join("")}</table>`).join("")
    : `<div style="padding-bottom:8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1px;color:#6e7885">PRICE · TODAY · 7D</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items?.map(mover).join("")}</table>`;
  return `${title("Biggest movers")}${panel(body)}`;
}
function currencies(items?: MarketBriefFx[]) { return !items?.length ? "" : `${title("Kenyan Shilling")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items.map((item) => row(item.pair, item.rate, item.change, tone(item.change))).join("")}</table>`)}`; }
function updates(items?: MarketBriefUpdate[]) { const content = !items?.length ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#697483">No important company updates today.</div>` : items.map((item, i) => `<div style="${i ? "padding-top:15px;margin-top:15px;border-top:1px solid #ece9e1;" : ""}"><div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:21px;font-weight:700;color:#202938">${escapeHtml(item.company)}</div><div style="padding-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#3d4a5a">${escapeHtml(item.title)}</div><div style="padding-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#697483">${escapeHtml(item.description)}</div></div>`).join(""); return `${title("Important updates")}<tr><td style="padding:0 20px 11px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#697483">For companies in your watchlist and the Kenyan market.</td></tr>${panel(content)}`; }
function watchlist(items: MarketBriefMover[] | undefined, url: string) { return !items?.length ? "" : `${title("Watchlist tracker")}${panel(`<div style="padding-bottom:8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#202938">Biggest movers in your watchlist</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items.map(mover).join("")}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:17px"><tr><td align="center" style="background:#17734c;border-radius:8px"><a href="${escapeHtml(url)}" style="display:block;padding:13px 15px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:.6px;color:#ffffff;text-decoration:none">VIEW WATCHLIST</a></td></tr></table>`)}`; }
function watchNext(items?: MarketBriefWatchItem[]) { return !items?.length ? "" : `${title("What to watch next")}<tr><td style="padding:0 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${items.map((item) => `<td class="mobile-two" width="50%" valign="top" style="padding:0 4px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e6e2d8;border-radius:15px"><tr><td style="padding:15px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#202938">${escapeHtml(item.title)}</div><div style="padding-top:5px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#697483">${escapeHtml(item.detail)}</div></td></tr></table></td>`).join("")}</tr></table></td></tr>`; }
function stories(items?: MarketBriefNewsItem[]) { return !items?.length ? "" : `${title("Stories that matter")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items.map((item) => `<tr><td style="padding:2px 0 14px;border-bottom:1px solid #ece9e1"><div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;font-weight:700;letter-spacing:1px;color:#17734c">${escapeHtml(item.category)}</div><div style="padding-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:23px;font-weight:700;color:#202938">${escapeHtml(item.headline)}</div><div style="padding-top:5px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#697483">${escapeHtml(item.summary)}</div><a href="${escapeHtml(item.url)}" style="display:inline-block;padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#17734c;text-decoration:none">Read story →</a></td></tr>`).join("")}</table>`)}`; }
function discovery(items?: MarketBriefDiscoveryAction[]) { return !items?.length ? "" : `${title("Explore KenyaFundFinder")}<tr><td style="padding:0 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${items.map((item) => `<td class="mobile-three" width="33.33%" valign="top" style="padding:0 3px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e6e2d8;border-radius:15px"><tr><td align="center" style="padding:16px 8px"><a href="${escapeHtml(item.url)}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:700;color:#202938;text-decoration:none">${escapeHtml(item.label)}</a></td></tr></table></td>`).join("")}</tr></table></td></tr>`; }

/** Pure renderer: callers provide every market value; it never reads Supabase or live data. */
export function renderMarketBriefEmail(data: MarketBriefEmailData): RenderedMarketBriefEmail {
  const headline = data.firstName ? `${data.firstName}, ${data.marketHeadline}` : data.marketHeadline;
  const badge = data.demo ? `<span style="display:inline-block;margin-bottom:16px;padding:6px 9px;background:#e6f0df;border:1px solid #bad4b8;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:13px;font-weight:700;letter-spacing:.7px;color:#285b3c">DEMO · SAMPLE DATA</span>` : "";
  const overview = `${title("Market overview")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${row("NSE market breadth", `${data.breadth.gainers} gainers`, `${data.breadth.losers} losers · ${data.breadth.unchanged} unchanged`, "#17734c")}${row("NSE market", data.breadth.today ?? "Mixed", data.breadth.sevenDay ? `7D ${data.breadth.sevenDay}` : undefined)}${row("USD / KES", data.usdKes.rate, data.usdKes.change, tone(data.usdKes.change))}</table>`)}`;
  const summary = `${title("What happened today")}${panel(`<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;font-weight:700;letter-spacing:1px;color:#17734c">MARKET SUMMARY${data.demo ? " · SAMPLE" : ""}</div><div style="padding-top:9px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#303b4a">${escapeHtml(data.summary)}</div>`, "20px")}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><title>Kenya Market Brief</title><style>@media only screen and (max-width:480px){.email-shell{width:100%!important}.mobile-pad{padding-left:12px!important;padding-right:12px!important}.mobile-title{font-size:40px!important;line-height:44px!important}.mobile-two,.mobile-three{display:block!important;width:100%!important;padding:0 0 8px!important}}</style></head><body style="margin:0;padding:0;background:#f3f0e7;color:#202938"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e7"><tr><td align="center" style="padding:20px 8px"><table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px"><tr><td class="mobile-pad" style="padding:7px 20px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#202938">KenyaFundFinder</td><td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#667180">${escapeHtml(data.date)}</td></tr></table></td></tr><tr><td class="mobile-pad" style="padding:35px 20px 0">${badge}<div class="mobile-title" style="font-family:Georgia,'Times New Roman',serif;font-size:43px;line-height:48px;letter-spacing:-1.2px;color:#202938">Kenya Market Brief</div><div style="padding-top:15px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:30px;font-weight:700;letter-spacing:-.3px;color:#283444">${escapeHtml(headline)}</div><div style="padding-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6e7885">Market close · ${escapeHtml(data.readTime ?? "60-second read")}</div></td></tr>${overview}${summary}${movers(data.movers)}${currencies(data.currencies)}${updates(data.importantUpdates)}${watchlist(data.watchlist, data.watchlistUrl ?? "https://kenyafundfinder.com/watchlist")}${watchNext(data.watchItems)}${stories(data.news)}${discovery(data.discoveryActions)}<tr><td style="padding:32px 12px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="background:#17734c;border-radius:9px"><a href="${escapeHtml(data.ctaUrl)}" style="display:block;padding:15px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:.65px;color:#ffffff;text-decoration:none">VIEW FULL MARKET OVERVIEW</a></td></tr></table></td></tr><tr><td align="center" style="padding:29px 20px 6px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#202938">Was this brief useful?</td></tr><tr><td align="center" style="padding:3px 20px 31px;font-family:Arial,Helvetica,sans-serif;font-size:23px;letter-spacing:14px;color:#17734c">👍 👎</td></tr><tr><td style="padding:23px 20px;background:#e9e5db;border-top:1px solid #d8d3c7;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#596574"><strong style="color:#202938">KenyaFundFinder</strong><br>Kenyan markets, explained simply.<br><br>Market information is provided for informational purposes only and should not be considered financial advice.<br><br><a href="#email-preferences" style="color:#334151">Email preferences</a> · <a href="#unsubscribe" style="color:#334151">Unsubscribe</a> · <a href="https://kenyafundfinder.com" style="color:#334151">Privacy</a> · <a href="https://kenyafundfinder.com" style="color:#334151">KenyaFundFinder.com</a></td></tr></table></td></tr></table></body></html>`;
  const text = `${data.demo ? "DEMO · SAMPLE DATA\n" : ""}KenyaFundFinder\nKenya Market Brief · ${data.date}\n\n${headline}\nMarket close · ${data.readTime ?? "60-second read"}\n\nMARKET OVERVIEW\nNSE breadth: ${data.breadth.gainers} gainers, ${data.breadth.losers} losers, ${data.breadth.unchanged} unchanged\nUSD/KES: ${data.usdKes.rate} (${data.usdKes.change})\n\nWHAT HAPPENED TODAY\n${data.summary}\n\n${data.movers?.length ? `BIGGEST MOVERS\n${data.movers.map((item) => `${item.ticker} · ${item.company} · ${item.price} · ${pct(item.changePercent)}`).join("\n")}\n\n` : ""}${data.news?.length ? `STORIES THAT MATTER\n${data.news.map((item) => `${item.category}: ${item.headline} — ${item.summary}`).join("\n")}\n\n` : ""}View full market overview: ${data.ctaUrl}\n\nMarket information is provided for informational purposes only and should not be considered financial advice.\nEmail preferences · Unsubscribe · Privacy · KenyaFundFinder.com`;
  const themedHtml = data.theme === "dark"
    ? [
        ["font-family:Georgia,'Times New Roman',serif", "font-family:Arial,Helvetica,sans-serif"],
        ["#f3f0e7", "#0a0a0b"], ["#ffffff", "#0a0a0b"], ["#e9e5db", "#111113"],
        ["#e6f0df", "#4ade80"], ["#bad4b8", "#4ade80"], ["#285b3c", "#0a0a0b"],
        ["#202938", "#fafafa"], ["#283444", "#f4f4f5"], ["#303b4a", "#f4f4f5"],
        ["#3d4a5a", "#e4e4e7"], ["#667180", "#a3a3a3"], ["#6e7885", "#a3a3a3"],
        ["#697483", "#a3a3a3"], ["#596574", "#a3a3a3"], ["#7b8490", "#a3a3a3"],
        ["#334151", "#d4d4d8"], ["#e6e2d8", "#424247"], ["#ece9e1", "#424247"],
        ["#d8d3c7", "#424247"], ["#263141", "#f4f4f5"], ["#c84545", "#f87171"],
        ["#17734c", "#4ade80"],
      ].reduce((output, [from, to]) => output.replaceAll(from, to), html)
        .replace(
          /<tr><td class="mobile-pad" style="padding:7px 20px 0"><table[\s\S]*?<\/table><\/td><\/tr><tr><td class="mobile-pad" style="padding:35px 20px 0">[\s\S]*?<\/td><\/tr>/,
          `<tr><td><img src="${DARK_MARKET_BRIEF_HERO_URL}" width="600" alt="${DARK_MARKET_BRIEF_HERO_ALT}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`,
        )
        .replace(
          /<tr><td style="padding:31px 20px 11px;[^"]*">Market overview<\/td><\/tr>[\s\S]*?(?=<tr><td style="padding:31px 20px 11px;[^"]*">What happened today<\/td><\/tr>)/,
          "",
        )
        .replace(
          /<tr><td align="center" style="padding:29px 20px 6px;[^"]*">Was this brief useful\?<\/td><\/tr><tr><td align="center" style="padding:3px 20px 31px;[^"]*">👍 👎<\/td><\/tr>/,
          "",
        )
        .replace("max-width:620px", "max-width:600px")
    : html;
  return { subject: data.demo ? "[DEMO] KenyaFundFinder — Kenya Market Brief" : "KenyaFundFinder — Kenya Market Brief", html: themedHtml, text };
}

export const demoMarketBriefData: MarketBriefEmailData = {
  date: "Monday, Aug 24", demo: true, firstName: "Marko", readTime: "60-second read",
  marketHeadline: "Kenyan equities finished mixed today while the shilling remained steady against the US dollar.",
  breadth: { gainers: 18, losers: 12, unchanged: 7, today: "+0.8%", sevenDay: "+2.1%" }, usdKes: { rate: "KES 129.40", change: "+0.15%" },
  summary: "Sample narrative: advancing stocks outnumbered decliners in a fictional demonstration session. The shilling remained relatively steady against the US dollar while activity was concentrated among several large-cap counters. Every value in this preview is illustrative only, not live market information.",
  movers: [{ ticker: "SCOM", company: "Safaricom", price: "KES 36.35", changePercent: 2.7, sevenDayChange: 3.4 }, { ticker: "EQTY", company: "Equity Group", price: "KES 52.80", changePercent: 1.8, sevenDayChange: 2.6 }, { ticker: "KCB", company: "KCB Group", price: "KES 42.10", changePercent: -1.1, sevenDayChange: 0.8 }],
  currencies: [{ pair: "USD / KES", rate: "129.40", change: "+0.15%" }, { pair: "GBP / KES", rate: "171.20", change: "−0.10%" }, { pair: "EUR / KES", rate: "150.30", change: "+0.05%" }],
  importantUpdates: [{ company: "Safaricom", title: "Sample dividend announcement", description: "Illustrative company-update card for the email preview." }, { company: "KCB Group", title: "Sample earnings release", description: "Fictional demonstration content; not a published market event." }],
  watchlist: [{ ticker: "SCOM", company: "Safaricom", price: "KES 36.35", changePercent: 2.7, sevenDayChange: 3.4, note: "No recent events" }, { ticker: "COOP", company: "Co-operative Bank", price: "KES 16.20", changePercent: 1.2, sevenDayChange: 1.9, note: "Earnings upcoming" }],
  watchItems: [{ title: "Treasury auction", detail: "Sample upcoming auction context." }, { title: "KES / USD", detail: "Illustrative currency level to monitor." }],
  news: [{ category: "SAMPLE MARKET NOTE", headline: "Fictional market participants review a demonstration session", summary: "This preview story does not represent a current news report.", url: "https://kenyafundfinder.com" }, { category: "SAMPLE COMPANY NOTE", headline: "Illustrative banking-sector earnings commentary", summary: "A fictional story card used only to preview the report design.", url: "https://kenyafundfinder.com" }, { category: "SAMPLE CURRENCY NOTE", headline: "Mock currency desk tracks a weekly move", summary: "This placeholder does not represent a real market event or source.", url: "https://kenyafundfinder.com" }],
  discoveryActions: [{ label: "Explore stocks", url: "https://kenyafundfinder.com/stocks" }, { label: "Compare funds", url: "https://kenyafundfinder.com/funds" }, { label: "Market news", url: "https://kenyafundfinder.com/news" }],
  ctaUrl: "https://kenyafundfinder.com", watchlistUrl: "https://kenyafundfinder.com/watchlist",
};

export const darkDemoMarketBriefData: MarketBriefEmailData = {
  ...demoMarketBriefData,
  theme: "dark",
  movers: [
    { ticker: "SCOM", company: "Safaricom", price: "KES 36.35", changePercent: 2.7, sevenDayChange: 3.4 },
    { ticker: "EQTY", company: "Equity Group", price: "KES 52.80", changePercent: 2.1, sevenDayChange: 2.9 },
    { ticker: "COOP", company: "Co-operative Bank", price: "KES 16.20", changePercent: 1.6, sevenDayChange: 2.1 },
    { ticker: "ABSA", company: "Absa Bank Kenya", price: "KES 14.85", changePercent: 1.2, sevenDayChange: 1.7 },
    { ticker: "KCB", company: "KCB Group", price: "KES 42.10", changePercent: 0.8, sevenDayChange: 1.4 },
    { ticker: "BAMB", company: "Bamburi Cement", price: "KES 31.40", changePercent: -0.7, sevenDayChange: -0.9 },
    { ticker: "BAT", company: "British American Tobacco Kenya", price: "KES 395.00", changePercent: -1.1, sevenDayChange: -1.6 },
    { ticker: "EABL", company: "East African Breweries", price: "KES 178.50", changePercent: -1.4, sevenDayChange: -2.0 },
    { ticker: "CIC", company: "CIC Insurance Group", price: "KES 2.45", changePercent: -1.9, sevenDayChange: -2.3 },
    { ticker: "NMG", company: "Nation Media Group", price: "KES 11.25", changePercent: -2.5, sevenDayChange: -3.1 },
  ],
};
