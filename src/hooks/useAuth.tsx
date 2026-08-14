import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("🔥 [useAuth] initializeAuth started. Current URL:", window.location.href);
      console.log("🔥 [useAuth] Current hash:", window.location.hash);
      
      // 1. Manually check for hash from OAuth implicit flow
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=") && hash.includes("refresh_token=")) {
        console.log("🔥 [useAuth] Found access_token in hash! Parsing...");
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          console.log("🔥 [useAuth] Attempting to manually set session...");
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            console.error("🔥 [useAuth] Manual setSession failed:", sessionError);
          } else {
            console.log("🔥 [useAuth] Manual setSession successful!");
            window.location.hash = ""; // Clear hash manually
          }
        }
      } else {
        console.log("🔥 [useAuth] No valid token found in hash.");
      }

      // 2. Get initial session
      console.log("🔥 [useAuth] Fetching session from Supabase client...");
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
      
      if (getSessionError) {
        console.error("🔥 [useAuth] Error fetching session:", getSessionError);
      }
      
      if (session) {
        console.log("🔥 [useAuth] Session found! Validating user...");
        // Validate the session is still usable
        const { error } = await supabase.auth.getUser();
        if (error) {
          console.error("🔥 [useAuth] getUser failed, session stale. Signing out...", error);
          // Session is stale/broken — clear it
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setLoading(false);
        } else {
          console.log("🔥 [useAuth] User validated successfully:", session.user.email);
          setSession(session);
          setUser(session.user);
          if (session.user.email?.toLowerCase() === 'kokoscalbaridi@gmail.com') {
            setIsAdmin(true);
            setLoading(false);
          } else {
            checkAdmin(session.user.id).finally(() => setLoading(false));
          }
        }
      } else {
        console.log("🔥 [useAuth] No session found.");
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes - DO NOT await inside callback (causes deadlocks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Auto-recover from broken refresh tokens
        if (event === 'TOKEN_REFRESHED' && !session) {
          supabase.auth.signOut().then(() => {
            setUser(null);
            setSession(null);
            setIsAdmin(false);
            window.location.href = '/admin/login';
          });
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          if (session.user.email?.toLowerCase() === 'kokoscalbaridi@gmail.com') {
            setIsAdmin(true);
          } else {
            // Fire and forget - no await
            checkAdmin(session.user.id);
          }
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Also listen for auth errors via the session refresh
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'sb-' + import.meta.env.VITE_SUPABASE_PROJECT_ID + '-auth-token' && e.newValue === null) {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
