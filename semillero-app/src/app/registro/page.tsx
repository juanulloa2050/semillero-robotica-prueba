"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppState } from "@/lib/state/AppStateContext";
import { EASE_OUT } from "@/lib/motion";
import {
  canAccessSkillTree,
  getRegistrationStep,
  isRequiredProfileComplete,
} from "@/lib/journey";
import {
  MAX_CUMULATIVE_AVERAGE,
  MIN_ALLOWED_CUMULATIVE_AVERAGE,
  MIN_CUMULATIVE_AVERAGE,
  MIN_SEMESTER,
  PROGRAM_OPTIONS,
  UNISABANA_EMAIL_DOMAIN,
  UNISABANA_EMAIL_PATTERN,
  isAllowedProgram,
  isUnisabanaEmail,
  isValidCumulativeAverage,
  isValidSemester,
} from "@/lib/admissions";
import type { IntroItemType } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { uploadIntroductionFile } from "@/lib/supabase/introductionStore";

const STEPS = [
  { id: 1, label: "Datos" },
  { id: 2, label: "Preséntate" },
] as const;

export default function RegistroPage() {
  const {
    state,
    hydrated,
    sessionActive,
    setRegistrationStep,
    completeOnboarding,
  } = useAppState();
  const [direction, setDirection] = useState(1);
  const router = useRouter();
  const step = getRegistrationStep(state);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) {
      router.replace("/");
      return;
    }
    const canAccess = canAccessSkillTree(state);
    if (state.submitted && canAccess) {
      router.replace("/perfil");
      return;
    }
    if (canAccess) router.replace("/skills");
  }, [hydrated, router, sessionActive, state]);

  function goToStep(nextStep: 1 | 2) {
    setDirection(nextStep > step ? 1 : -1);
    setRegistrationStep(nextStep);
  }

  function finishRegistration() {
    completeOnboarding();
    router.replace("/skills");
  }

  if (!hydrated || !sessionActive || canAccessSkillTree(state)) {
    return <FlowLoading label="Preparando tu registro" />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <span className="text-xs font-medium uppercase tracking-widest text-cyan">
          Antes del árbol
        </span>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-ink">
          Cuéntanos quién eres.
        </h1>
        <p className="mt-3 text-sm text-muted">
          Dos pasos cortos y pasas directo al árbol de habilidades.
        </p>
      </motion.div>

      <Stepper current={step} onJump={goToStep} />

      <div className="mt-8 rounded-2xl border border-line bg-surface/60 p-6 sm:p-8">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <StepShell key="1" direction={direction}>
              <StepDatos onNext={() => goToStep(2)} />
            </StepShell>
          )}
          {step === 2 && (
            <StepShell key="2" direction={direction}>
              <StepPresentacion
                onBack={() => goToStep(1)}
                onNext={finishRegistration}
              />
            </StepShell>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FlowLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-full border border-line bg-surface/70 px-4 py-2.5 text-xs text-muted shadow-xl backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan" />
        {label}
      </div>
    </div>
  );
}

