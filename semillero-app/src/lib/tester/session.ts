"use client";

import { useCallback, useEffect, useState } from "react";

// Correo mágico temporal para el modo espectador/tester: sin contraseña ni
// ningún otro paso de seguridad por ahora. Deja de tener sentido en cuanto
// exista un registro real de evaluadores/testers institucional.
export const TESTER_EMAIL = "tester@unisabana.edu.co";

const TESTER_SESSION_KEY = "semillero-tester-session";

export function isTesterEmail(email: string): boolean {
  return email.trim().toLowerCase() === TESTER_EMAIL;
}

export function useTesterSession() {
  const [hydrated, setHydrated] = useState(false);
  const [testerActive, setTesterActive] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTesterActive(window.sessionStorage.getItem(TESTER_SESSION_KEY) === "true");
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const activateTester = useCallback(() => {
    try {
      window.sessionStorage.setItem(TESTER_SESSION_KEY, "true");
    } catch {
      // ignore
    }
    setTesterActive(true);
  }, []);

  const deactivateTester = useCallback(() => {
    try {
      window.sessionStorage.removeItem(TESTER_SESSION_KEY);
    } catch {
      // ignore
    }
    setTesterActive(false);
  }, []);

  return { hydrated, testerActive, activateTester, deactivateTester };
}
