"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { BranchIcon } from "@/components/icons/BranchIcon";
import { BRANCHES, BRANCH_ORDER } from "@/lib/data/branches";
import { getJourneyDestination } from "@/lib/journey";
import { EASE_OUT } from "@/lib/motion";
import { useAppState } from "@/lib/state/AppStateContext";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.07, ease: EASE_OUT },
  }),
};

const PRINCIPLES = [
  {
    number: "01",
    title: "Exploración",
    body: "Elige por dónde comenzar, cambia de área y descubre qué despierta tu curiosidad.",
  },
  {
    number: "02",
    title: "Persistencia",
    body: "Puedes volver a intentarlo. Nos interesa cómo aprendes cuando algo no sale a la primera.",
  },
  {
    number: "03",
    title: "Construcción",
    body: "Tus decisiones, explicaciones y evidencias muestran mejor que una cifra lo que puedes aportar.",
  },
];

const JOURNEY_STEPS = [
  {
    number: "01",
    title: "Cuéntanos quién eres",
    body: "Completa tus datos y preséntate a tu manera: con texto, imágenes, audio, video o enlaces.",
  },
  {
    number: "02",
    title: "Explora siete ramas",
    body: "Empieza en el área que prefieras y avanza con libertad por retos de distintos enfoques.",
  },
  {
    number: "03",
    title: "Construye tu mapa",
    body: "Cada reto suma contexto a un perfil que refleja lo que decidiste explorar, aprender y crear.",
  },
];

const BEFORE_STARTING = [
  {
    title: "Explora con libertad",
    body: "No tienes que seguir una ruta única ni demostrar dominio en todas las áreas.",
  },
  {
    title: "Reintenta sin miedo",
    body: "Equivocarte hace parte del recorrido. Puedes revisar, aprender y volver a probar.",
  },
  {
    title: "Continúa cuando quieras",
    body: "Tu avance se guarda en este dispositivo para que puedas retomar desde el mismo punto.",
  },
];

const MAP_POSITIONS = [
  { x: 18, y: 18 },
  { x: 50, y: 8 },
  { x: 82, y: 20 },
  { x: 91, y: 56 },
  { x: 72, y: 86 },
  { x: 30, y: 89 },
  { x: 8, y: 59 },
] as const;

