const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SYSTEM_PROMPT = `You are the KenyaFundFinder AI — a Nairobi-based financial expert.

You have access to LIVE market data from KenyaFundFinder (provided in the user message as MARKET CONTEXT). Use ONLY that data when referencing specific funds, stocks, FX rates or commodities. Never invent tickers, yields, or prices.

When giving advice, structure your answer with these Markdown sections:

## Summary
A 2-3 sentence overview tailored to the user's question and selected risk profile.

## Asset Allocation
A Markdown table:
| Asset Class | Allocation | Rationale |

## Recommended Picks
Show MULTIPLE concrete options across asset classes the user asked about. Use Markdown tables — one per asset class when relevant:

**Unit Trusts (MMF / Bond / Equity)**
| Fund | Manager | Annual Yield | Min Investment |

**NSE Stocks**
| Symbol | Name | Price (KES) | Day % | Sector |

**FX Rates**
| Pair | Rate | Δ |

**Commodities**
| Commodity | Price | Unit |

Only include the tables that are relevant to the question. Show 3–6 rows per table when relevant.

## Risk Rating
**Low / Medium / High** — one line of justification.

## Notes
Always end with: *"I'm an AI assistant. For live updates, check the Compare Funds, Stocks, Rates and Commodities pages on KenyaFundFinder."*

Tone: professional, concise, minimalist. Use bold sparingly.`;

async function fetchMarketContext() {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const base = `${SUPABASE_URL}/rest/v1`;

  const [funds, stocks, rates, commodities] = await Promise.all([
    fetch(`${base}/funds?select=name,manager,fund_type,annual_yield,daily_yield,minimum_investment,management_fee,yield_unit&is_published=eq.true&order=annual_yield.desc.nullslast&limit=40`, { headers }).then(r => r.json()).catch(() => []),
    fetch(`${base}/stocks?select=symbol,name,price,day_change_percent,sector,volume&is_active=eq.true&order=day_change_percent.desc.nullslast&limit=40`, { headers }).then(r => r.json()).catch(() => []),
    fetch(`${base}/exchange_rates?select=currency_code,currency_name,rate,previous_rate&is_active=eq.true&order=sort_order.asc&limit=20`, { headers }).then(r => r.json()).catch(() => []),
    fetch(`${base}/commodities?select=name,symbol,price,previous_price,unit&is_active=eq.true&order=sort_order.asc&limit=20`, { headers }).then(r => r.json()).catch(() => []),
  ]);

  return { funds, stocks, rates, commodities };
}

function buildContextBlock(data: any) {
  const fmt = (n: any) => (n == null ? "—" : Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 }));
  const pct = (n: any) => (n == null ? "—" : `${Number(n).toFixed(2)}%`);

  const fundsByType: Record<string, any[]> = {};
  for (const f of data.funds || []) {
    const k = f.fund_type || "other";
    (fundsByType[k] ||= []).push(f);
  }

  const fundLines = Object.entries(fundsByType).map(([type, list]) =>
    `${type.toUpperCase()}:\n` +
    list.slice(0, 15).map((f: any) =>
      `- ${f.name} | ${f.manager} | yield: ${fmt(f.annual_yield)}${f.yield_unit || "%"} | min: KES ${fmt(f.minimum_investment)} | fee: ${pct(f.management_fee)}`
    ).join("\n")
  ).join("\n\n");

  const stockLines = (data.stocks || []).slice(0, 30).map((s: any) =>
    `- ${s.symbol} (${s.name}) | KES ${fmt(s.price)} | ${pct(s.day_change_percent)} | ${s.sector}`
  ).join("\n");

  const rateLines = (data.rates || []).map((r: any) => {
    const chg = r.previous_rate ? ((r.rate - r.previous_rate) / r.previous_rate * 100) : null;
    return `- ${r.currency_code}/KES (${r.currency_name}): ${fmt(r.rate)}${chg != null ? ` (${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%)` : ""}`;
  }).join("\n");

  const commodityLines = (data.commodities || []).map((c: any) =>
    `- ${c.name} (${c.symbol}): ${fmt(c.price)} ${c.unit}`
  ).join("\n");

  return `MARKET CONTEXT (live KenyaFundFinder data, ${new Date().toISOString().slice(0, 10)}):

=== UNIT TRUSTS ===
${fundLines || "(none)"}

=== NSE STOCKS (sorted by day change) ===
${stockLines || "(none)"}

=== FX RATES (KES) ===
${rateLines || "(none)"}

=== COMMODITIES ===
${commodityLines || "(none)"}
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, riskProfile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const data = await fetchMarketContext();
    const context = buildContextBlock(data);

    const riskCtx = riskProfile
      ? `\n\nThe user's risk tolerance is **${riskProfile.toUpperCase()}**. Tailor allocations: Low = MMFs/bonds, Medium = balanced, High = equities/growth.`
      : "";

    // Inject market context as a system message so it's always grounding the latest user turn
    const augmented = [
      { role: "system", content: SYSTEM_PROMPT + riskCtx },
      { role: "system", content: context },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: augmented,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-analyst error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
