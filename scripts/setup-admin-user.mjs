/**
 * Create (or find) a Supabase auth user and grant admin role.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY for the SAME project as VITE_SUPABASE_URL.
 *
 * Usage:
 *   node scripts/setup-admin-user.mjs kokoscalbaridi@gmail.com 'YourPassword123'
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
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/setup-admin-user.mjs <email> '<password>'");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
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
  console.error(`  App (VITE_SUPABASE_URL): ${urlRef}`);
  console.error(`  Service key:             ${keyRef}`);
  console.error("");
  console.error(`Fix: copy service_role from https://supabase.com/dashboard/project/${urlRef}/settings/api`);
  console.error(`into .env as SUPABASE_SERVICE_ROLE_KEY, then rerun this command.`);
  console.error("");
  console.error("Or create the user manually:");
  console.error(`  https://supabase.com/dashboard/project/${urlRef}/auth/users`);
  console.error("  → Add user → email + password → Auto Confirm User ✓");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === targetEmail);
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

let user = await findUserByEmail(email);

if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Failed to create user:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`Created user: ${email}`);
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("User exists but password update failed:", error.message);
    process.exit(1);
  }
  console.log(`Updated password for existing user: ${email}`);
}

const { data: existing } = await admin
  .from("user_roles")
  .select("id")
  .eq("user_id", user.id)
  .eq("role", "admin")
  .maybeSingle();

if (!existing) {
  const { error: insertError } = await admin.from("user_roles").insert({
    user_id: user.id,
    role: "admin",
  });
  if (insertError) {
    console.error("Failed to grant admin:", insertError.message);
    process.exit(1);
  }
  console.log("Granted admin role.");
} else {
  console.log("Already has admin role.");
}

console.log(`Done. Sign in at /admin/login with ${email} and your password.`);
