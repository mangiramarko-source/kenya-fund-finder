import { createClient, type SupabaseClient } from "../_shared/supabase-client.ts";
import { extractText } from "https://esm.sh/unpdf@0.12.1";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabasePublishableKey, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let supabaseInstance: SupabaseClient | null = null;
function getSupabaseClient() {
  if (!supabaseInstance) {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = getSupabaseSecretKey();
    supabaseInstance = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabaseInstance;
}

const MAX_BYTES = 10 * 1024 * 1024;

interface SourceRow { id: string; stock_id: string; source_url: string; source_domain: string; source_type: "html" | "rss" | "sitemap"; rate_limit_ms: number; etag: string | null; last_modified: string | null; checkpoint: { cursor?: number }; stocks: { symbol: string; name: string }; }
interface Extraction { issuer_name: string; title: string; disclosure_type: "financial_results" | "dividend" | "agm" | "rights_issue" | "stock_split" | "acquisition" | "governance" | "other"; published_at: string; summary: string; key_facts: Array<{ label: string; value: string }>; corporate_action: null | { action_type: "dividend" | "agm" | "rights_issue" | "stock_split" | "bonus_issue" | "merger" | "acquisition" | "other"; announcement_date: string; ex_date: string | null; book_closure_date: string | null; payment_date: string | null; amount: number | null; currency: string | null; ratio: string | null; }; }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "content-type": "application/json" } });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const normalized = (value: string) => value.toLowerCase().replace(/[,\s]/g, "").replace(/\.0+$/, "");

export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw); url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
  url.pathname = url.pathname.replace(/\/{2,}/g, "/"); return url.toString();
}

function isAllowedUrl(raw: string, domain: string) { try { const url = new URL(raw); return url.protocol === "https:" && (url.hostname === domain || url.hostname.endsWith(`.${domain}`)); } catch { return false; } }

export function robotsAllows(text: string, path: string): boolean {
  let applies = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim(); const separator = line.indexOf(":");
    const field = line.slice(0, separator).toLowerCase(); const value = line.slice(separator + 1).trim();
    if (field === "user-agent") applies = value === "*";
    if (applies && field === "disallow" && value && path.startsWith(value)) return false;
  }
  return true;
}

function htmlText(html: string) { return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim(); }
function discoverLinks(html: string, base: string, domain: string) { const result = new Set<string>(); for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) { try { const url = canonicalizeUrl(new URL(match[1], base).toString()); if (isAllowedUrl(url, domain) && /(investor|annual|interim|result|report|dividend|agm|notice|announcement|circular|\.pdf(?:$|\?))/i.test(url)) result.add(url); if (result.size >= 50) break; } catch { /* invalid */ } } return [...result]; }
async function sha256(text: string) { const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

export function factsAreGrounded(extraction: Extraction, sourceText: string) {
  const facts = [extraction.published_at, ...([extraction.title, extraction.summary].flatMap((value) => value.match(/(?:\d[\d,.]*%?|\d{4}-\d{2}-\d{2})/g) || [])), ...extraction.key_facts.flatMap((fact) => fact.value.match(/(?:\d[\d,.]*%?|\d{4}-\d{2}-\d{2})/g) || [])];
  const action = extraction.corporate_action;
  if (action) for (const value of [action.announcement_date, action.ex_date, action.book_closure_date, action.payment_date, action.amount?.toString(), action.ratio]) if (value) facts.push(value);
  const source = normalized(sourceText); return facts.every((fact) => source.includes(normalized(String(fact))));
}

function disclosureType(url: string): Extraction["disclosure_type"] {
  if (/dividend/i.test(url)) return "dividend";
  if (/agm|meeting/i.test(url)) return "agm";
  if (/rights/i.test(url)) return "rights_issue";
  if (/split/i.test(url)) return "stock_split";
  if (/result|report|financial/i.test(url)) return "financial_results";
  return "other";
}

function documentTitle(source: SourceRow, url: string) {
  const filename = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1) || "").replace(/\.(pdf|html?)$/i, "").replace(/[-_]+/g, " ").trim();
  if (!filename || /^(investor-relations|contact-us)$/i.test(filename)) return `${source.stocks.name} Investor Relations`;
  return filename.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function fetchAllowed(rawUrl: string, source: SourceRow, conditional = false): Promise<Response> {
  const url = canonicalizeUrl(rawUrl); if (!isAllowedUrl(url, source.source_domain)) throw new Error("URL not allowlisted");
  const headers = new Headers({ "user-agent": "KenyaFundFinderDisclosures/1.0 (+https://kenyafundfinder.com)" });
  if (conditional && source.etag) headers.set("if-none-match", source.etag); if (conditional && source.last_modified) headers.set("if-modified-since", source.last_modified);
  const response = await fetch(url, { headers, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) { const location = response.headers.get("location"); if (!location) throw new Error("Redirect missing location"); const target = new URL(location, url).toString(); if (!isAllowedUrl(target, source.source_domain)) throw new Error("Redirect left allowlisted domain"); return fetchAllowed(target, source); }
  return response;
}

async function readDocument(response: Response) {
  if (Number(response.headers.get("content-length") || 0) > MAX_BYTES) throw new Error("Document exceeds 10 MB");
  if ((response.headers.get("content-type") || "").includes("pdf")) { const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > MAX_BYTES) throw new Error("Document exceeds 10 MB"); const result = await extractText(bytes, { mergePages: true }); const text = String(result.text); if (text.trim().length < 200) throw new Error("Image-only or unreadable PDF"); return text.replace(/\s+/g, " ").trim(); }
  const raw = await response.text(); if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) throw new Error("Document exceeds 10 MB"); return htmlText(raw);
}

