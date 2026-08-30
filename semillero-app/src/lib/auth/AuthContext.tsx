"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export type UserRole = "candidate" | "evaluator" | "admin";

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRole(value: unknown): value is UserRole {
  return value === "candidate" || value === "evaluator" || value === "admin";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  const loadRole = useCallback(async (userId: string | null) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) {
      setRole(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    setRole(isRole(data?.role) ? data.role : "candidate");
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let active = true;
    const initializationTimeout = window.setTimeout(() => {
      if (!active) return;
      setUser(null);
      setRole(null);
      setLoading(false);
    }, 4000);

    void supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!active) return;
        const nextUser = data.session?.user ?? null;
        setUser(nextUser);
        await loadRole(nextUser?.id ?? null);
        if (active) setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setRole(null);
        setLoading(false);
      })
      .finally(() => window.clearTimeout(initializationTimeout));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        void loadRole(nextUser?.id ?? null).finally(() => {
          if (active) setLoading(false);
        });
      }
    );

    return () => {
      active = false;
      window.clearTimeout(initializationTimeout);
      subscription.subscription.unsubscribe();
    };
  }, [loadRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return "Supabase todavía no está configurado.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return "Supabase todavía no está configurado.";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return error ? error.message : null;
    },
    []
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return "Supabase todavía no está configurado.";
    const redirectTo = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return error ? error.message : null;
  }, []);

  const value = useMemo(
    () => ({
      configured,
      loading,
      user,
      role,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [configured, loading, resetPassword, role, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
