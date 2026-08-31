"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { E0Challenge } from "@/components/challenges/electronics/E0Challenge";
import { E1AChallenge } from "@/components/challenges/electronics/E1AChallenge";
import { E1BChallenge } from "@/components/challenges/electronics/E1BChallenge";
import { E2Challenge } from "@/components/challenges/electronics/E2Challenge";
import { E3AChallenge } from "@/components/challenges/electronics/E3AChallenge";
import { E3BChallenge } from "@/components/challenges/electronics/E3BChallenge";
import { E4Challenge } from "@/components/challenges/electronics/E4Challenge";
import { SystemsChallenge } from "@/components/challenges/systems/SystemsChallenge";
import { QuickDeliveryChallenge } from "@/components/challenges/design/QuickDeliveryChallenge";
import { M0Challenge } from "@/components/challenges/mechanics/M0Challenge";
import { M1AChallenge } from "@/components/challenges/mechanics/M1AChallenge";
import { M1BChallenge } from "@/components/challenges/mechanics/M1BChallenge";
import { M2Challenge } from "@/components/challenges/mechanics/M2Challenge";
import { M3AChallenge } from "@/components/challenges/mechanics/M3AChallenge";
import { M3BChallenge } from "@/components/challenges/mechanics/M3BChallenge";
import { M4Challenge } from "@/components/challenges/mechanics/M4Challenge";
import { IRChallenge } from "@/components/challenges/integration/IRChallenge";
import { AiNodeChallenge } from "@/components/challenges/ai/AiNodeChallenge";
import { A0_CONTENT } from "@/lib/challenges/ai/a0";
import { A1_CONTENT } from "@/lib/challenges/ai/a1";
import { A2_YOLO_CONTENT } from "@/lib/challenges/ai/a2-yolo";
import { A2_OPENCV_CONTENT } from "@/lib/challenges/ai/a2-opencv";
import { A3_CONTENT } from "@/lib/challenges/ai/a3";
import { A4_RL_CONTENT } from "@/lib/challenges/ai/a4-rl";
import { A4_GENERAL_CONTENT } from "@/lib/challenges/ai/a4-general";
import { BranchIcon } from "@/components/icons/BranchIcon";
import {
  DELIVERY_FORMAT_LABELS,
  getChallengePresentation,
  type DeliveryFormat,
} from "@/lib/challengePresentation";
import { BRANCHES } from "@/lib/data/branches";
import { isImplementedChallengeNodeId } from "@/lib/challenges/registry";
import type {
  NodeChallengeProgress,
  NodeStatus,
  SkillNodeDef,
} from "@/lib/types";

const STATUS_COPY: Record<
  NodeStatus,
  { label: string; eyebrow: string; detail: string }
> = {
  available: {
    label: "Disponible",
    eyebrow: "Listo para explorar",
    detail:
      "Cuando registres tu entrega, este reto quedará completado y podrá abrir nuevas rutas.",
  },
  in_progress: {
    label: "En progreso",
    eyebrow: "Tienes progreso guardado",
    detail:
      "Guardaste avances en este reto. Continúa donde lo dejaste para completarlo.",
  },
  completed: {
    label: "Completado",
    eyebrow: "Entrega registrada",
    detail:
      "Este reto ya hace parte de tu recorrido y cuenta para desbloquear los siguientes.",
  },
  locked: {
    label: "Bloqueado",
    eyebrow: "Todavía no disponible",
    detail:
      "Completa todos los retos del nivel anterior para habilitar esta experiencia.",
  },
};

function NOOP() {}

