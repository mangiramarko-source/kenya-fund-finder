import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-keys.ts";
import {
  type AccountDeletionDependencies,
  type AccountDeletionStage,
  handleDeleteAccountRequest,
} from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("Missing Supabase URL");

    const authClient = createClient(supabaseUrl, getSupabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, getSupabaseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const dependencies: AccountDeletionDependencies = {
      async getUser(accessToken) {
        const { data, error } = await authClient.auth.getUser(accessToken);
        if (error || !data.user) return null;
        return { id: data.user.id, email: data.user.email };
      },
      async isAdmin(user) {
        // Keep this server-side guard aligned with the legacy administrator
        // identity already recognized by the application auth context.
        if (user.email?.trim().toLowerCase() === "kokoscalbaridi@gmail.com") {
          return true;
        }
        const { data, error } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (error) throw error;
        return Boolean(data);
      },
      async listAvatarPaths(userId) {
        const paths: string[] = [];
        const pendingPrefixes = [userId];
        const visitedPrefixes = new Set<string>();
        const pageSize = 100;
        while (pendingPrefixes.length > 0) {
          const prefix = pendingPrefixes.shift()!;
          if (visitedPrefixes.has(prefix)) continue;
          visitedPrefixes.add(prefix);

          for (let offset = 0;; offset += pageSize) {
            const { data, error } = await adminClient.storage.from("avatars")
              .list(prefix, {
                limit: pageSize,
                offset,
                sortBy: { column: "name", order: "asc" },
              });
            if (error) throw error;
            const entries = data ?? [];
            for (const entry of entries) {
              const path = `${prefix}/${entry.name}`;
              if (entry.id) paths.push(path);
              else if (
                entry.name && entry.name !== "." && entry.name !== ".."
              ) pendingPrefixes.push(path);
            }
            if (paths.length + pendingPrefixes.length > 10_000) {
              throw new Error("Avatar listing exceeded safety limit");
            }
            if (entries.length < pageSize) break;
          }
        }
        return paths;
      },
      async removeAvatarPaths(paths) {
        for (const batch of chunk(paths, 1_000)) {
          const { error } = await adminClient.storage.from("avatars").remove(
            batch,
          );
          if (error) throw error;
        }
      },
      async deleteCommunicationOutbox(userId) {
        const { error } = await adminClient.from("communication_outbox")
          .delete().eq("user_id", userId);
        if (error && error.code !== "42P01") throw error;
      },
      async deleteCommunicationSuppressions(email) {
        const { error } = await adminClient
          .from("communication_suppressions")
          .delete()
          .eq("email_normalized", email);
        if (error && error.code !== "42P01") throw error;
      },
      async deleteAuthUser(userId) {
        const { error } = await adminClient.auth.admin.deleteUser(
          userId,
          false,
        );
        if (error) throw error;
      },
      logFailure(stage: AccountDeletionStage, failedRequestId: string) {
        console.error("[delete-account] operation failed", {
          stage,
          request_id: failedRequestId,
        });
      },
    };

    return await handleDeleteAccountRequest(request, dependencies, {
      requestId,
      responseHeaders: corsHeaders,
    });
  } catch {
    console.error("[delete-account] operation failed", {
      stage: "unexpected",
      request_id: requestId,
    });
    return new Response(
      JSON.stringify({
        error: {
          code: "internal_error",
          message: "Account deletion is temporarily unavailable.",
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
});
