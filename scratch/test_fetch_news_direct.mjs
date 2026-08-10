import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envFile = fs.readFileSync(envPath, "utf8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [key, ...val] = line.split("=");
  if (key && val) {
    env[key.trim()] = val.join("=").trim();
  }
});

const supabaseUrl = env["VITE_SUPABASE_URL"] || env["SUPABASE_URL"];
const supabaseKey = env["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Invoking fetch-news edge function...");
  const start = Date.now();
  const { data, error } = await supabase.functions.invoke("fetch-news", {
    body: { cron_secret: supabaseKey },
  });

  console.log(`Finished in ${Date.now() - start}ms`);
  if (error) {
    console.error("Error calling fetch-news:", error);
  } else {
    console.log("Result:", JSON.stringify(data, null, 2));
  }
}

main();
