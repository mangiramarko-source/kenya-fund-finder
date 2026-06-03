/**
 * Apply a SQL migration file to the linked Supabase Postgres database.
 *
 * Requires in .env (Dashboard → Settings → Database → Connection string → URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Usage:
 *   node scripts/apply-repair-schema.mjs
 *   node scripts/apply-repair-schema.mjs path/to/file.sql
 */

import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const defaultSql = resolve(
  root,
  "supabase/migrations/20260530140000_repair_price_history_tables.sql"
);

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const sqlPath = process.argv[2] ? resolve(process.argv[2]) : defaultSql;

if (!dbUrl) {
  console.error(
    "\nMissing SUPABASE_DB_URL (or DATABASE_URL) in .env.\n" +
      "Get it from Supabase Dashboard → Settings → Database → Connection string (URI).\n" +
      "Then run: node scripts/apply-repair-schema.mjs\n"
  );
  process.exit(1);
}

if (!existsSync(sqlPath)) {
  console.error(`SQL file not found: ${sqlPath}`);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Connected. Applying:", sqlPath);
  await client.query(sql);
  console.log("Schema repair applied successfully.");
} catch (e) {
  console.error("\nSchema apply failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
