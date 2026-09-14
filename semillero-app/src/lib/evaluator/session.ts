"use client";

import { useCallback, useEffect, useState } from "react";
import { verifyEvaluatorCredentials } from "./auth";

const EVALUATOR_SESSION_KEY = "semillero-evaluator-session";

export interface EvaluatorSession {
  username: string;
  loginAt: number;
}

function readStoredSession(): EvaluatorSession | null {
  try {
    const raw = window.sessionStorage.getItem(EVALUATOR_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EvaluatorSession>;
    if (typeof parsed.username !== "string" || typeof parsed.loginAt !== "number") return null;
    return { username: parsed.username, loginAt: parsed.loginAt };
  } catch {
    return null;
  }
}

export function useEvaluatorSession() {
  const [hydrated, setHydrated] = useState(false);
  const [evaluator, setEvaluator] = useState<EvaluatorSession | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvaluator(readStoredSession());
    setHydrated(true);
  }, []);

  const login = useCallback((username: string, password: string) => {
    if (!verifyEvaluatorCredentials(username, password)) return false;
    const session: EvaluatorSession = { username: username.trim(), loginAt: Date.now() };
    window.sessionStorage.setItem(EVALUATOR_SESSION_KEY, JSON.stringify(session));
    setEvaluator(session);
    return true;
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(EVALUATOR_SESSION_KEY);
    setEvaluator(null);
  }, []);

  return { hydrated, evaluator, login, logout };
}
