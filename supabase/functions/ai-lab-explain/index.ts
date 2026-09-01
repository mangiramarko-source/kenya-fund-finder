// Deprecated in favour of ai-lab-chat. Keeping this small authenticated
// response prevents an older deployed browser bundle from spending Lovable or
// Gemini credits while clients roll forward.
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

Deno.serve((request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ ok: false, reason: "deprecated" }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
