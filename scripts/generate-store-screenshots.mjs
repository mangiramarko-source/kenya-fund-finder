#!/usr/bin/env node
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const OUT_DIR = resolve("public/images/store");
mkdirSync(OUT_DIR, { recursive: true });

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapWords(text, maxCharsPerLine = 46) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const SLIDES = [
  {
    file: "01-market-overview.png",
    badge: "KENYA MARKET INTELLIGENCE",
    titleLine1: "Every Kenyan Market",
    titleLine2: "In One Clean App",
    subtitle: "Daily CMA Money Market yields, NSE stocks, CBK Treasury rates, FX & curated financial news.",
    accent: "#10b981",
    activeTab: "news",
    pills: ["Market Overview", "Top Stories", "Stocks", "MMFs"],
    rows: [
      { label: "NSE 20 Share Index", sub: "Nairobi Securities Exchange · Market Open", val: "2,184.45", delta: "+1.42%", pos: true },
      { label: "Top KES Money Market Fund", sub: "CMA-Regulated · Gross Annual EAR", val: "17.55% p.a.", delta: "14.92% Net", pos: true },
      { label: "CBK 91-Day Treasury Bill", sub: "Weekly CBK Auction · 15% WHT", val: "13.98% p.a.", delta: "11.88% Net", pos: true },
      { label: "USD / KES Exchange Rate", sub: "Central Bank of Kenya Indicative Rate", val: "KSh 129.15", delta: "-0.12%", pos: false },
    ],
  },
  {
    file: "02-mmf-yields.png",
    badge: "40 CMA-REGULATED UNIT TRUSTS",
    titleLine1: "Compare KES & USD",
    titleLine2: "Money Market Funds",
    subtitle: "Side-by-side daily yields, net returns after 15% withholding tax, fees & withdrawal times.",
    accent: "#10b981",
    activeTab: "funds",
    pills: ["KES Funds (27)", "USD Funds (13)", "Net After 15% WHT", "Low Min"],
    rows: [
      { label: "Cytonn Money Market Fund", sub: "Min KSh 1,000 · Mgmt Fee 2.0% · 1-Day", val: "17.55% EAR", delta: "14.92% Net", pos: true },
      { label: "Lofty-Corban KSH MMF", sub: "Min KSh 1,000 · Mgmt Fee 2.0% · CMA", val: "17.12% EAR", delta: "14.55% Net", pos: true },
      { label: "Etica Money Market Fund", sub: "Min KSh 100 · M-Pesa Instant Deposit", val: "16.85% EAR", delta: "14.32% Net", pos: true },
      { label: "Sanlam Pesa+ Money Market", sub: "Min KSh 2,500 · Tier-1 CMA Licensed", val: "15.40% EAR", delta: "13.09% Net", pos: true },
    ],
  },
  {
    file: "03-nse-stocks.png",
    badge: "NAIROBI SECURITIES EXCHANGE",
    titleLine1: "Track All 60+ NSE",
    titleLine2: "Listed Companies",
    subtitle: "Share prices, daily gainers & losers, P/E valuation ratios, market cap & dividend yields.",
    accent: "#3b82f6",
    activeTab: "stocks",
    pills: ["All NSE (63)", "Top Gainers", "Banking", "High Dividend"],
    rows: [
      { label: "SCOM · Safaricom PLC", sub: "Telecommunications · Cap KSh 715B", val: "KSh 17.85", delta: "+2.59%", pos: true },
      { label: "EQTY · Equity Group Holdings", sub: "Banking · Dividend Yield 8.6% · P/E 4.1x", val: "KSh 46.50", delta: "+1.86%", pos: true },
      { label: "KCB · KCB Group PLC", sub: "Banking · Dividend Yield 7.6% · P/E 3.4x", val: "KSh 39.20", delta: "+2.22%", pos: true },
      { label: "EABL · East African Breweries", sub: "Manufacturing & Allied · NSE Blue Chip", val: "KSh 162.00", delta: "+0.93%", pos: true },
    ],
  },
  {
    file: "04-savings-tbills.png",
    badge: "FIXED INCOME & SACCO BENCHMARKS",
    titleLine1: "CBK T-Bills, Bank",
    titleLine2: "Deposits & SACCOs",
    subtitle: "Compare 91/182/364-day T-Bills, tax-free Infrastructure Bonds, Tier-1 Banks & SASRA SACCOs.",
    accent: "#10b981",
    activeTab: "banking",
    pills: ["CBK T-Bills", "IFB Bonds", "Bank Deposits", "DT-SACCOs"],
    rows: [
      { label: "IFB1/2026 Infrastructure Bond", sub: "CBK DhowCSD · Tax-Free Coupon (0% WHT)", val: "16.84% p.a.", delta: "Tax-Exempt", pos: true },
      { label: "Stima DT-SACCO Dividends", sub: "SASRA-Regulated · Share Capital Rebate", val: "15.00% p.a.", delta: "12.75% Net", pos: true },
      { label: "CBK 364-Day Treasury Bill", sub: "DhowCSD Min KSh 50,000 · 15% WHT", val: "14.95% p.a.", delta: "12.71% Net", pos: true },
      { label: "Tier-1 Bank 12M Fixed Deposit", sub: "CBK-Regulated Commercial Banks", val: "11.50% p.a.", delta: "9.78% Net", pos: true },
    ],
  },
  {
    file: "05-portfolio-tracker.png",
    badge: "PORTFOLIO & PRICE ALERTS",
    titleLine1: "Track Your Assets",
    titleLine2: "& Custom Watchlists",
    subtitle: "Monitor simulated holdings across MMFs, NSE stocks & bonds with custom price alerts.",
    accent: "#8b5cf6",
    activeTab: "portfolio",
    pills: ["My Holdings", "Watchlist (8)", "Price Alerts", "Allocation"],
    rows: [
      { label: "Total Simulated Portfolio", sub: "4 Asset Classes · Privacy Blur Ready", val: "KSh 1,450,000", delta: "+14.6% p.a.", pos: true },
      { label: "Money Market Allocation", sub: "Cytonn & Etica KES MMFs (58%)", val: "KSh 850,000", delta: "+KSh 10.4K/m", pos: true },
      { label: "NSE Dividend Equities", sub: "SCOM, EQTY, KCB, COOP (28%)", val: "KSh 400,000", delta: "8.4% Div Yld", pos: true },
      { label: "CBK Treasury Bills & Bonds", sub: "182-Day T-Bill & IFB Holdings (14%)", val: "KSh 200,000", delta: "+15.2% Net", pos: true },
    ],
  },
  {
    file: "06-return-calculator.png",
    badge: "TAX-AWARE RETURN CALCULATOR",
    titleLine1: "Calculate Exact Net",
    titleLine2: "Returns After Tax",
    subtitle: "Model lump-sum & monthly top-ups with automatic 15% KRA withholding tax breakdown.",
    accent: "#10b981",
    activeTab: "funds",
    pills: ["MMF Calculator", "T-Bill Discount", "Stock Return", "15% WHT"],
    rows: [
      { label: "Initial Principal + Top-Ups", sub: "KSh 500,000 + KSh 25,000/mo (12 Months)", val: "KSh 800,000", delta: "Principal", pos: true },
      { label: "Gross Projected Interest", sub: "At 16.50% p.a. Compounded Monthly", val: "KSh 108,420", delta: "Gross EAR", pos: true },
      { label: "KRA 15% Withholding Tax", sub: "Statutory Final Tax Deducted at Source", val: "-KSh 16,263", delta: "15% WHT", pos: false },
      { label: "Estimated Net Balance", sub: "Illustrative Scenario · Not Advice", val: "KSh 892,157", delta: "+KSh 92.2K Net", pos: true },
    ],
  },
];