interface DetailedChallengeProps {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (finalProgress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

const DETAILED_CHALLENGE_COMPONENTS: Readonly<
  Record<string, ComponentType<DetailedChallengeProps>>
> = {
  D0: QuickDeliveryChallenge,
  E0: E0Challenge,
  E1A: E1AChallenge,
  E1B: E1BChallenge,
  E2: E2Challenge,
  E3A: E3AChallenge,
  E3B: E3BChallenge,
  E4: E4Challenge,
  SI0: (props) => <SystemsChallenge {...props} nodeId="SI0" />,
  SI1A: (props) => <SystemsChallenge {...props} nodeId="SI1A" />,
  SI1B: (props) => <SystemsChallenge {...props} nodeId="SI1B" />,
  SI2: (props) => <SystemsChallenge {...props} nodeId="SI2" />,
  SI3A: (props) => <SystemsChallenge {...props} nodeId="SI3A" />,
  SI3B: (props) => <SystemsChallenge {...props} nodeId="SI3B" />,
  SI4: (props) => <SystemsChallenge {...props} nodeId="SI4" />,
  SI5: (props) => <SystemsChallenge {...props} nodeId="SI5" />,
  SI6: (props) => <SystemsChallenge {...props} nodeId="SI6" />,
  M0: M0Challenge,
  M1A: M1AChallenge,
  M1B: M1BChallenge,
  M2: M2Challenge,
  M3A: M3AChallenge,
  M3B: M3BChallenge,
  M4: M4Challenge,
  IR: IRChallenge,
  A0: (props) => <AiNodeChallenge {...props} content={A0_CONTENT} />,
  A1: (props) => <AiNodeChallenge {...props} content={A1_CONTENT} />,
  A2_YOLO: (props) => <AiNodeChallenge {...props} content={A2_YOLO_CONTENT} />,
  A2_OPENCV: (props) => <AiNodeChallenge {...props} content={A2_OPENCV_CONTENT} />,
  A3: (props) => <AiNodeChallenge {...props} content={A3_CONTENT} />,
  A4_RL: (props) => <AiNodeChallenge {...props} content={A4_RL_CONTENT} />,
  A4_GENERAL: (props) => <AiNodeChallenge {...props} content={A4_GENERAL_CONTENT} />,
};

export function NodeDetailPanel({
  node,
  status,
  prereqTitles,
  onClose,
  onComplete,
  challengeProgress,
  onSaveChallengeProgress,
  onCompleteChallenge,
  testerMode = false,
}: {
  node: SkillNodeDef | null;
  status: NodeStatus;
  prereqTitles: string[];
  onClose: () => void;
  onComplete: (id: string) => void;
  challengeProgress?: NodeChallengeProgress;
  onSaveChallengeProgress: (
    nodeId: string,
    progress: NodeChallengeProgress
  ) => void;
  onCompleteChallenge: (
    nodeId: string,
    progress: NodeChallengeProgress
  ) => void;
  testerMode?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const statusCardRef = useRef<HTMLElement>(null);
  const previousStatusRef = useRef(status);
  const onCloseRef = useRef(onClose);
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 40);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        !dialogRef.current.contains(activeElement) ||
        !activeElement ||
        !focusable.includes(activeElement)
      ) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [node]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (!node || previousStatus !== "available" || status !== "completed") return;

    const focusTimer = window.setTimeout(() => {
      const focusTarget = statusCardRef.current ?? closeButtonRef.current;
      focusTarget?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [node, status]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {node && (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${
          isImplementedChallengeNodeId(node.id) ? "" : "sm:p-6"
        }`}>
          <motion.div
            aria-hidden="true"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onMouseDown={onClose}
            className="absolute inset-0 bg-[#020b12]/80 backdrop-blur-md"
          />

          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-detail-title"
            aria-describedby="skill-detail-description"
            tabIndex={-1}
            initial={reduceMotion ? false : isImplementedChallengeNodeId(node.id) ? { opacity: 0, y: 12 } : { opacity: 0, y: 32, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : isImplementedChallengeNodeId(node.id) ? { opacity: 0, y: 8 } : { opacity: 0, y: 24, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 flex w-full flex-col overflow-hidden bg-[#081f32] outline-none ${
              isImplementedChallengeNodeId(node.id)
                ? "h-dvh max-h-none max-w-none rounded-none border-0 shadow-none"
                : "max-h-[calc(100dvh-1rem)] max-w-5xl rounded-t-3xl border border-line shadow-[0_32px_100px_rgba(0,0,0,0.55)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"
            }`}
          >
            <ChallengeHeader
              node={node}
              status={status}
              closeButtonRef={closeButtonRef}
              onClose={onClose}
            />

            <ChallengeBody
              node={node}
              status={status}
              prereqTitles={prereqTitles}
              onComplete={onComplete}
              challengeProgress={challengeProgress}
              onSaveChallengeProgress={onSaveChallengeProgress}
              onCompleteChallenge={onCompleteChallenge}
              onClose={onClose}
              reduceMotion={reduceMotion}
              statusCardRef={statusCardRef}
              testerMode={testerMode}
            />
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ChallengeHeader({
  node,
  status,
  closeButtonRef,
  onClose,
}: {
  node: SkillNodeDef;
  status: NodeStatus;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const branch = BRANCHES[node.branchId];

  return (
    <header className="relative shrink-0 border-b border-line bg-[#0a263d]/95 px-5 py-4 sm:px-7 sm:py-5">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${branch.color}, #35C4E8, transparent 82%)` }}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{
              background: `${branch.color}18`,
              borderColor: `${branch.color}45`,
              color: branch.color,
            }}
          >
            <BranchIcon branch={node.branchId} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-[10px] font-semibold uppercase tracking-[0.17em] text-cyan sm:text-xs">
              {branch.name}
              {node.bonus && (
                <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-[9px] font-bold tracking-[0.14em] text-cyan">
                  Bonus
                </span>
              )}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              Reto {node.id} · {STATUS_COPY[status].label}
            </p>
          </div>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-night/35 text-muted transition-colors hover:border-cyan/35 hover:bg-surface-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
          aria-label="Cerrar detalle del reto"
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}

function ChallengeBody({
  node,
  status,
  prereqTitles,
  onComplete,
  challengeProgress,
  onSaveChallengeProgress,
  onCompleteChallenge,
  onClose,
  reduceMotion,
  statusCardRef,
  testerMode = false,
}: {
  node: SkillNodeDef;
  status: NodeStatus;
  prereqTitles: string[];
  onComplete: (id: string) => void;
  challengeProgress?: NodeChallengeProgress;
  onSaveChallengeProgress: (
    nodeId: string,
    progress: NodeChallengeProgress
  ) => void;
  onCompleteChallenge: (
    nodeId: string,
    progress: NodeChallengeProgress
  ) => void;
  onClose: () => void;
  reduceMotion: boolean;
  statusCardRef: RefObject<HTMLElement | null>;
  testerMode?: boolean;
}) {
  const branch = BRANCHES[node.branchId];
  const presentation = getChallengePresentation(node);
  const statusCopy = STATUS_COPY[status];
  const DetailedChallenge = DETAILED_CHALLENGE_COMPONENTS[node.id];
  const isOpen = status === "available" || status === "in_progress";

  if (DetailedChallenge && status !== "locked") {
    return (
      <div className={`min-h-0 flex-1 overscroll-contain ${
        node.id.startsWith("SI") ? "overflow-hidden" : "overflow-y-auto p-3 sm:p-5 lg:p-6"
      }`}>
        <DetailedChallenge
          savedProgress={challengeProgress}
          readOnly={status === "completed" || testerMode}
          onSave={testerMode ? NOOP : (progress) => onSaveChallengeProgress(node.id, progress)}
          onComplete={testerMode ? NOOP : (progress) => onCompleteChallenge(node.id, progress)}
          onExit={onClose}
        />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto overscroll-contain p-5 sm:p-7 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.75fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill label={node.typeLabel} />
            <MetaPill label={presentation.levelLabel} />
            <StatusPill status={status} />
          </div>

          <h2
            id="skill-detail-title"
            className="mt-6 text-balance font-heading text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-4xl lg:text-[2.65rem]"
          >
            {node.title}
          </h2>

          <div className="mt-7 rounded-2xl border border-line bg-surface/45 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-cyan">
              Sobre este reto
            </p>
            <p id="skill-detail-description" className="mt-3 text-sm leading-7 text-ice/85 sm:text-base sm:leading-8">
              {node.description}
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoCard
              icon={<CompassIcon />}
              title="Qué queremos observar"
              body={presentation.deliveryPrompt}
              color={branch.color}
            />
            <InfoCard
              icon={<PrototypeIcon />}
              title="Vista de prototipo"
              body="La actividad específica y sus campos de respuesta se integrarán después. Aquí puedes probar el recorrido y sus desbloqueos."
              color="#35C4E8"
            />
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-2xl border border-cyan/20 bg-gradient-to-br from-[#0c2d47] to-[#092238] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-cyan">
              Formato de entrega
            </p>
            <h3 className="mt-2 font-heading text-lg font-semibold text-ink">
              {presentation.deliveryMode}
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted">
              {presentation.deliveryFormats.length === 1
                ? "Este reto se realizará en el formato indicado."
                : "Podrás usar o combinar los formatos que mejor expliquen tu proceso."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {presentation.deliveryFormats.map((format) => (
                <DeliveryFormatCard key={format} format={format} />
              ))}
            </div>
          </section>

          <section
            ref={statusCardRef}
            tabIndex={-1}
            aria-live="polite"
            className={`rounded-2xl border p-5 sm:p-6 ${
              status === "completed"
                ? "border-ok/30 bg-ok/[0.07]"
                : isOpen
                  ? "border-cyan/25 bg-cyan/[0.055]"
                  : "border-line bg-surface/45"
            }`}
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={status} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Estado del reto
                </p>
                <h3 className="mt-1 font-heading text-lg font-semibold text-ink">
                  {statusCopy.eyebrow}
                </h3>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">{statusCopy.detail}</p>

            {status === "locked" && prereqTitles.length > 0 && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/70">
                  Ruta para desbloquearlo
                </p>
                <ul className="mt-3 space-y-2.5">
                  {prereqTitles.map((title) => (
                    <li key={title} className="flex gap-2.5 text-xs leading-5 text-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan/70" aria-hidden="true" />
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isOpen && !testerMode && (
              <motion.button
                type="button"
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                onClick={() => onComplete(node.id)}
                className="group mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-action to-tech px-5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(18,103,177,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              >
                Registrar mi entrega
                <ArrowIcon />
              </motion.button>
            )}

            {isOpen && testerMode && (
              <div className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan/25 bg-cyan/[0.06] px-4 text-center text-xs font-semibold text-cyan">
                Modo tester: solo vista, no registra entregas
              </div>
            )}

            {status === "completed" && (
              <div className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-4 text-center text-sm font-semibold text-ok">
                <CheckIcon />
                Entrega registrada
              </div>
            )}

            {status === "locked" && prereqTitles.length === 0 && (
              <div className="mt-5 rounded-xl border border-line bg-night/30 px-4 py-3 text-center text-xs leading-5 text-muted">
                Sigue explorando el árbol para habilitar esta ruta.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full border border-line bg-surface-raised/60 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: NodeStatus }) {
  const isOpen = status === "available" || status === "in_progress";
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.11em] ${
        status === "completed"
          ? "border-ok/35 bg-ok/10 text-ok"
          : isOpen
            ? "border-cyan/35 bg-cyan/10 text-cyan"
            : "border-line bg-night/30 text-muted"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "completed"
            ? "bg-ok"
            : isOpen
              ? "bg-cyan shadow-[0_0_8px_rgba(53,196,232,0.75)]"
              : "bg-muted"
        }`}
        aria-hidden="true"
      />
      {STATUS_COPY[status].label}
    </span>
  );
}

function InfoCard({
  icon,
  title,
  body,
  color,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  color: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-night/25 p-5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl border"
        style={{ color, borderColor: `${color}38`, backgroundColor: `${color}12` }}
      >
        {icon}
      </span>
      <h3 className="mt-4 font-heading text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted">{body}</p>
    </article>
  );
}

function DeliveryFormatCard({ format }: { format: DeliveryFormat }) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-night/35 px-3 py-2 text-xs font-medium text-ice">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
        <FormatIcon format={format} />
      </span>
      {DELIVERY_FORMAT_LABELS[format]}
    </div>
  );
}

function StatusIcon({ status }: { status: NodeStatus }) {
  const isOpen = status === "available" || status === "in_progress";
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
        status === "completed"
          ? "border-ok/30 bg-ok/10 text-ok"
          : isOpen
            ? "border-cyan/30 bg-cyan/10 text-cyan"
            : "border-line bg-night/35 text-muted"
      }`}
      aria-hidden="true"
    >
      {status === "completed" ? (
        <CheckIcon />
      ) : status === "locked" ? (
        <LockIcon />
      ) : status === "in_progress" ? (
        <InProgressIcon />
      ) : (
        <SparkIcon />
      )}
    </span>
  );
}

function FormatIcon({ format }: { format: DeliveryFormat }) {
  if (format === "guided") return <GuidedIcon />;
  if (format === "numeric") return <NumericIcon />;
  if (format === "interactive") return <InteractiveIcon />;
  if (format === "code") return <CodeIcon />;
  if (format === "text") return <TextIcon />;
  if (format === "link") return <LinkIcon />;
  if (format === "file") return <FileIcon />;
  if (format === "image") return <ImageIcon />;
  if (format === "audio") return <AudioIcon />;
  return <VideoIcon />;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L5 10l5.5-1.5L12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

function InProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="7.2" />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="m15.2 8.8-2 4.4-4.4 2 2-4.4 4.4-2Z" strokeLinejoin="round" />
    </svg>
  );
}

function PrototypeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" strokeLinejoin="round" />
      <path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v8.4" />
    </svg>
  );
}

function GuidedIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="5" cy="6" r="1.4" />
      <circle cx="5" cy="14" r="1.4" />
      <path d="M9 6h7M9 14h7" strokeLinecap="round" />
    </svg>
  );
}

function NumericIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 3 5.5 17M14.5 3 13 17M3 8h14M2.5 13h14" strokeLinecap="round" />
    </svg>
  );
}

function InteractiveIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m5 3 9.5 7-4.4 1.1L8 15 5 3Z" strokeLinejoin="round" />
      <path d="m11 12 3 3" strokeLinecap="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m7 5-4 5 4 5M13 5l4 5-4 5M11.5 3 8.5 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5h12M4 9h12M4 13h8" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m8 12 4-4M7 6l1.2-1.2a3.1 3.1 0 0 1 4.4 0M13 14l-1.2 1.2a3.1 3.1 0 0 1-4.4 0M14 7l1.2 1.2a3.1 3.1 0 0 1 0 4.4M6 13l-1.2-1.2a3.1 3.1 0 0 1 0-4.4" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 2.8h6l4 4v10.4H5V2.8Z" strokeLinejoin="round" />
      <path d="M11 3v4h4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <circle cx="7" cy="8" r="1.2" />
      <path d="m5 14 3.5-3.5 2.3 2.3 1.8-1.8 2.4 3" strokeLinejoin="round" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8v4m3-7v10m3-8v6m3-9v12m3-8v4" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="10" height="10" rx="2" />
      <path d="m13 8 4-2v8l-4-2" strokeLinejoin="round" />
    </svg>
  );
}
