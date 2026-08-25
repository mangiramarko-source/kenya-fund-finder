import { escapeHtml } from "./communications.ts";

export interface NewsHighlightStory {
  category: string;
  headline: string;
  summary: string;
  url: string;
  source?: string;
  published_at?: string;
  ticker?: string;
  price?: string;
  change?: string;
}

export interface NewsHighlightInsight {
  label: string;
  detail: string;
}

export interface CompanyWatchItem {
  company: string;
  ticker?: string;
  summary: string;
  tag?: string;
}

export interface PolicyWatchItem {
  headline: string;
  summary: string;
  category?: string;
}

export interface NewsHighlightsEmailData {
  date: string;
  demo: boolean;
  topStories: NewsHighlightStory[];
  whyItMatters: NewsHighlightInsight[];
  companyWatch: CompanyWatchItem[];
  policyWatch: PolicyWatchItem[];
  featuredStory: NewsHighlightStory;
  ctaUrl: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export interface RenderedNewsHighlightsEmail {
  subject: string;
  html: string;
  text: string;
}

const NEWS_HIGHLIGHTS_HERO_URL = "https://kenyafundfinder.com/market-news-highlights-hero.png";
const NEWS_HIGHLIGHTS_HERO_ALT = "KenyaFundFinder News Highlights";

const page = "#0a0a0b";
const surface = "#111113";
const card = "#18181b";
const border = "#424247";
const foreground = "#fafafa";
const soft = "#e4e4e7";
const muted = "#a3a3a3";
const green = "#4ade80";
const blue = "#60a5fa";
const red = "#fb7185";

const title = (value: string) =>
  `<tr><td style="padding:31px 20px 11px;font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:31px;font-weight:700;color:${foreground}">${escapeHtml(value)}</td></tr>`;

const panel = (content: string, padding = "18px") =>
  `<tr><td style="padding:0 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${page};border:1px solid ${border};border-radius:15px"><tr><td style="padding:${padding}">${content}</td></tr></table></td></tr>`;

const changeColor = (value?: string) => value?.trim().startsWith("-") ? red : green;

function storyCard(story: NewsHighlightStory, featured = false) {
  const meta = [story.source, story.published_at].filter(Boolean).join(" · ");
  const ticker = story.ticker
    ? `<span style="display:inline-block;margin-left:8px;padding:5px 9px;background:${card};border:1px solid ${border};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;font-weight:700;color:${foreground}">${escapeHtml(story.ticker)}${story.price ? ` <span style="font-weight:400;color:${muted}">${escapeHtml(story.price)}</span>` : ""}${story.change ? ` <span style="color:${changeColor(story.change)}">${escapeHtml(story.change)}</span>` : ""}</span>`
    : "";
  return `<tr><td style="${featured ? "" : "padding:0 0 16px;"}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${featured ? surface : card};border:1px solid ${border};border-radius:14px"><tr><td style="padding:${featured ? "22px" : "18px"}"><div><span style="display:inline-block;padding:6px 10px;background:#064e3b;border:1px solid #047857;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;font-weight:700;letter-spacing:.7px;color:${green}">${escapeHtml(story.category)}</span>${ticker}</div>${meta ? `<div style="padding-top:15px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:17px;color:${muted}">${escapeHtml(meta)}</div>` : ""}<div style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:${featured ? "22px" : "18px"};line-height:${featured ? "28px" : "24px"};font-weight:700;color:${foreground}">${escapeHtml(story.headline)}</div><div style="padding-top:9px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${muted}">${escapeHtml(story.summary)}</div><a href="${escapeHtml(story.url)}" style="display:inline-block;padding-top:13px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:700;color:${green};text-decoration:none">Read more -&gt;</a></td></tr></table></td></tr>`;
}

function topStories(items: NewsHighlightStory[]) {
  const selected = items.slice(0, 5);
  if (!selected.length) return "";
  return `${title("Top stories")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${selected.map((item) => storyCard(item)).join("")}</table>`, "0")}`;
}

function insights(items: NewsHighlightInsight[]) {
  if (!items.length) return "";
  const rows = items.slice(0, 4).map((item, index) => `<tr><td style="${index ? `padding-top:14px;border-top:1px solid ${border};` : ""}"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;letter-spacing:.9px;color:${green}">${escapeHtml(item.label)}</div><div style="padding-top:5px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${soft}">${escapeHtml(item.detail)}</div></td></tr>`).join("");
  return `${title("Why it matters")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`, "20px")}`;
}

function companyWatch(items: CompanyWatchItem[]) {
  if (!items.length) return "";
  const rows = items.map((item, index) => `<tr><td style="${index ? `padding-top:14px;border-top:1px solid ${border};` : ""}"><div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:21px;font-weight:700;color:${foreground}">${item.ticker ? `<span style="color:${green}">${escapeHtml(item.ticker)}</span> ` : ""}${escapeHtml(item.company)}${item.tag ? ` <span style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:.7px;color:${blue}">${escapeHtml(item.tag)}</span>` : ""}</div><div style="padding-top:5px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${muted}">${escapeHtml(item.summary)}</div></td></tr>`).join("");
  return `${title("Company watch")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`, "20px")}`;
}

function policyWatch(items: PolicyWatchItem[]) {
  if (!items.length) return "";
  const rows = items.map((item, index) => `<tr><td style="${index ? `padding-top:14px;border-top:1px solid ${border};` : ""}">${item.category ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;font-weight:700;letter-spacing:.8px;color:${green}">${escapeHtml(item.category)}</div>` : ""}<div style="padding-top:${item.category ? "5px" : "0"};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:21px;font-weight:700;color:${foreground}">${escapeHtml(item.headline)}</div><div style="padding-top:5px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${muted}">${escapeHtml(item.summary)}</div></td></tr>`).join("");
  return `${title("Economy / policy watch")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`, "20px")}`;
}

function featured(story: NewsHighlightStory) {
  return `${title("Editor's pick")}${panel(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${storyCard(story, true)}</table>`, "0")}`;
}

/** Pure renderer: callers provide every story; it never reads Supabase or live data. */
export function renderNewsHighlightsEmail(data: NewsHighlightsEmailData): RenderedNewsHighlightsEmail {
  const hero = `<tr><td><img src="${NEWS_HIGHLIGHTS_HERO_URL}" width="600" alt="${NEWS_HIGHLIGHTS_HERO_ALT}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`;
  const demoNote = data.demo ? `<tr><td style="padding:18px 20px 0"><span style="display:inline-block;padding:6px 10px;background:${green};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:13px;font-weight:700;letter-spacing:.8px;color:${page}">DEMO · SAMPLE DATA</span></td></tr>` : "";
  const preferencesUrl = data.preferencesUrl ?? "https://kenyafundfinder.com/profile";
  const unsubscribeUrl = data.unsubscribeUrl ?? "#unsubscribe";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><title>KenyaFundFinder News Highlights</title><style>@media only screen and (max-width:480px){.email-shell{width:100%!important}}</style></head><body style="margin:0;padding:0;background:${page};color:${foreground}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${page}"><tr><td align="center" style="padding:20px 8px"><table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">${hero}${demoNote}${topStories(data.topStories)}${insights(data.whyItMatters)}${companyWatch(data.companyWatch)}${policyWatch(data.policyWatch)}${featured(data.featuredStory)}<tr><td style="padding:32px 12px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="background:${green};border-radius:9px"><a href="${escapeHtml(data.ctaUrl)}" style="display:block;padding:15px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:.65px;color:${page};text-decoration:none">VIEW MORE MARKET NEWS</a></td></tr></table></td></tr><tr><td style="padding:24px 20px;background:${surface};border-top:1px solid ${border};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:${muted}"><strong style="color:${foreground}">KenyaFundFinder</strong><br>Kenyan markets, explained simply.<br><br>Market information is provided for informational purposes only and should not be considered financial advice.<br><br><a href="${escapeHtml(preferencesUrl)}" style="color:${soft}">Email preferences</a> · <a href="${escapeHtml(unsubscribeUrl)}" style="color:${soft}">Unsubscribe</a> · <a href="https://kenyafundfinder.com" style="color:${soft}">Privacy</a> · <a href="https://kenyafundfinder.com" style="color:${soft}">KenyaFundFinder.com</a></td></tr></table></td></tr></table></body></html>`;
  const text = `${data.demo ? "DEMO · SAMPLE DATA\n" : ""}KenyaFundFinder News Highlights · ${data.date}\n\nTOP STORIES\n${data.topStories.slice(0, 5).map((item) => `${item.category}: ${item.headline}\n${item.summary}`).join("\n\n")}\n\nWHY IT MATTERS\n${data.whyItMatters.map((item) => `${item.label}: ${item.detail}`).join("\n")}\n\nCOMPANY WATCH\n${data.companyWatch.map((item) => `${item.ticker ? `${item.ticker} · ` : ""}${item.company}: ${item.summary}`).join("\n")}\n\nECONOMY / POLICY WATCH\n${data.policyWatch.map((item) => `${item.category ? `${item.category}: ` : ""}${item.headline} - ${item.summary}`).join("\n")}\n\nEDITOR'S PICK\n${data.featuredStory.headline}\n${data.featuredStory.summary}\n\nView more market news: ${data.ctaUrl}\n\nMarket information is provided for informational purposes only and should not be considered financial advice.\nEmail preferences · Unsubscribe · Privacy · KenyaFundFinder.com`;
  return {
    subject: data.demo ? "[DEMO] KenyaFundFinder News Highlights" : "KenyaFundFinder News Highlights",
    html,
    text,
  };
}

export const demoNewsHighlightsData: NewsHighlightsEmailData = {
  date: "Monday, Aug 24",
  demo: true,
  topStories: [
    {
      category: "EARNINGS REPORT",
      headline: "Sample bank profits improve as loan book growth offsets margin pressure",
      summary: "Fictional earnings coverage showing how a bank update might be summarized in plain English for a news-focused email.",
      url: "https://kenyafundfinder.com/news",
      source: "Business Daily",
      published_at: "Aug 24, 2026",
      ticker: "KCB",
      price: "KES 93.75",
      change: "-0.8%",
    },
    {
      category: "MARKET SENTIMENT",
      headline: "Sample large caps anchor a cautious session on the Nairobi bourse",
      summary: "Demo market-news copy highlighting that investor attention stayed on liquidity, large-cap turnover, and company updates.",
      url: "https://kenyafundfinder.com/news",
      source: "Capital Business",
      published_at: "Aug 24, 2026",
    },
    {
      category: "FX",
      headline: "Sample shilling steadies as importers watch dollar demand",
      summary: "Illustrative currency note explaining why FX stability can matter for funds, import costs, and company margins.",
      url: "https://kenyafundfinder.com/news",
      source: "The Standard",
      published_at: "Aug 23, 2026",
    },
    {
      category: "POLICY",
      headline: "Sample policy calendar keeps rates and Treasury auctions in focus",
      summary: "Demo policy watch item summarizing upcoming public-market context without making a forecast or recommendation.",
      url: "https://kenyafundfinder.com/news",
      source: "KenyaFundFinder Demo Desk",
      published_at: "Aug 23, 2026",
    },
  ],
  whyItMatters: [
    { label: "INVESTOR RELEVANCE", detail: "Earnings stories help users separate company fundamentals from short-term market noise." },
    { label: "MARKET IMPACT", detail: "Large-cap turnover can shape daily sentiment even when broader market breadth is mixed." },
    { label: "COMPANY RELEVANCE", detail: "Company-specific updates should be read with source dates, sector context, and no buy-or-sell framing." },
  ],
  companyWatch: [
    { company: "Safaricom", ticker: "SCOM", tag: "COMPANY", summary: "Sample telecom update keeps attention on mobile-money revenue and data growth." },
    { company: "KCB Group", ticker: "KCB", tag: "BANKING", summary: "Demo earnings note tracks profit growth, provisions, and regional banking exposure." },
    { company: "Equity Group", ticker: "EQTY", tag: "BANKING", summary: "Illustrative company watch item links loan growth to investor focus on margins." },
    { company: "Co-operative Bank", ticker: "COOP", tag: "BANKING", summary: "Sample update flags dividend and asset-quality context for watchlist users." },
  ],
  policyWatch: [
    { category: "MACRO", headline: "Sample inflation print remains a key weekly datapoint", summary: "Demo macro note explains why inflation can influence rates, funds, and household costs." },
    { category: "RATES", headline: "Sample Treasury auction calendar draws yield attention", summary: "Illustrative policy item separates dated auction information from daily equity movement." },
    { category: "CURRENCY", headline: "Sample FX desk watches dollar liquidity", summary: "Demo currency context keeps USD/KES monitoring tied to stored market facts." },
  ],
  featuredStory: {
    category: "EDITOR'S PICK",
    headline: "Sample corporate results season gives investors more to verify",
    summary: "A featured demo story showing how KenyaFundFinder can surface source-linked company news while keeping the tone factual, cautious, and non-advisory.",
    url: "https://kenyafundfinder.com/news",
    source: "KenyaFundFinder Demo Desk",
    published_at: "Aug 24, 2026",
  },
  ctaUrl: "https://kenyafundfinder.com/news",
};
