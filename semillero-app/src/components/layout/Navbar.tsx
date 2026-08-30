"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getJourneyDestination } from "@/lib/journey";
import { useAppState } from "@/lib/state/AppStateContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAuth } from "@/lib/auth/AuthContext";

const FLOW_CONTEXT = [
  { prefix: "/registro", label: "Registro en curso" },
  { prefix: "/skills", label: "Exploración en curso" },
  { prefix: "/perfil", label: "Resumen del recorrido" },
  { prefix: "/enviar", label: "Envío final" },
  { prefix: "/evaluador", label: "Banco de aspirantes" },
  { prefix: "/admin", label: "Administración" },
] as const;

function Brand({ linked }: { linked: boolean }) {
  const content = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-action to-cyan font-heading text-sm font-bold text-[#061827]">
        SR
      </span>
      <span className="hidden font-heading text-sm font-semibold tracking-wide text-ink sm:inline">
        Semillero de Robótica
      </span>
    </>
  );

  if (!linked) {
    return (
      <div className="flex shrink-0 items-center gap-2" aria-label="Semillero de Robótica">
        {content}
      </div>
    );
  }

  return (
    <Link
      href="/"
      aria-label="Semillero de Robótica, inicio"
      className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan"
    >
      {content}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { state, hydrated, startSession } = useAppState();
  const isLanding = pathname === "/";
  const isLogin = pathname === "/login";
  const isPublic = isLanding || isLogin;
  const hasSavedJourney = hydrated && getJourneyDestination(state).isReturning;
  const routeContext =
    FLOW_CONTEXT.find(({ prefix }) => pathname.startsWith(prefix))?.label ??
    "Recorrido en curso";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-night/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
        <Brand linked={isPublic} />

        {isLanding ? (
          <nav aria-label="Navegación principal" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <div className="hidden items-center gap-1 sm:flex sm:gap-2">
              <a
                href="#experiencia"
                className="rounded-lg px-2.5 py-2 text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:px-3"
              >
                La experiencia
              </a>
              <a
                href="#semillero"
                className="rounded-lg px-2.5 py-2 text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:px-3"
              >
                El semillero
              </a>
            </div>
            <Link
              href="/login"
              className="rounded-lg border border-cyan/25 bg-cyan/5 px-3 py-2 font-semibold text-cyan transition-colors hover:border-cyan/45 hover:bg-cyan/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              Iniciar sesión
            </Link>
          </nav>
        ) : isLogin ? (
          <nav aria-label="Opciones de acceso" className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-2 text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan sm:px-3"
            >
              Volver al inicio
            </Link>
            {hydrated && !hasSavedJourney && (
              <Link
                href="/registro"
                onClick={startSession}
                className="rounded-lg border border-cyan/25 bg-cyan/5 px-3 py-2 font-semibold text-cyan transition-colors hover:border-cyan/45 hover:bg-cyan/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              >
                Registrarme
              </Link>
            )}
          </nav>
        ) : (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <p
              className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted sm:text-xs"
              aria-label={`Etapa actual: ${routeContext}`}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_10px_rgba(53,196,232,0.65)]"
              />
              <span className="max-w-28 truncate sm:max-w-none">{routeContext}</span>
            </p>
            <span aria-hidden="true" className="hidden h-4 w-px bg-line sm:block" />
            {pathname.startsWith("/admin") || pathname.startsWith("/evaluador") ? (
              <span className="rounded-full border border-line bg-surface/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                {auth.role === "admin" ? "Administrador" : "Evaluador"}
              </span>
            ) : <SaveIndicator />}
          </div>
        )}
      </div>
    </header>
  );
}