async function processDocument(source: SourceRow, rawUrl: string, dryRun: boolean) {
  const supabase = getSupabaseClient();
  const url = canonicalizeUrl(rawUrl); const robots = await fetch(`https://${source.source_domain}/robots.txt`, { headers: { "user-agent": "KenyaFundFinderDisclosures/1.0" } });
  if (robots.ok && !robotsAllows(await robots.text(), new URL(url).pathname)) throw new Error("Blocked by robots.txt");
  const response = await fetchAllowed(url, source); if (!response.ok) throw new Error(`Document returned ${response.status}`);
  const text = await readDocument(response); const contentHash = await sha256(text);
  const { data: duplicate } = await supabase.from("stock_disclosures").select("id").eq("stock_id", source.stock_id).eq("content_hash", contentHash).maybeSingle(); if (duplicate) return { status: "duplicate", url };
  const extracted: Extraction = {
    issuer_name: source.stocks.name,
    title: documentTitle(source, url),
    disclosure_type: disclosureType(url),
    published_at: response.headers.get("last-modified") || new Date().toISOString(),
    summary: `Official ${source.stocks.name} document. Open the issuer’s website to read the complete information.`,
    key_facts: [],
    corporate_action: null,
  };
  const status = "published" as const;
  if (dryRun) return { status, url, title: extracted.title };
  const { data: disclosure, error } = await supabase.from("stock_disclosures").upsert({ stock_id: source.stock_id, source_id: source.id, canonical_url: url, source_domain: source.source_domain, title: extracted.title, disclosure_type: extracted.disclosure_type, published_at: extracted.published_at, summary: extracted.summary, key_facts: [], source_text: null, content_hash: contentHash, model_version: null, prompt_version: "issuer-link-v1", extraction_status: status, extraction_error: null }, { onConflict: "canonical_url" }).select("id").single(); if (error) throw error;
  if (extracted.corporate_action) await supabase.from("stock_corporate_actions").upsert({ disclosure_id: disclosure.id, stock_id: source.stock_id, ...extracted.corporate_action, source_url: url }, { onConflict: "disclosure_id,action_type" });
  return { status, url, title: extracted.title };
}

async function processSource(source: SourceRow, dryRun: boolean) {
  const supabase = getSupabaseClient();
  const root = await fetchAllowed(source.source_url, source, !source.checkpoint?.cursor); if (root.status === 304) return { source: source.source_url, status: "not_modified", documents: [] }; if (!root.ok) throw new Error(`Source returned ${root.status}`);
  const body = await root.text(); const urls = source.source_type === "html" ? discoverLinks(body, source.source_url, source.source_domain) : [...body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]).filter((url) => isAllowedUrl(url, source.source_domain)).slice(0, 50); if (!urls.length) urls.push(source.source_url);
  const start = Math.min(Number(source.checkpoint?.cursor || 0), Math.max(0, urls.length - 1)); const batch = urls.slice(start, start + 8); const nextCursor = start + batch.length >= urls.length ? 0 : start + batch.length;
  const documents = []; for (const url of batch) { try { documents.push(await processDocument(source, url, dryRun)); } catch (error) { documents.push({ status: "failed", url, error: error instanceof Error ? error.message : String(error) }); } await sleep(source.rate_limit_ms); }
  if (!dryRun) await supabase.from("stock_disclosure_sources").update({ etag: root.headers.get("etag"), last_modified: root.headers.get("last-modified"), last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null, checkpoint: { cursor: nextCursor, last_url: batch.at(-1), completed_at: new Date().toISOString() } }).eq("id", source.id);
  return { source: source.source_url, status: nextCursor === 0 ? "complete" : "partial", next_cursor: nextCursor, documents };
}

export async function handleRequest(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (accessToken) => {
      const userClient = createClient(supabaseUrl, getSupabasePublishableKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await userClient.auth.getUser(accessToken);
      return error ? null : data.user?.id ?? null;
    },
    isAdmin: async (userId) => {
      const adminClient = createClient(supabaseUrl, getSupabaseSecretKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });

  if (!authorization.ok) {
    return json(
      { error: authorization.status === 401 ? "Unauthorized" : "Forbidden" },
      authorization.status,
    );
  }

  const supabase = getSupabaseClient();
  const body = await request.json().catch(() => ({})); const dryRun = body.dry_run === true;
  let query = supabase.from("stock_disclosure_sources").select("*, stocks!inner(symbol,name)").eq("is_enabled", true).order("source_domain"); if (body.source_id) query = query.eq("id", body.source_id);
  const { data, error } = await query; if (error) return json({ error: error.message }, 500); const report = [];
  for (const source of (data || []) as SourceRow[]) { try { report.push(await processSource(source, dryRun)); } catch (failure) { const message = failure instanceof Error ? failure.message : String(failure); report.push({ source: source.source_url, status: "failed", error: message }); if (!dryRun) await supabase.from("stock_disclosure_sources").update({ last_checked_at: new Date().toISOString(), last_error: message }).eq("id", source.id); } }
  return json({ dry_run: dryRun, sources: report.length, report });
}

if (import.meta.main) Deno.serve(handleRequest);
