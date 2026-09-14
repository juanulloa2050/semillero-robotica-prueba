"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import { FlowGate } from "@/components/layout/FlowGate";
import {
  FINAL_REFLECTION_FIELD_ID,
  FINAL_REFLECTION_QUESTION,
  FINAL_SUBMISSION_NODE_ID,
  buildFinalReflectionProgress,
  getFinalReflectionFiles,
  hasFinalReflectionVideo,
} from "@/lib/finalSubmission";
import { useAppState } from "@/lib/state/AppStateContext";

export default function EnviarPage() {
  return (
    <FlowGate requireReady>
      <EnviarContent />
    </FlowGate>
  );
}

function EnviarContent() {
  const { state, saveChallengeProgress, submitJourney } = useAppState();
  const finalProgress = state.challengeProgress[FINAL_SUBMISSION_NODE_ID];
  const reflectionFiles = getFinalReflectionFiles(finalProgress);
  const videoReady = hasFinalReflectionVideo(finalProgress);

  if (state.submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <h1 className="mt-6 font-heading text-2xl font-semibold text-ink">Tu prueba fue enviada.</h1>
        <p className="mt-3 text-sm text-muted">
          Gracias por explorar y construir con nosotros. El equipo del semillero revisará tu recorrido y te contactará pronto.
        </p>
        <Link href="/" className="mt-8 text-xs text-cyan hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl border border-cyan/25 bg-surface/80 shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
      >
        <header className="border-b border-line bg-[#0a2945] p-6 sm:p-8">
          <span className="text-xs font-medium uppercase tracking-widest text-cyan">
            Último paso · reflexión final
          </span>
          <h1 className="mt-3 font-heading text-2xl font-semibold text-ink sm:text-3xl">
            Cuéntanos la historia detrás de tu recorrido.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Graba un video corto y auténtico. No evaluamos la edición: queremos entender qué hiciste, cómo pensaste y por qué quieres construir con nosotros.
          </p>
        </header>

        <div className="p-5 sm:p-8">
          <section className="rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">Pregunta obligatoria</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-ink">{FINAL_REFLECTION_QUESTION}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">En el mismo video también puedes contarnos:</p>
            <ul className="mt-3 grid gap-2 text-sm leading-5 text-ice sm:grid-cols-2">
              <li className="rounded-xl bg-night/35 px-3 py-2">Qué retos realizaste y qué construiste o resolviste.</li>
              <li className="rounded-xl bg-night/35 px-3 py-2">Qué decisión técnica fue importante para ti.</li>
              <li className="rounded-xl bg-night/35 px-3 py-2">Qué dificultad encontraste y cómo la abordaste.</li>
              <li className="rounded-xl bg-night/35 px-3 py-2">Qué te gustaría aprender o crear en el semillero.</li>
            </ul>
          </section>

          <div className="mt-6">
            <LocalEvidenceUploader
              nodeId={FINAL_SUBMISSION_NODE_ID}
              fieldId={FINAL_REFLECTION_FIELD_ID}
              label="Video de reflexión final"
              description="Duración sugerida: 2 a 4 minutos. Formatos de video, máximo 50 MB. Este archivo será privado y solo podrá verlo el equipo evaluador."
              accept="video/*,.mp4,.webm,.mov,.m4v"
              value={reflectionFiles}
              onChange={(files) =>
                saveChallengeProgress(
                  FINAL_SUBMISSION_NODE_ID,
                  buildFinalReflectionProgress(files, finalProgress)
                )
              }
              maxSizeBytes={50 * 1_048_576}
              required
            />
          </div>

          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              videoReady
                ? "border-ok/30 bg-ok/[0.08] text-ok"
                : "border-line bg-night/30 text-muted"
            }`}
            aria-live="polite"
          >
            {videoReady
              ? "Video listo. Ya puedes enviar tu prueba."
              : "Adjunta el video para habilitar el envío definitivo."}
          </div>

          <p className="mt-5 text-xs leading-5 text-muted">
            Después del envío final no podrás modificar tus respuestas ni reemplazar el video.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/skills"
              className="rounded-lg border border-line px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-tech"
            >
              Seguir explorando
            </Link>
            <button
              type="button"
              onClick={submitJourney}
              disabled={!videoReady}
              className="rounded-lg bg-gradient-to-r from-action to-tech px-6 py-3 text-sm font-semibold text-ink shadow-lg shadow-action/20 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
            >
              Enviar mi prueba
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