const NAV_TABS = [
  { key: "news", label: "News" },
  { key: "stocks", label: "Stocks" },
  { key: "funds", label: "MMFs" },
  { key: "banking", label: "Banking" },
  { key: "portfolio", label: "My Assets" },
];

function buildSlideSvg(slide) {
  const pillWidth = Math.max(420, Math.round(slide.badge.length * 16.2 + 88));
  const subtitleLines = wrapWords(slide.subtitle, 55);

  const filterPillsSvg = slide.pills
    .map((pill, idx) => {
      const x = 84 + idx * 230;
      const isFirst = idx === 0;
      const bg = isFirst ? "#10b981" : "#18181b";
      const fg = isFirst ? "#052e16" : "#a1a1aa";
      const stroke = isFirst ? "#10b981" : "#27272a";
      return `
        <g transform="translate(${x}, 760)">
          <rect width="214" height="52" rx="26" fill="${bg}" stroke="${stroke}" stroke-width="2" />
          <text x="107" y="34" text-anchor="middle" fill="${fg}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">${escapeXml(pill)}</text>
        </g>
      `;
    })
    .join("");

  const cardsSvg = slide.rows
    .map((row, idx) => {
      const y = 836 + idx * 194;
      const badgeBg = row.pos ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.16)";
      const badgeBorder = row.pos ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)";
      const badgeText = row.pos ? "#34d399" : "#fbbf24";
      const deltaWidth = Math.max(168, Math.round(row.delta.length * 14.5 + 36));
      const deltaX = 872 - deltaWidth;
      const deltaCenterX = deltaX + Math.round(deltaWidth / 2);
      return `
        <g transform="translate(84, ${y})">
          <rect width="912" height="172" rx="28" fill="#16161a" stroke="#27272a" stroke-width="2" />
          <text x="36" y="68" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="700">${escapeXml(row.label)}</text>
          <text x="36" y="118" fill="#a1a1aa" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500">${escapeXml(row.sub)}</text>
          <text x="872" y="66" text-anchor="end" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800">${escapeXml(row.val)}</text>
          <rect x="${deltaX}" y="88" width="${deltaWidth}" height="46" rx="14" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.5" />
          <text x="${deltaCenterX}" y="119" text-anchor="middle" fill="${badgeText}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">${escapeXml(row.delta)}</text>
        </g>
      `;
    })
    .join("");

  const bottomTabsSvg = NAV_TABS.map((tab, idx) => {
    const tabWidth = 148;
    const x = 92 + idx * tabWidth;
    const active = tab.key === slide.activeTab;
    const pillMarkup = active
      ? `<rect x="${x + 6}" y="1696" width="${tabWidth - 12}" height="82" rx="41" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5" />`
      : "";
    const color = active ? "#34d399" : "#a1a1aa";
    const weight = active ? "800" : "600";
    return `
      ${pillMarkup}
      <circle cx="${x + tabWidth / 2}" cy="1724" r="9" fill="${color}" />
      <text x="${x + tabWidth / 2}" y="1760" text-anchor="middle" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="${weight}">${escapeXml(tab.label)}</text>
    `;
  }).join("");

  return `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#09090b" />
          <stop offset="50%" stop-color="#0d131a" />
          <stop offset="100%" stop-color="#09090b" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="14%" r="55%">
          <stop offset="0%" stop-color="${slide.accent}" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#09090b" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="1080" height="1920" fill="url(#bgGrad)" />
      <rect width="1080" height="1920" fill="url(#glow)" />

      <!-- Top Brand Pill (Dynamic Width) -->
      <g transform="translate(84, 96)">
        <rect width="${pillWidth}" height="60" rx="30" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.38)" stroke-width="2" />
        <circle cx="34" cy="30" r="9" fill="#10b981" />
        <text x="58" y="38" fill="#34d399" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="1.2">${escapeXml(slide.badge)}</text>
      </g>

      <!-- Main Headlines -->
      <text x="84" y="252" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="800" letter-spacing="-1.2">${escapeXml(slide.titleLine1)}</text>
      <text x="84" y="342" fill="#34d399" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="800" letter-spacing="-1.2">${escapeXml(slide.titleLine2)}</text>
      <text x="84" y="416" fill="#a1a1aa" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="500">${escapeXml(subtitleLines[0] || "")}</text>
      <text x="84" y="458" fill="#a1a1aa" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="500">${escapeXml(subtitleLines[1] || "")}</text>

      <!-- Mobile Phone Bezel Container -->
      <rect x="48" y="518" width="984" height="1312" rx="56" fill="#0b0b0e" stroke="#27272a" stroke-width="4" />

      <!-- App Top Navbar inside Device Frame -->
      <g transform="translate(84, 558)">
        <rect width="56" height="56" rx="16" fill="#10b981" />
        <text x="28" y="39" text-anchor="middle" fill="#052e16" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900">K</text>
        <text x="76" y="36" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800">Kenya Fund Finder</text>
        <text x="76" y="64" fill="#71717a" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">CMA · NSE · CBK · SASRA Regulated Data</text>
      </g>

      <!-- Live Currency & Commodity Strip -->
      <rect x="52" y="644" width="976" height="46" fill="#121216" />
      <line x1="52" y1="644" x2="1028" y2="644" stroke="#27272a" stroke-width="1.5" />
      <line x1="52" y1="690" x2="1028" y2="690" stroke="#27272a" stroke-width="1.5" />
      <text x="540" y="674" text-anchor="middle" fill="#a1a1aa" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">
        USD/KES 129.15   ·   GBP/KES 164.20   ·   EUR/KES 138.40   ·   CBR 12.00%   ·   91D T-BILL 13.98%
      </text>

      <!-- Filter Pills Row -->
      <g transform="translate(0, -40)">
        ${filterPillsSvg}
      </g>

      <!-- Data Cards -->
      <g transform="translate(0, -34)">
        ${cardsSvg}
      </g>

      <!-- Mobile App Watermark above Bottom Dock -->
      <text x="540" y="1654" text-anchor="middle" fill="#71717a" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">
        Kenya Fund Finder · Operated by Elyon Innovation LTD · Legal &amp; Disclaimers
      </text>

      <!-- Signature Split Floating Glass Bottom Nav Dock (5-Tab Pill + More Orb) -->
      <rect x="84" y="1688" width="756" height="98" rx="49" fill="#18181b" stroke="#3f3f46" stroke-width="2" />
      ${bottomTabsSvg}

      <!-- Detached Circular More Orb -->
      <rect x="858" y="1688" width="138" height="98" rx="49" fill="#18181b" stroke="#3f3f46" stroke-width="2" />
      <circle cx="912" cy="1724" r="4" fill="#a1a1aa" />
      <circle cx="927" cy="1724" r="4" fill="#a1a1aa" />
      <circle cx="942" cy="1724" r="4" fill="#a1a1aa" />
      <text x="927" y="1760" text-anchor="middle" fill="#a1a1aa" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="600">More</text>

      <!-- Bottom Store Footer -->
      <text x="540" y="1880" text-anchor="middle" fill="#71717a" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="600">
        Read-Only Market Intelligence &amp; Comparison · Not Personal Financial Advice
      </text>
    </svg>
  `;
}

for (const slide of SLIDES) {
  const svgBuffer = Buffer.from(buildSlideSvg(slide));
  const outPath = join(OUT_DIR, slide.file);
  await sharp(svgBuffer).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`[store-screenshots] wrote ${outPath} (1080x1920)`);
}
