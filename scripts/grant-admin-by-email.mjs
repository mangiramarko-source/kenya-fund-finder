/**
 * Grant admin role to a Supabase auth user by email.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (Dashboard → Settings → API).
 *
 * Usage:
 *   node scripts/grant-admin-by-email.mjs kokoscalbaridi@gmail.com
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/grant-admin-by-email.mjs <email>");
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

function jwtRef(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).ref;
  } catch {
    return null;
  }
}

const urlRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const keyRef = jwtRef(serviceKey);
if (urlRef && keyRef && urlRef !== keyRef) {
  console.error("Supabase project mismatch:");
  console.error(`  VITE_SUPABASE_URL project: ${urlRef}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY project: ${keyRef}`);
  console.error("");
  console.error("Copy the service_role key from the same project as VITE_SUPABASE_URL:");
  console.error(`  https://supabase.com/dashboard/project/${urlRef}/settings/api`);
  console.error("");
  console.error("Or run this SQL in that project's SQL Editor:");
  console.error(`  https://supabase.com/dashboard/project/${urlRef}/sql/new`);
  console.error(`
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = '${email}'
ON CONFLICT (user_id, role) DO NOTHING;
`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === targetEmail);
    if (match) return match;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No auth user found for ${email}.`);
  console.error("Create the account first at /auth (sign up), then run this script again.");
  process.exit(1);
}

const { data: existing, error: readError } = await admin
  .from("user_roles")
  .select("id, role")
  .eq("user_id", user.id)
  .eq("role", "admin")
  .maybeSingle();

if (readError) {
  console.error("Failed to read user_roles:", readError.message);
  process.exit(1);
}

if (existing) {
  console.log(`Already admin: ${email} (${user.id})`);
  process.exit(0);
}

const { error: insertError } = await admin.from("user_roles").insert({
  user_id: user.id,
  role: "admin",
});

if (insertError) {
  console.error("Failed to grant admin:", insertError.message);
  process.exit(1);
}

console.log(`Granted admin to ${email} (${user.id})`);
