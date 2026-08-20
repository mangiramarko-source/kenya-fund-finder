type NamedKeys = Record<string, string>;

function parseNamedKeys(raw: string | undefined, variableName: string): NamedKeys {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed as NamedKeys;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${variableName} is invalid: ${message}`);
  }
}

export function readNamedSecretKey(
  raw: string | undefined,
  name: string,
): string | null {
  const value = parseNamedKeys(raw, "SUPABASE_SECRET_KEYS")[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function getSupabaseSecretKey(name = "default"): string {
  const named = readNamedSecretKey(Deno.env.get("SUPABASE_SECRET_KEYS"), name);
  const single = name === "default" ? Deno.env.get("SUPABASE_SECRET_KEY") : null;
  const value = named || single;

  if (!value) {
    throw new Error(`Supabase secret key "${name}" is not configured`);
  }

  return value;
}

export function getSupabasePublishableKey(name = "default"): string {
  const named = parseNamedKeys(
    Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
    "SUPABASE_PUBLISHABLE_KEYS",
  )[name];
  const single = name === "default"
    ? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")
    : null;
  const value = named || single;

  if (!value) {
    throw new Error(`Supabase publishable key "${name}" is not configured`);
  }

  return value;
}
