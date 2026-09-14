"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { useAppState } from "@/lib/state/AppStateContext";
import { useEvaluatorSession } from "@/lib/evaluator/session";
import { useAuth } from "@/lib/auth/AuthContext";

export default function EvaluatorLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const reduceMotion = Boolean(useReducedMotion());
  const { state, sessionActive: candidateSessionActive, endSession: endCandidateSession } = useAppState();
  const { hydrated, evaluator, login, logout } = useEvaluatorSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.loading && auth.configured) router.replace("/login");
  }, [auth.configured, auth.loading, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = login(username, password);
    if (!ok) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    setError("");
    setPassword("");
    router.replace("/evaluador");
  }

  if (!hydrated || auth.loading || auth.configured) {
    return <EvaluatorLoginLoading message="Verificando sesión…" />;
  }

  return (
    <div className="hero-gradient relative isolate min-h-[calc(100svh-4rem)] overflow-hidden px-5 py-12 sm:px-6 sm:py-16">
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute -left-32 top-12 h-80 w-80 rounded-full bg-cyan/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-tech/10 blur-3xl" />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        aria-labelledby="evaluator-login-title"
        className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-cyan/20 bg-surface/90 shadow-[0_28px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl"
      >
        <div className="h-1 bg-gradient-to-r from-action via-cyan to-tech" />
        <div className="p-6 sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/25 bg-cyan/10 text-cyan">
            <EvaluatorIcon />
          </div>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Panel de evaluación</p>
          <h1
            id="evaluator-login-title"
            className="mt-3 text-balance font-heading text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl"
          >
            Acceso de evaluador
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Ingresa con tu usuario y contraseña de evaluador para revisar los recorridos de los candidatos.
          </p>

          {evaluator && (
            <AccountBanner
              message={
                <>
                  Ya iniciaste sesión como <span className="text-ice">{evaluator.username}</span> en este dispositivo.
                </>
              }
              primaryLabel="Ir al panel"
              onPrimary={() => router.replace("/evaluador")}
              secondaryLabel="Cerrar sesión"
              onSecondary={logout}
            />
          )}

          {candidateSessionActive && (
            <AccountBanner
              message={
                <>
                  Hay una sesión de candidato activa en este dispositivo
                  {state.profile.email ? (
                    <>
                      {" "}
                      (<span className="text-ice">{state.profile.email}</span>)
                    </>
                  ) : null}
                  .
                </>
              }
              secondaryLabel="Cerrar esa sesión"
              onSecondary={endCandidateSession}
            />
          )}

          {!evaluator && (
            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              <div>
                <label htmlFor="evaluator-username" className="block text-sm font-semibold text-ice">
                  Usuario
                </label>
                <input
                  id="evaluator-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="evaluador_1"
                  className="mt-2 min-h-12 w-full rounded-xl border border-line bg-night/65 px-4 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted/65 focus:border-cyan/70 focus:shadow-[0_0_0_3px_rgba(132,182,215,0.14)]"
                />
              </div>

              <div>
                <label htmlFor="evaluator-password" className="block text-sm font-semibold text-ice">
                  Contraseña
                </label>
                <input
                  id="evaluator-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "evaluator-login-error" : undefined}
                  placeholder="••••••••"
                  className="mt-2 min-h-12 w-full rounded-xl border border-line bg-night/65 px-4 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted/65 focus:border-cyan/70 focus:shadow-[0_0_0_3px_rgba(132,182,215,0.14)]"
                />
              </div>

              <div aria-live="polite" className="min-h-6">
                {error && (
                  <p id="evaluator-login-error" role="alert" className="text-xs leading-5 text-danger">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-action to-tech px-6 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(2,56,125,0.34)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(2,56,125,0.46)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Entrar al panel
                <ArrowIcon />
              </button>
            </form>
          )}

          <div className="mt-7 flex gap-3 rounded-2xl border border-cyan/15 bg-cyan/[0.045] p-4 text-xs leading-5 text-muted">
            <span className="mt-0.5 shrink-0 text-cyan" aria-hidden="true">
              <InfoIcon />
            </span>
            <p>
              Credenciales temporales de prueba (usuario <span className="text-ice">evaluador_1</span>, contraseña{" "}
              <span className="text-ice">evaluador</span>). Más adelante cada evaluador tendrá su propio correo
              institucional y una contraseña independiente.
            </p>
          </div>

          <Link
            href="/login"
            className="mt-6 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-cyan hover:text-ice"
          >
            <BackIcon />
            Volver al acceso de candidatos
          </Link>
        </div>
      </motion.section>
    </div>
  );
}

function AccountBanner({
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  message: React.ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-night/45 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-5 text-muted">{message}</p>
      <div className="flex shrink-0 gap-2">
        {primaryLabel && onPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-gradient-to-r from-action to-tech px-3 text-xs font-semibold text-white transition-[transform,box-shadow] hover:-translate-y-0.5"
          >
            {primaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onSecondary}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan transition-colors hover:border-cyan/50 hover:bg-cyan/15"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

function EvaluatorLoginLoading({ message }: { message: string }) {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-night px-6" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted/25 border-t-cyan" aria-hidden="true" />
        {message}
      </div>
    </div>
  );
}

function EvaluatorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.6-3.6 3.4-6 7-6s6.4 2.4 7 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m15.5 15.5 2 2 3.5-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9v4m0-6.5v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M16 10H5m0 0 4-4m-4 4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
