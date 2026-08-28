import { spawnSync } from "node:child_process";

const budgets = new Map([
  ["@typescript-eslint/no-explicit-any", 300],
  ["react-hooks/exhaustive-deps", 33],
  ["react-refresh/only-export-components", 26],
]);

const result = spawnSync("npx", ["eslint", ".", "--format", "json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error(`Unable to run ESLint: ${result.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout || "[]");
} catch {
  console.error("Unable to parse ESLint JSON output.");
  console.error(result.stderr);
  process.exit(1);
}

const counts = new Map();
for (const file of report) {
  for (const message of file.messages ?? []) {
    const rule = message.ruleId ?? "parser";
    counts.set(rule, (counts.get(rule) ?? 0) + 1);
  }
}

const failures = [];
for (const [rule, count] of counts) {
  const budget = budgets.get(rule);
  if (budget === undefined) failures.push(`${rule}: ${count} new unbudgeted finding(s)`);
  else if (count > budget) failures.push(`${rule}: ${count} exceeds budget ${budget}`);
}

for (const [rule, budget] of budgets) {
  const count = counts.get(rule) ?? 0;
  console.log(`${rule}: ${count}/${budget}`);
}

if (failures.length > 0) {
  console.error("Lint debt increased:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Lint budget passed. Existing debt may decrease but cannot increase.");
