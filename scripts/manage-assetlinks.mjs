#!/usr/bin/env node
/**
 * Validates and manages multi-fingerprint Digital Asset Links in public/.well-known/assetlinks.json.
 *
 * Usage:
 *   node scripts/manage-assetlinks.mjs                        # Validate current assetlinks.json
 *   node scripts/manage-assetlinks.mjs --add "AA:BB:...:FF"   # Append a store-managed signing fingerprint
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ASSETLINKS_PATH = resolve("public/.well-known/assetlinks.json");
const SHA256_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const PLACEHOLDER_FP =
  "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00";

const raw = JSON.parse(readFileSync(ASSETLINKS_PATH, "utf8"));
if (!Array.isArray(raw) || raw.length === 0) {
  throw new Error("assetlinks.json must be a non-empty JSON array");
}

const entry = raw[0];
const fingerprints = entry?.target?.sha256_cert_fingerprints;
if (!Array.isArray(fingerprints)) {
  throw new Error("assetlinks.json target.sha256_cert_fingerprints must be an array");
}

const addIndex = process.argv.indexOf("--add");
if (addIndex >= 0) {
  const candidate = (process.argv[addIndex + 1] || "").trim().toUpperCase();
  if (!SHA256_RE.test(candidate) || candidate === PLACEHOLDER_FP) {
    throw new Error(`Invalid or placeholder SHA-256 fingerprint: ${candidate}`);
  }
  if (!fingerprints.includes(candidate)) {
    fingerprints.push(candidate);
    writeFileSync(ASSETLINKS_PATH, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    console.log(`[assetlinks] Added SHA-256 fingerprint: ${candidate}`);
  } else {
    console.log(`[assetlinks] Fingerprint already present: ${candidate}`);
  }
}

for (const fp of fingerprints) {
  if (!SHA256_RE.test(fp) || fp === PLACEHOLDER_FP) {
    throw new Error(`Invalid or placeholder SHA-256 fingerprint in assetlinks.json: ${fp}`);
  }
}

console.log(
  `[assetlinks] Validated ${fingerprints.length} SHA-256 fingerprint(s) for package ${entry.target.package_name}`
);
