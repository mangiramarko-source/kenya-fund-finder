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
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

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
          // Fire and forget - no await
          checkAdmin(session.user.id);
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
