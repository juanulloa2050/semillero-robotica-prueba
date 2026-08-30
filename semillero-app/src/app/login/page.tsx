"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAppState } from "@/lib/state/AppStateContext";
import { getJourneyDestination } from "@/lib/journey";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { state, startSession } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.configured || auth.loading || !auth.user || !auth.role) return;
    router.replace(
      auth.role === "candidate"
        ? getJourneyDestination(state).href
        : auth.role === "admin"
          ? "/admin"
          : "/evaluador"
    );
  }, [auth.configured, auth.loading, auth.role, auth.user, router, state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const normalized = email.trim().toLowerCase();

    if (!auth.configured) {
      const storedEmail = state.profile.email.trim().toLowerCase();
      if (!storedEmail || storedEmail !== normalized) {
        setError("No encontramos ese correo en el recorrido guardado en este dispositivo.");
        return;
      }
      startSession();
      router.replace(getJourneyDestination(state).href);
      return;
    }

    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }
    setSubmitting(true);
    const authError = await auth.signIn(normalized, password);
    setSubmitting(false);
    if (authError) setError(toSpanishAuthError(authError));
  }

  async function recoverPassword() {
    if (!email.trim()) {
      setError("Escribe primero el correo de la cuenta.");
      return;
    }
    setSubmitting(true);
    const authError = await auth.resetPassword(email.trim().toLowerCase());
    setSubmitting(false);
    if (authError) setError(toSpanishAuthError(authError));
    else setNotice("Te enviamos un enlace de recuperación si la cuenta existe.");
  }

  if (auth.loading || (auth.configured && auth.user)) return <Loading />;

  return (
    <div className="hero-gradient min-h-[calc(100svh-4rem)] px-5 py-12 sm:py-16">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-cyan/20 bg-surface/90 shadow-[0_28px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-action via-cyan to-tech" />
        <div className="p-6 sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/25 bg-cyan/10 text-xl text-cyan" aria-hidden="true">↗</div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Acceso seguro</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink">Continúa tu recorrido.</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            {auth.configured
              ? "Aspirantes y evaluadores usan la misma entrada; el sistema abre el panel correspondiente a su rol."
              : "Modo local: Supabase no está configurado. El acceso sólo recupera datos de este navegador."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <label className="block text-sm font-semibold text-ice">
              Correo
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-line bg-night/65 px-4 text-sm text-ink outline-none focus:border-cyan" placeholder="nombre@unisabana.edu.co" />
            </label>
            {auth.configured && (
              <label className="block text-sm font-semibold text-ice">
                Contraseña
                <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-line bg-night/65 px-4 text-sm text-ink outline-none focus:border-cyan" />
              </label>
            )}
            <div aria-live="polite" className="min-h-6 text-xs">
              {error && <p role="alert" className="text-danger">{error}</p>}
              {notice && <p className="text-ok">{notice}</p>}
            </div>
            <button disabled={submitting} className="min-h-12 w-full rounded-xl bg-gradient-to-r from-action to-tech px-6 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? "Verificando…" : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link href="/registro" onClick={startSession} className="font-semibold text-cyan hover:underline">Crear cuenta de aspirante</Link>
            {auth.configured && <button type="button" onClick={recoverPassword} className="text-muted hover:text-ink">Olvidé mi contraseña</button>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Loading() {
  return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">Abriendo tu cuenta…</div>;
}

function toSpanishAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (normalized.includes("email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  if (normalized.includes("rate limit")) return "Hay demasiados intentos. Espera unos minutos.";
  return message;
}
