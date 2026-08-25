import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase, SUPABASE_PROJECT_ID } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { identifyUser, resetUser } from "@/lib/analytics";

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
      // 1. Manually check for hash from OAuth implicit flow if present
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=") && hash.includes("refresh_token=")) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!sessionError && data.session) {
            identifyUser(data.session.user.id, { created_at: data.session.user.created_at });
            window.location.hash = ""; // Clear hash securely
          }
        }
      }

      // 2. Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Validate the session is still usable
        const { error } = await supabase.auth.getUser();
        if (error) {
          // Session is stale/broken — clear it
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          resetUser();
          setLoading(false);
        } else {
          setSession(session);
          setUser(session.user);
          identifyUser(session.user.id, { created_at: session.user.created_at });
          checkAdmin(session.user.id).finally(() => setLoading(false));
        }
      } else {
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
            resetUser();
            window.location.href = '/admin/login';
          });
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          identifyUser(session.user.id, { created_at: session.user.created_at });
          checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
          resetUser();
        }
      }
    );

    // Also listen for auth errors via the session refresh
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === `sb-${SUPABASE_PROJECT_ID}-auth-token` && e.newValue === null) {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        resetUser();
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
    resetUser();
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
