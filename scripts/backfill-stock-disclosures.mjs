import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const checkpointPath = path.resolve(".stock-disclosures-backfill.json");
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")]; }));
const baseUrl = env.VITE_SUPABASE_URL || `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.DISCLOSURES_WEBHOOK_SECRET || env.DISCLOSURES_WEBHOOK_SECRET;
if (!baseUrl || !key) throw new Error("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, "utf8")) : { attempts: [] };
const response = await fetch(`${baseUrl}/functions/v1/fetch-stock-disclosures`, { method: "POST", headers: { Authorization: `Bearer ${key}`, apikey: key, "content-type": "application/json", ...(secret ? { "x-webhook-secret": secret } : {}) }, body: JSON.stringify({ mode: "backfill", dry_run: !apply }) });
const report = await response.json(); checkpoint.attempts.push({ at: new Date().toISOString(), apply, ok: response.ok, report }); fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
console.log(JSON.stringify(report, null, 2)); if (!response.ok) process.exit(1);
