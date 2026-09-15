import fs from "node:fs";
import path from "node:path";

const migrationDir = path.resolve("supabase/migrations");
const file = fs.readdirSync(migrationDir).find((name) => name.endsWith("_universal_financial_query_catalog.sql"));
if (!file) throw new Error("universal financial query migration is missing");
const sql = fs.readFileSync(path.join(migrationDir, file), "utf8").toLowerCase();

const required = [
  "create table public.financial_entities",
  "create table public.financial_entity_aliases",
  "create table public.financial_entity_relations",
  "create table public.query_resolution_events",
  "enable row level security",
  "security_invoker = true",
  "revoke all on public.query_resolution_events from anon, authenticated",
  "create policy \"admins can read query resolution events\"",
  "create trigger sync_financial_entity_funds",
  "create trigger sync_financial_entity_stocks",
  "create trigger sync_financial_entity_rates",
  "create trigger sync_financial_entity_commodities",
  "'calculator:investment'",
  "'portfolio:holdings'",
  "'news:markets'",
];

const missing = required.filter((needle) => !sql.includes(needle));
if (missing.length) throw new Error(`migration missing required clauses: ${missing.join(", ")}`);
if (/query_resolution_events[\s\S]*?for insert to anon/.test(sql)) throw new Error("anonymous clients must not insert review events directly");

console.log("universal query schema verified");