export default function LandingPage() {
  const { state, hydrated, sessionActive, startSession } = useAppState();
  const journey = getJourneyDestination(state);
  const reduceMotion = Boolean(useReducedMotion());
  const requiresLogin = journey.isReturning && !sessionActive;
  const primaryAction = requiresLogin
    ? {
        href: "/login",
        label: "Iniciar sesión para continuar",
        onStart: undefined,
      }
    : {
        href: journey.href,
        label: journey.label,
        onStart: startSession,
      };
  const journeyDetail = requiresLogin
    ? "Encontramos un recorrido guardado en este dispositivo. Inicia sesión para retomarlo."
    : journey.detail;

  return (
    <div className="relative overflow-hidden bg-night">
      <section className="hero-gradient relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-line">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />
        <div className="drift pointer-events-none absolute -right-32 top-12 h-96 w-96 rounded-full bg-tech/10 blur-3xl" />
        <div
          className="drift pointer-events-none absolute -left-28 bottom-0 h-80 w-80 rounded-full bg-cyan/10 blur-3xl"
          style={{ animationDelay: "-4s" }}
        />

        <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <motion.div
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              custom={0}
              variants={fadeUp}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-surface/55 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_12px_rgba(53,196,232,0.8)]" />
              Semillero de Robótica · Proceso de ingreso
            </motion.div>

            <motion.h1
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              custom={1}
              variants={fadeUp}
              className="text-balance font-heading text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl xl:text-7xl"
            >
              Explora hasta dónde
              <span className="block bg-gradient-to-r from-ice via-cyan to-tech bg-clip-text text-transparent">
                puedes llegar.
              </span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              custom={2}
              variants={fadeUp}
              className="mt-7 max-w-2xl text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8"
            >
              Esto no es un examen tradicional. Queremos conocerte, descubrir
              qué sabes hacer hoy y ver cómo exploras, aprendes y resuelves
              problemas.
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              custom={3}
              variants={fadeUp}
              className="mt-9 flex flex-col items-start gap-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <JourneyLink
                  href={primaryAction.href}
                  label={primaryAction.label}
                  ready={hydrated}
                  onStart={primaryAction.onStart}
                />
                <a
                  href="#semillero"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-night/25 px-6 text-sm font-semibold text-ink backdrop-blur transition-colors hover:border-tech/60 hover:bg-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-night"
                >
                  Conocer el semillero
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-4 w-4 text-muted transition-transform group-hover:translate-y-0.5"
                  >
                    <path d="M10 3v13m0 0 5-5m-5 5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
              <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted">
                {hydrated && journey.isReturning && (
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
                )}
                {hydrated ? journeyDetail : "Recuperando tu recorrido…"}
              </p>
            </motion.div>

            <motion.p
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              custom={4}
              variants={fadeUp}
              className="mt-14 text-xs font-semibold uppercase tracking-[0.2em] text-muted"
            >
              Explora <span className="mx-2 text-cyan/50">·</span> Construye
              <span className="mx-2 text-cyan/50">·</span> Muéstranos cómo piensas
            </motion.p>

            <CompactSkillMap reduceMotion={reduceMotion} />
          </div>

          <HeroSkillMap reduceMotion={reduceMotion} />
        </div>
      </section>

      <section id="experiencia" className="relative scroll-mt-20 border-b border-line px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="La experiencia"
            title="Aquí no buscamos una nota."
            body="Tu recorrido nos muestra qué decides explorar, dónde profundizas y qué haces cuando todavía no sabes la respuesta."
            reduceMotion={reduceMotion}
          />

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((principle, index) => (
              <motion.article
                key={principle.number}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: EASE_OUT }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface/55 p-6 transition-colors hover:border-tech/50"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="font-heading text-xs font-semibold tracking-[0.18em] text-cyan">
                  {principle.number}
                </span>
                <h3 className="mt-7 font-heading text-xl font-semibold text-ink">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{principle.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-line bg-[#071b2b] px-6 py-24 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(53,196,232,0.07),transparent_30rem)]" />
        <div className="relative mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Tu recorrido"
            title="Tres momentos. Tu propio camino."
            body="La experiencia empieza contigo y termina en un mapa de habilidades construido a partir de tus decisiones."
            reduceMotion={reduceMotion}
          />

          <div className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
            <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-5 hidden h-px bg-gradient-to-r from-cyan/20 via-cyan/60 to-cyan/20 md:block" />
            {JOURNEY_STEPS.map((step, index) => (
              <motion.article
                key={step.number}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.09, ease: EASE_OUT }}
                className="relative"
              >
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-cyan/45 bg-[#071b2b] font-heading text-xs font-semibold text-cyan shadow-[0_0_24px_rgba(53,196,232,0.09)]">
                  {step.number}
                </span>
                <h3 className="mt-6 font-heading text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{step.body}</p>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.18, ease: EASE_OUT }}
            className="mt-14 flex items-start gap-3 rounded-xl border border-cyan/20 bg-cyan/[0.045] px-5 py-4"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-cyan">
              <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 9v5m0-8.1v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <p className="text-sm leading-6 text-ice">
              <strong className="font-semibold">No necesitas completar todo.</strong>{" "}
              El valor está en explorar con intención y llegar tan profundo como quieras.
            </p>
          </motion.div>
        </div>
      </section>

      <section id="semillero" className="relative scroll-mt-20 border-b border-line px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionHeading
              eyebrow="Conoce el semillero"
              title="La robótica se construye en equipo."
              body="Somos un equipo multidisciplinario de estudiantes que diseña, construye y programa proyectos reales de robótica. Cada persona aporta desde su fortaleza y aprende de las demás."
              reduceMotion={reduceMotion}
            />
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="max-w-xl text-sm leading-6 text-muted lg:justify-self-end"
            >
              No esperamos que domines todas las áreas. Buscamos entender qué te
              interesa, cómo conectas conocimientos y qué te gustaría aprender
              junto a otros.
            </motion.p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BRANCH_ORDER.map((branchId, index) => {
              const branch = BRANCHES[branchId];
              return (
                <motion.article
                  key={branchId}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: (index % 4) * 0.06, ease: EASE_OUT }}
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  className={`group rounded-2xl border border-line bg-surface/50 p-5 transition-colors hover:border-tech/45 ${
                    index === BRANCH_ORDER.length - 1 ? "sm:col-span-2 lg:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06]"
                      style={{ backgroundColor: `${branch.color}16`, color: branch.color }}
                    >
                      <BranchIcon branch={branchId} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-ink">{branch.name}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-muted">{branch.tagline}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Antes de comenzar"
            title="Lo importante es cómo recorres el camino."
            body="La experiencia está diseñada para que pruebes ideas, aprendas durante el proceso y muestres tu forma de pensar."
            reduceMotion={reduceMotion}
          />

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {BEFORE_STARTING.map((item, index) => (
              <motion.article
                key={item.title}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.07, ease: EASE_OUT }}
                className="flex gap-4 rounded-2xl border border-line bg-surface/45 p-5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ok/30 bg-ok/10 text-ok">
                  <CheckIcon />
                </span>
                <div>
                  <h3 className="font-heading text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted">{item.body}</p>
                </div>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            className="relative mt-16 overflow-hidden rounded-3xl border border-cyan/20 bg-gradient-to-br from-surface via-[#0b2940] to-[#0a3450] px-6 py-10 text-center shadow-[0_28px_80px_rgba(0,0,0,0.2)] sm:px-10 sm:py-14"
          >
            <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan/10 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Tu siguiente paso</p>
              <h2 className="mt-4 text-balance font-heading text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">
                Tu perfil no es una nota. Es el camino que decides construir.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
                {hydrated ? journeyDetail : "Recuperando tu recorrido…"}
              </p>
              <div className="mt-8 flex justify-center">
                <JourneyLink
                  href={primaryAction.href}
                  label={primaryAction.label}
                  ready={hydrated}
                  onStart={primaryAction.onStart}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function JourneyLink({
  href,
  label,
  ready,
  onStart,
}: {
  href: string;
  label: string;
  ready: boolean;
  onStart?: () => void;
}) {
  if (!ready) {
    return (
      <span
        aria-disabled="true"
        aria-label="Recuperando tu recorrido"
        className="inline-flex min-h-12 min-w-56 cursor-wait items-center justify-center gap-2 rounded-xl bg-surface-raised px-6 text-sm font-semibold text-muted opacity-75"
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted/30 border-t-muted" aria-hidden="true" />
        Cargando…
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onStart}
      className="group inline-flex min-h-12 min-w-56 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-action to-tech px-6 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(2,56,125,0.34)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(2,56,125,0.46)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-night"
    >
      {label}
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
        <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  reduceMotion,
}: {
  eyebrow: string;
  title: string;
  body: string;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
      className="max-w-2xl"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">{eyebrow}</p>
      <h2 className="mt-4 text-balance font-heading text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-sm leading-7 text-muted sm:text-base">{body}</p>
    </motion.div>
  );
}

function CompactSkillMap({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.38, ease: EASE_OUT }}
      className="relative mt-10 overflow-hidden rounded-2xl border border-cyan/15 bg-surface/55 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.14)] sm:p-5 lg:hidden"
      aria-hidden="true"
    >
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-xl border border-cyan/30 bg-[#0b2940] px-3 py-2 shadow-[0_0_24px_rgba(53,196,232,0.1)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-action to-cyan font-heading text-[9px] font-bold text-night">
            TÚ
          </span>
          <span className="font-heading text-xs font-semibold text-ink">Tu mapa</span>
        </div>

        <div className="mx-auto h-4 w-px bg-gradient-to-b from-cyan/70 to-cyan/25" />
        <div className="mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BRANCH_ORDER.map((branchId) => {
            const branch = BRANCHES[branchId];
            return (
              <div
                key={branchId}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-night/55 px-2.5 py-2"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${branch.color}1f`, color: branch.color }}
                >
                  <BranchIcon branch={branchId} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-[10px] font-medium text-ice">
                  {branch.shortName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function HeroSkillMap({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.24, ease: EASE_OUT }}
      className="relative mx-auto hidden aspect-square w-full max-w-[570px] lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-[7%] rounded-full border border-cyan/10" />
      <div className="absolute inset-[20%] rounded-full border border-cyan/[0.07]" />
      <div className="absolute inset-[34%] rounded-full bg-cyan/[0.035] blur-xl" />

      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100">
        {BRANCH_ORDER.map((branchId, index) => {
          const position = MAP_POSITIONS[index];
          return (
            <motion.line
              key={branchId}
              x1="50"
              y1="50"
              x2={position.x}
              y2={position.y}
              stroke={BRANCHES[branchId].color}
              strokeWidth="0.22"
              strokeOpacity="0.6"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.8, delay: 0.38 + index * 0.07, ease: EASE_OUT }}
            />
          );
        })}
      </svg>

      <div className="absolute left-1/2 top-1/2 z-10 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan/30 bg-[#0b2940]/95 p-4 text-center shadow-[0_0_50px_rgba(53,196,232,0.12)] backdrop-blur">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-action to-cyan font-heading text-xs font-bold text-night">
          TÚ
        </span>
        <p className="mt-3 font-heading text-sm font-semibold text-ink">Tu recorrido</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cyan">Siete posibilidades</p>
      </div>

      {BRANCH_ORDER.map((branchId, index) => {
        const branch = BRANCHES[branchId];
        const position = MAP_POSITIONS[index];
        return (
          <motion.div
            key={branchId}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.65 + index * 0.06, ease: EASE_OUT }}
            className="absolute z-10 flex w-32 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border border-line bg-surface/90 px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${branch.color}1f`, color: branch.color }}
            >
              <BranchIcon branch={branchId} className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-medium leading-tight text-ice">{branch.shortName}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="m5 10.5 3.1 3L15 6.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
