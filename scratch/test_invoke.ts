import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFetch() {
  console.log("Signing in with anon key...");
  
  const email = "test_admin_" + Date.now() + "@example.com";
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "Password123!",
    email_confirm: true,
  });

  if (authError) {
    console.error("Failed to create user:", authError);
    return;
  }
  const userId = authData.user.id;
  console.log("Created user:", userId);

  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

  const { data: sessionData, error: sessionError } = await supabaseUser.auth.signInWithPassword({
    email,
    password: "Password123!"
  });

  if (sessionError) {
    console.error("Sign in failed:", sessionError);
    return;
  }

  console.log("Invoking fetch-news edge function with JWT...");
  const { data, error } = await supabaseUser.functions.invoke("fetch-news", {
    method: "POST",
    body: {}
  });

  console.log("Data:", data);
  if (error) {
    console.error("Error invoking:", error);
    if (error.context) {
      const text = await error.context.text().catch(() => 'no text');
      console.error("Context text:", text);
    }
  }

  // Cleanup
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

testFetch();