function StepShell({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      custom={direction}
      initial={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 0, x: direction * 28, filter: "blur(3px)" }
      }
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 0, x: direction * -22, filter: "blur(3px)" }
      }
      transition={{ duration: reduceMotion ? 0 : 0.36, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

function Stepper({
  current,
  onJump,
}: {
  current: 1 | 2;
  onJump: (step: 1 | 2) => void;
}) {
  return (
    <div className="mt-8 flex items-center">
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex flex-1 items-center last:flex-none">
            <button
              onClick={() => s.id < current && onJump(s.id)}
              disabled={s.id > current}
              className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                active ? "text-ink" : done ? "text-cyan" : "text-muted"
              } ${s.id < current ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : done
                    ? "border-cyan bg-cyan text-[#061827]"
                    : "border-line text-muted"
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  s.id
                )}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                className={`mx-3 h-px flex-1 transition-colors ${
                  done ? "bg-cyan" : "bg-line"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted"
      >
        {label}
        {optional && (
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-muted">
            opcional
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[11px] leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-[11px] font-medium leading-relaxed text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-tech";
const invalidInputClass = "border-danger/70 focus:border-danger";

const primaryBtn =
  "rounded-lg bg-gradient-to-r from-action to-tech px-6 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-action/20 transition-transform hover:scale-[1.02] active:scale-[0.98]";
const disabledBtn = "rounded-lg bg-surface-raised px-6 py-2.5 text-sm font-semibold text-muted";
const ghostBtn = "rounded-lg px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink";

function StepDatos({ onNext }: { onNext: () => void }) {
  const { state, updateProfile } = useAppState();
  const auth = useAuth();
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const p = state.profile;

  const fullNameValid = Boolean(p.fullName.trim());
  const emailValid = isUnisabanaEmail(p.email);
  const programValid = isAllowedProgram(p.program);
  const semesterValid = isValidSemester(p.semester);
  const averageValid = isValidCumulativeAverage(p.cumulativeAverage);
  const passwordValid = !auth.configured || Boolean(auth.user) || password.length >= 8;
  const canContinue = isRequiredProfileComplete(p) && passwordValid;

  function shouldShowError(field: string, valid: boolean) {
    return !valid && (attempted || touched[field]);
  }

  function touch(field: string) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) {
      setAttempted(true);
      return;
    }
    if (auth.configured && !auth.user) {
      setCreatingAccount(true);
      const error = await auth.signUp(
        p.email.trim().toLowerCase(),
        password,
        p.fullName.trim()
      );
      setCreatingAccount(false);
      if (error) {
        setAuthError(error);
        return;
      }
    }
    onNext();
  }

  const fullNameError = shouldShowError("fullName", fullNameValid)
    ? "Ingresa tu nombre completo."
    : undefined;
  const emailError = shouldShowError("email", emailValid)
    ? `Usa un correo institucional que termine exactamente en ${UNISABANA_EMAIL_DOMAIN}.`
    : undefined;
  const programError = shouldShowError("program", programValid)
    ? "Selecciona uno de los programas disponibles."
    : undefined;
  const semesterError = shouldShowError("semester", semesterValid)
    ? `Debes estar, como mínimo, en semestre ${MIN_SEMESTER}.`
    : undefined;
  const averageError = shouldShowError("cumulativeAverage", averageValid)
    ? `El promedio acumulado debe ser mayor a ${MIN_CUMULATIVE_AVERAGE.toFixed(
        1
      )} y máximo ${MAX_CUMULATIVE_AVERAGE.toFixed(1)}.`
    : undefined;
  const consentError =
    attempted && (!p.consentData || !p.consentFiles)
      ? "Debes aceptar ambas autorizaciones para continuar."
      : undefined;

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="full-name" label="Nombre completo" error={fullNameError}>
          <input
            id="full-name"
            name="fullName"
            autoComplete="name"
            required
            aria-invalid={Boolean(fullNameError)}
            aria-describedby={fullNameError ? "full-name-error" : undefined}
            className={`${inputClass} ${fullNameError ? invalidInputClass : ""}`}
            value={p.fullName}
            onChange={(e) => updateProfile({ fullName: e.target.value })}
            onBlur={() => touch("fullName")}
            placeholder="Ada Lovelace"
          />
        </Field>
        <Field
          id="institutional-email"
          label="Correo institucional"
          hint={`Debe terminar en ${UNISABANA_EMAIL_DOMAIN}.`}
          error={emailError}
        >
          <input
            id="institutional-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            pattern={UNISABANA_EMAIL_PATTERN}
            aria-invalid={Boolean(emailError)}
            aria-describedby={`institutional-email-hint${
              emailError ? " institutional-email-error" : ""
            }`}
            className={`${inputClass} ${emailError ? invalidInputClass : ""}`}
            value={p.email}
            onChange={(e) => updateProfile({ email: e.target.value })}
            onBlur={() => touch("email")}
            placeholder="nombre.apellido@unisabana.edu.co"
          />
        </Field>
        <Field
          id="academic-program"
          label="Programa / carrera"
          error={programError}
        >
          <select
            id="academic-program"
            name="program"
            required
            aria-invalid={Boolean(programError)}
            aria-describedby={programError ? "academic-program-error" : undefined}
            className={`${inputClass} ${programError ? invalidInputClass : ""}`}
            value={p.program}
            onChange={(e) => updateProfile({ program: e.target.value })}
            onBlur={() => touch("program")}
          >
            <option value="" disabled className="bg-surface text-muted">
              Selecciona tu programa
            </option>
            {PROGRAM_OPTIONS.map((program) => (
              <option key={program} value={program} className="bg-surface text-ink">
                {program}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="semester"
          label="Semestre"
          hint={`Desde semestre ${MIN_SEMESTER}.`}
          error={semesterError}
        >
          <input
            id="semester"
            name="semester"
            type="number"
            inputMode="numeric"
            min={MIN_SEMESTER}
            step={1}
            required
            aria-invalid={Boolean(semesterError)}
            aria-describedby={`semester-hint${
              semesterError ? " semester-error" : ""
            }`}
            className={`${inputClass} ${semesterError ? invalidInputClass : ""}`}
            value={p.semester}
            onChange={(e) => updateProfile({ semester: e.target.value })}
            onBlur={() => touch("semester")}
            placeholder="2"
          />
        </Field>
        <Field
          id="cumulative-average"
          label="Promedio acumulado"
          hint={`Debe ser mayor a ${MIN_CUMULATIVE_AVERAGE.toFixed(
            1
          )} y máximo ${MAX_CUMULATIVE_AVERAGE.toFixed(1)}.`}
          error={averageError}
        >
          <input
            id="cumulative-average"
            name="cumulativeAverage"
            type="number"
            inputMode="decimal"
            min={MIN_ALLOWED_CUMULATIVE_AVERAGE}
            max={MAX_CUMULATIVE_AVERAGE}
            step="0.01"
            required
            aria-invalid={Boolean(averageError)}
            aria-describedby={`cumulative-average-hint${
              averageError ? " cumulative-average-error" : ""
            }`}
            className={`${inputClass} ${averageError ? invalidInputClass : ""}`}
            value={p.cumulativeAverage}
            onChange={(e) => updateProfile({ cumulativeAverage: e.target.value })}
            onBlur={() => touch("cumulativeAverage")}
            placeholder="4.2"
          />
        </Field>
        <Field id="student-code" label="Código o identificador institucional" optional>
          <input
            id="student-code"
            name="studentCode"
            className={inputClass}
            value={p.studentCode}
            onChange={(e) => updateProfile({ studentCode: e.target.value })}
            placeholder="20231234"
          />
        </Field>
        {auth.configured && !auth.user && (
          <Field
            id="account-password"
            label="Contraseña"
            hint="Mínimo 8 caracteres. La necesitarás para retomar desde otro dispositivo."
            error={attempted && !passwordValid ? "Usa al menos 8 caracteres." : undefined}
          >
            <input
              id="account-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={`${inputClass} ${attempted && !passwordValid ? invalidInputClass : ""}`}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setAuthError("");
              }}
            />
          </Field>
        )}
      </div>

      <div className="my-7 h-px bg-line" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="github" label="GitHub" optional>
          <input
            id="github"
            name="github"
            type="url"
            inputMode="url"
            autoComplete="url"
            className={inputClass}
            value={p.github}
            onChange={(e) => updateProfile({ github: e.target.value })}
            placeholder="github.com/usuario"
          />
        </Field>
        <Field id="linkedin" label="LinkedIn" optional>
          <input
            id="linkedin"
            name="linkedin"
            type="url"
            inputMode="url"
            className={inputClass}
            value={p.linkedin}
            onChange={(e) => updateProfile({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/usuario"
          />
        </Field>
        <Field id="portfolio" label="Portafolio" optional>
          <input
            id="portfolio"
            name="portfolio"
            type="url"
            inputMode="url"
            className={inputClass}
            value={p.portfolio}
            onChange={(e) => updateProfile({ portfolio: e.target.value })}
            placeholder="miportafolio.com"
          />
        </Field>
        <Field id="personal-page" label="Página personal / Instagram" optional>
          <input
            id="personal-page"
            name="website"
            type="url"
            inputMode="url"
            className={inputClass}
            value={p.website}
            onChange={(e) => updateProfile({ website: e.target.value })}
            placeholder="instagram.com/usuario"
          />
        </Field>
      </div>

      <div className="my-7 h-px bg-line" />

      <fieldset
        aria-describedby={consentError ? "consent-error" : undefined}
        className="space-y-3"
      >
        <legend className="sr-only">Autorizaciones requeridas</legend>
        <label className="flex cursor-pointer items-start gap-3 text-xs text-muted">
          <input
            id="consent-data"
            name="consentData"
            type="checkbox"
            required
            aria-invalid={Boolean(consentError && !p.consentData)}
            checked={p.consentData}
            onChange={(e) => updateProfile({ consentData: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-tech"
          />
          Acepto el tratamiento de mis datos personales para el proceso de
          selección del semillero.
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-xs text-muted">
          <input
            id="consent-files"
            name="consentFiles"
            type="checkbox"
            required
            aria-invalid={Boolean(consentError && !p.consentFiles)}
            checked={p.consentFiles}
            onChange={(e) => updateProfile({ consentFiles: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-tech"
          />
          Acepto que los archivos que envíe sean utilizados con fines del
          proceso de selección.
        </label>
        {consentError && (
          <p id="consent-error" role="alert" className="text-[11px] font-medium text-danger">
            {consentError}
          </p>
        )}
      </fieldset>

      <div className="mt-8 flex justify-end">
        {authError && <p role="alert" className="mr-auto self-center text-xs text-danger">{authError}</p>}
        <button
          type="submit"
          disabled={creatingAccount}
          aria-disabled={!canContinue}
          className={canContinue ? primaryBtn : disabledBtn}
        >
          {creatingAccount ? "Creando cuenta…" : "Continuar"}
        </button>
      </div>
    </form>
  );
}

const GUIDE_QUESTIONS = [
  "¿Quién eres?",
  "¿Qué cosas disfrutas hacer?",
  "¿Qué haces en tu tiempo libre?",
  "¿Qué te gusta construir, investigar o aprender?",
  "¿Has participado en algún proyecto del que te sientas orgulloso?",
  "¿Qué te llama la atención de la robótica?",
  "¿Qué te gustaría aprender dentro del semillero?",
  "¿Qué crees que podrías aportar?",
  "¿Prefieres diseñar, construir, programar, investigar o probar?",
  "¿Hay algo más que creas que deberíamos saber de ti?",
];

const TYPE_META: Record<IntroItemType, { label: string; icon: string }> = {
  text: { label: "Texto", icon: "T" },
  image: { label: "Imagen", icon: "🖼" },
  audio: { label: "Audio", icon: "♪" },
  video: { label: "Video", icon: "▶" },
  file: { label: "Archivo", icon: "📎" },
  link: { label: "Enlace", icon: "🔗" },
};

function StepPresentacion({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { state, addIntroItem, removeIntroItem } = useAppState();
  const [composer, setComposer] = useState<"text" | "link" | null>(null);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFileType = useRef<IntroItemType>("file");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const canContinue = state.introduction.length > 0;

  function openFilePicker(type: IntroItemType, accept: string) {
    pendingFileType.current = type;
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const remotePath = await uploadIntroductionFile(file, pendingFileType.current);
      const content = remotePath ?? URL.createObjectURL(file);
      addIntroItem({ type: pendingFileType.current, title: file.name, content });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No fue posible subir el archivo.");
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  }

  function submitText() {
    if (!draft.trim()) return;
    addIntroItem({ type: "text", title: "Nota", content: draft.trim() });
    setDraft("");
    setComposer(null);
  }

  function submitLink() {
    if (!draft.trim()) return;
    addIntroItem({ type: "link", title: draft.trim(), content: draft.trim() });
    setDraft("");
    setComposer(null);
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />
      {uploading && <p className="mb-3 text-xs text-cyan">Subiendo archivo privado…</p>}
      {uploadError && <p role="alert" className="mb-3 text-xs text-danger">{uploadError}</p>}

      <p className="text-sm text-ink">
        Antes de ver qué sabes hacer, queremos saber quién eres. Combina
        texto, imágenes, audio, video, archivos o enlaces — el formato es tu
        decisión.
      </p>

      <details className="mt-5 rounded-xl border border-line bg-surface-raised/50 p-4 text-sm text-muted open:pb-5">
        <summary className="cursor-pointer select-none font-medium text-ink">
          Preguntas guía (opcional, solo para inspirarte)
        </summary>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {GUIDE_QUESTIONS.map((q) => (
            <li key={q} className="text-xs leading-relaxed text-muted">
              · {q}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setComposer(composer === "text" ? null : "text")}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-tech"
        >
          Escribir
        </button>
        <button
          onClick={() => openFilePicker("image", "image/*")}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-tech"
        >
          Subir imagen
        </button>
        <button
          onClick={() => openFilePicker("audio", "audio/*")}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-tech"
        >
          Subir audio
        </button>
        <button
          onClick={() => openFilePicker("video", "video/*")}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-tech"
        >
          Subir video
        </button>
        <button
          onClick={() => openFilePicker("file", "*/*")}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-tech"
        >
          Subir archivo
        </button>
        <button
          onClick={() => setComposer(composer === "link" ? null : "link")}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-tech"
        >
          Agregar enlace
        </button>
      </div>

      <AnimatePresence>
        {composer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-line bg-surface-raised/50 p-4">
              {composer === "text" ? (
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  placeholder="Escribe lo que quieras contarnos…"
                  className="w-full resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-tech"
                />
              ) : (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="https://tuportafolio.com"
                  className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-tech"
                />
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setComposer(null);
                    setDraft("");
                  }}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-muted hover:text-ink"
                >
                  Cancelar
                </button>
                <button
                  onClick={composer === "text" ? submitText : submitLink}
                  className="rounded-lg bg-tech px-4 py-2 text-xs font-semibold text-[#061827]"
                >
                  Agregar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        {state.introduction.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
            Aún no agregas ninguna evidencia. Elige un formato arriba para
            empezar.
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {state.introduction.map((item) => {
                const meta = TYPE_META[item.type];
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised/40 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-sm">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {item.type === "text" ? item.content : item.title}
                      </p>
                      <p className="text-[11px] text-muted">{meta.label}</p>
                    </div>
                    <button
                      onClick={() => removeIntroItem(item.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:text-danger"
                    >
                      Eliminar
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className={ghostBtn}>
          Atrás
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className={canContinue ? primaryBtn : disabledBtn}
        >
          Explorar mi árbol
        </button>
      </div>
    </div>
  );
}
