"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalEvidenceUploader } from "@/components/challenges/LocalEvidenceUploader";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import {
  IR_BRANCH_OPTIONS,
  IR_CHALLENGE,
  IR_STEP_ID,
  createIRActionPhase,
  createIRDraft,
  createIRMetric,
  createIRReference,
  createIRResource,
  createIRRisk,
  createIRSpecificObjective,
  validateIR,
  type IRActionPhase,
  type IRFieldId,
  type IRMetric,
  type IRReference,
  type IRResource,
  type IRRisk,
  type IRSpecificObjective,
  type IRSubmission,
  type IRValidation,
} from "@/lib/challenges/integration/ir";
import type { ChallengeAttempt, JsonValue, NodeChallengeProgress } from "@/lib/types";

interface Props {
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (progress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

const SECTIONS = [
  { id: "problem", label: "Problema", caption: "Contexto y pregunta" },
  { id: "objectives", label: "Objetivos", caption: "Hipótesis y alcance" },
  { id: "solution", label: "Solución", caption: "Arquitectura robótica" },
  { id: "plan", label: "Plan", caption: "Fases y recursos" },
  { id: "validation", label: "Validación", caption: "Métricas, riesgos e impacto" },
] as const;

const FIELD_SECTION: Partial<Record<IRFieldId, number>> = {
  title: 0, branches: 0, context: 0, problem: 0, researchQuestion: 0, justification: 0,
  generalObjective: 1, specificObjectives: 1, hypothesis: 1,
  solution: 2, architecture: 2, innovation: 2, diagramFiles: 2,
  actionPhases: 3, resources: 3,
  metrics: 4, risks: 4, ethicsAndSafety: 4, expectedImpact: 4, limitations: 4, references: 4,
};

export function IRChallenge({ savedProgress, readOnly, onSave, onComplete, onExit }: Props) {
  const initial = useMemo(() => createInitialProgress(savedProgress), [savedProgress]);
  const [progress, setProgress] = useState(initial);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [validation, setValidation] = useState<IRValidation | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const progressRef = useRef(initial);
  const onSaveRef = useRef(onSave);
  const onCompleteRef = useRef(onComplete);
  const completionNotifiedRef = useRef(Boolean(initial.completedAt));

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const commit = useCallback((next: NodeChallengeProgress) => {
    progressRef.current = next;
    setProgress(next);
    onSaveRef.current(next);
    return next;
  }, []);

  const step = progress.steps[IR_STEP_ID];
  const draft = normalizeDraft(step.draft);
  const solved = Boolean(step.solvedAt);
  const disabled = readOnly || solved;
  const errors = validation?.errors ?? {};

  const changeDraft = (patch: Partial<IRSubmission>) => {
    if (disabled) return;
    setValidation(null);
    const nextDraft: IRSubmission = { ...draft, ...patch, stepId: IR_STEP_ID };
    commit({
      ...progressRef.current,
      updatedAt: Date.now(),
      steps: {
        ...progressRef.current.steps,
        [IR_STEP_ID]: { ...progressRef.current.steps[IR_STEP_ID], draft: toJson(nextDraft) },
      },
      analytics: { ...progressRef.current.analytics, lastEvent: "answer_changed", activeSection: sectionIndex + 1 },
    });
  };

  const submit = () => {
    if (disabled) return;
    const result = validateIR(draft);
    setValidation(result);
    if (!result.isComplete) {
      const firstField = Object.keys(result.errors)[0] as IRFieldId | undefined;
      if (firstField !== undefined) setSectionIndex(FIELD_SECTION[firstField] ?? 0);
      setAnnouncement("La propuesta todavía tiene apartados incompletos.");
      return;
    }
    const now = Date.now();
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(),
      nodeId: "IR",
      stepId: IR_STEP_ID,
      attemptNumber: step.attempts.length + 1,
      startedAt: progress.startedAt,
      submittedAt: now,
      durationSeconds: Math.max(step.totalActiveSeconds, Math.floor((now - progress.startedAt) / 1_000)),
      answer: toJson(draft),
      isCorrect: null,
      hintsUsed: step.revealedHints,
      score: result.score,
      metadata: {
        maxScore: result.maxScore,
        reviewerRequired: true,
        integratedBranches: new Set(draft.branches).size,
        planPhases: draft.actionPhases.length,
        evidenceCount: draft.diagramFiles.length + draft.proposalFiles.length,
      },
    };
    const next = commit({
      ...progressRef.current,
      updatedAt: now,
      completedAt: now,
      steps: {
        ...progressRef.current.steps,
        [IR_STEP_ID]: { ...step, attempts: [...step.attempts, attempt], solvedAt: now },
      },
      analytics: { ...progressRef.current.analytics, lastEvent: "challenge_completed", reviewerRequired: true },
    });
    setAnnouncement("Propuesta registrada para revisión humana.");
    if (!completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onCompleteRef.current(next);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan/25 bg-[#071923] shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(53,196,232,0.2),transparent_42%),linear-gradient(135deg,#0b3044,#081d2a)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">Integración Robótica · Proyecto de investigación</p>
            <h2 id="skill-detail-title" className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl">{IR_CHALLENGE.title}</h2>
            <p id="skill-detail-description" className="mt-2 text-sm leading-6 text-slate-300">{IR_CHALLENGE.subtitle} Puede ser conceptual: importa la calidad de la pregunta, el método y la viabilidad.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-[11px] font-semibold text-cyan">{IR_CHALLENGE.estimatedTime}</span>
            {onExit && <button type="button" onClick={onExit} className="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-300 hover:border-cyan/40 hover:text-white">Volver</button>}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-black/15 p-1.5" aria-label="Etapas de la propuesta">
          {SECTIONS.map((section, index) => (
            <button key={section.id} type="button" onClick={() => setSectionIndex(index)} aria-current={sectionIndex === index ? "step" : undefined} className={`min-h-14 rounded-xl px-2 py-2 text-center transition ${sectionIndex === index ? "bg-cyan/15 text-white shadow-inner" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}>
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em]">{index + 1}. {section.label}</span>
              <span className="mt-1 hidden text-[10px] leading-3 sm:block">{section.caption}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {sectionIndex === 0 && <ProblemSection draft={draft} disabled={disabled} errors={errors} onChange={changeDraft} />}
          {sectionIndex === 1 && <ObjectivesSection draft={draft} disabled={disabled} errors={errors} onChange={changeDraft} />}
          {sectionIndex === 2 && <SolutionSection draft={draft} disabled={disabled} errors={errors} onChange={changeDraft} />}
          {sectionIndex === 3 && <PlanSection draft={draft} disabled={disabled} errors={errors} onChange={changeDraft} />}
          {sectionIndex === 4 && <ValidationSection draft={draft} disabled={disabled} errors={errors} onChange={changeDraft} />}
        </div>

        {validation && (
          <div role="status" className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${validation.isComplete ? "border-ok/30 bg-ok/[0.08] text-ok" : "border-danger/30 bg-danger/[0.08] text-rose-100"}`}>
            {validation.feedback} {validation.isComplete && `Rúbrica preliminar: ${validation.score}/${validation.maxScore}.`}
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button type="button" onClick={() => setSectionIndex((value) => Math.max(0, value - 1))} disabled={sectionIndex === 0} className="min-h-11 rounded-xl border border-white/15 px-4 text-xs font-semibold text-slate-300 disabled:opacity-35">Anterior</button>
          <div className="flex gap-3">
            {sectionIndex < SECTIONS.length - 1 && <button type="button" onClick={() => setSectionIndex((value) => Math.min(SECTIONS.length - 1, value + 1))} className="min-h-11 rounded-xl bg-cyan/15 px-5 text-sm font-bold text-cyan">Siguiente etapa</button>}
            {sectionIndex === SECTIONS.length - 1 && (!solved && !readOnly ? (
              <button type="button" onClick={submit} className="min-h-11 rounded-xl bg-gradient-to-r from-action to-cyan px-5 text-sm font-bold text-night shadow-[0_14px_36px_rgba(53,196,232,0.25)]">Registrar propuesta</button>
            ) : <span className="inline-flex min-h-11 items-center rounded-xl border border-ok/30 bg-ok/10 px-4 text-sm font-bold text-ok">Propuesta registrada</span>)}
          </div>
        </footer>
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}

function ProblemSection({ draft, disabled, errors, onChange }: SectionProps) {
  return <Section title="1. Delimita una pregunta de investigación" intro="No empieces por el robot: empieza por una necesidad observable, una población o contexto y algo que puedas medir.">
    <div className="grid gap-4 lg:grid-cols-2">
      <TextField label="Título provisional" value={draft.title} min={8} disabled={disabled} error={errors.title} onChange={(title) => onChange({ title })} />
      <div className="lg:col-span-2">
        <BranchSelector selected={draft.branches} disabled={disabled} error={errors.branches} onChange={(branches) => onChange({ branches })} />
      </div>
      <TextArea label="Contexto y población" description="¿Dónde ocurre, quién se ve afectado y bajo qué condiciones?" value={draft.context} min={100} rows={5} disabled={disabled} error={errors.context} onChange={(context) => onChange({ context })} />
      <TextArea label="Problema delimitado" description="Expón síntomas, causas, alcance y evidencia. Evita plantearlo únicamente como falta de una tecnología." value={draft.problem} min={180} rows={7} disabled={disabled} error={errors.problem} onChange={(problem) => onChange({ problem })} />
      <div className="lg:col-span-2"><TextArea label="Pregunta de investigación" description="Debe relacionar una intervención robótica con un resultado observable o medible." value={draft.researchQuestion} min={40} rows={3} disabled={disabled} error={errors.researchQuestion} onChange={(researchQuestion) => onChange({ researchQuestion })} /></div>
      <div className="lg:col-span-2"><TextArea label="Justificación" description="Explica la relevancia científica, social o técnica y por qué la robótica es pertinente." value={draft.justification} min={150} rows={6} disabled={disabled} error={errors.justification} onChange={(justification) => onChange({ justification })} /></div>
    </div>
  </Section>;
}

function ObjectivesSection({ draft, disabled, errors, onChange }: SectionProps) {
  const update = (id: string, patch: Partial<IRSpecificObjective>) => onChange({ specificObjectives: draft.specificObjectives.map((item) => item.id === id ? { ...item, ...patch } : item) });
  return <Section title="2. Convierte la idea en objetivos verificables" intro="El objetivo general define el resultado; los específicos describen el camino y cómo sabrás que avanzaste.">
    <TextArea label="Objetivo general" description="Usa un verbo en infinitivo, delimita el sistema, el contexto y el resultado esperado." value={draft.generalObjective} min={80} rows={4} disabled={disabled} error={errors.generalObjective} onChange={(generalObjective) => onChange({ generalObjective })} />
    <DynamicSection title="Objetivos específicos" description="Mínimo 3. Cada objetivo necesita un indicador de cumplimiento." error={errors.specificObjectives} onAdd={disabled ? undefined : () => onChange({ specificObjectives: [...draft.specificObjectives, createIRSpecificObjective(crypto.randomUUID())] })}>
      {draft.specificObjectives.map((item, index) => <RowCard key={item.id} title={`Objetivo ${index + 1}`} onRemove={!disabled && draft.specificObjectives.length > 1 ? () => onChange({ specificObjectives: draft.specificObjectives.filter((value) => value.id !== item.id) }) : undefined}>
        <TextArea label="Objetivo" value={item.objective} min={40} rows={3} disabled={disabled} onChange={(objective) => update(item.id, { objective })} />
        <TextField label="Indicador verificable" value={item.successIndicator} min={20} disabled={disabled} onChange={(successIndicator) => update(item.id, { successIndicator })} placeholder="Ej.: error medio menor al 5 % en 30 pruebas" />
      </RowCard>)}
    </DynamicSection>
    <TextArea label="Hipótesis o resultado esperado" description="¿Qué cambio esperas observar si la propuesta funciona y por qué?" value={draft.hypothesis} min={80} rows={4} disabled={disabled} error={errors.hypothesis} onChange={(hypothesis) => onChange({ hypothesis })} />
  </Section>;
}

function SolutionSection({ draft, disabled, errors, onChange }: SectionProps) {
  return <Section title="3. Diseña la solución robótica" intro="Describe el sistema como una integración de sensores, procesamiento, actuación, mecánica, software y datos según aplique.">
    <TextArea label="Solución propuesta" description="Explica qué hará el robot, cómo interactuará con el entorno y qué queda fuera del alcance." value={draft.solution} min={200} rows={7} disabled={disabled} error={errors.solution} onChange={(solution) => onChange({ solution })} />
    <TextArea label="Arquitectura del sistema" description="Detalla entradas, procesamiento, comunicaciones, actuadores, alimentación y salidas. Explica cómo se conectan." value={draft.architecture} min={180} rows={7} disabled={disabled} error={errors.architecture} onChange={(architecture) => onChange({ architecture })} />
    <TextArea label="Aporte o novedad" description="¿Qué aprendería el proyecto o qué mejora propone frente a alternativas existentes?" value={draft.innovation} min={80} rows={4} disabled={disabled} error={errors.innovation} onChange={(innovation) => onChange({ innovation })} />
    <div className="grid gap-4 lg:grid-cols-2">
      <div><LocalEvidenceUploader nodeId="IR" fieldId="research-diagram" label="Diagrama de arquitectura obligatorio" description="Sube un diagrama de bloques, flujo experimental o arquitectura con etiquetas legibles." accept="image/*,application/pdf,.svg,.png,.jpg,.jpeg,.pdf" value={[...draft.diagramFiles]} onChange={(diagramFiles) => onChange({ diagramFiles })} disabled={disabled} required />{errors.diagramFiles && <ErrorText>{errors.diagramFiles}</ErrorText>}</div>
      <LocalEvidenceUploader nodeId="IR" fieldId="research-proposal" label="Documento de apoyo opcional" description="Puedes adjuntar bocetos, cálculos, estado del arte o una propuesta ampliada." accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xlsx,.csv" value={[...draft.proposalFiles]} onChange={(proposalFiles) => onChange({ proposalFiles })} multiple maxFiles={5} disabled={disabled} />
    </div>
  </Section>;
}

function PlanSection({ draft, disabled, errors, onChange }: SectionProps) {
  const updatePhase = (id: string, patch: Partial<IRActionPhase>) => onChange({ actionPhases: draft.actionPhases.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateResource = (id: string, patch: Partial<IRResource>) => onChange({ resources: draft.resources.map((item) => item.id === id ? { ...item, ...patch } : item) });
  return <Section title="4. Construye un plan de acción ejecutable" intro="Divide la investigación en fases con entregables observables. El plan debe mostrar que sabes cómo pasar de la pregunta a la evidencia.">
    <DynamicSection title="Fases del proyecto" description="Mínimo 4 fases completas. Puedes agregar más si tu metodología lo requiere." error={errors.actionPhases} onAdd={disabled ? undefined : () => onChange({ actionPhases: [...draft.actionPhases, createIRActionPhase(crypto.randomUUID())] })}>
      {draft.actionPhases.map((phase, index) => <RowCard key={phase.id} title={`Fase ${index + 1}`} onRemove={!disabled && draft.actionPhases.length > 1 ? () => onChange({ actionPhases: draft.actionPhases.filter((item) => item.id !== phase.id) }) : undefined}>
        <div className="grid gap-3 sm:grid-cols-2"><TextField label="Nombre" value={phase.name} disabled={disabled} onChange={(name) => updatePhase(phase.id, { name })} /><TextField label="Duración estimada" placeholder="Ej.: 2 semanas" value={phase.duration} disabled={disabled} onChange={(duration) => updatePhase(phase.id, { duration })} /></div>
        <TextArea label="Propósito de la fase" value={phase.purpose} min={30} rows={3} disabled={disabled} onChange={(purpose) => updatePhase(phase.id, { purpose })} />
        <TextArea label="Actividades concretas" value={phase.activities} min={40} rows={4} disabled={disabled} onChange={(activities) => updatePhase(phase.id, { activities })} />
        <TextField label="Entregable verificable" value={phase.deliverable} min={20} disabled={disabled} onChange={(deliverable) => updatePhase(phase.id, { deliverable })} />
      </RowCard>)}
    </DynamicSection>
    <DynamicSection title="Recursos necesarios" description="Hardware, software, datos, espacios, asesorías, materiales o presupuesto. Mínimo 4." error={errors.resources} onAdd={disabled ? undefined : () => onChange({ resources: [...draft.resources, createIRResource(crypto.randomUUID())] })}>
      {draft.resources.map((resource, index) => <RowCard key={resource.id} title={`Recurso ${index + 1}`} onRemove={!disabled && draft.resources.length > 1 ? () => onChange({ resources: draft.resources.filter((item) => item.id !== resource.id) }) : undefined}>
        <div className="grid gap-3 lg:grid-cols-3"><TextField label="Recurso" value={resource.name} disabled={disabled} onChange={(name) => updateResource(resource.id, { name })} /><TextField label="Para qué se necesita" value={resource.purpose} min={15} disabled={disabled} onChange={(purpose) => updateResource(resource.id, { purpose })} /><TextField label="Fuente / disponibilidad" value={resource.source} disabled={disabled} onChange={(source) => updateResource(resource.id, { source })} placeholder="Laboratorio, préstamo, compra…" /></div>
      </RowCard>)}
    </DynamicSection>
  </Section>;
}

function ValidationSection({ draft, disabled, errors, onChange }: SectionProps) {
  const updateMetric = (id: string, patch: Partial<IRMetric>) => onChange({ metrics: draft.metrics.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateRisk = (id: string, patch: Partial<IRRisk>) => onChange({ risks: draft.risks.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateReference = (id: string, patch: Partial<IRReference>) => onChange({ references: draft.references.map((item) => item.id === id ? { ...item, ...patch } : item) });
  return <Section title="5. Define cómo validarás y qué puede salir mal" intro="Una propuesta de investigación sólida anticipa resultados medibles, riesgos, límites y responsabilidades.">
    <DynamicSection title="Métricas de éxito" description="Mínimo 3 métricas con meta cuantitativa o criterio observable." error={errors.metrics} onAdd={disabled ? undefined : () => onChange({ metrics: [...draft.metrics, createIRMetric(crypto.randomUUID())] })}>
      {draft.metrics.map((metric, index) => <RowCard key={metric.id} title={`Métrica ${index + 1}`} onRemove={!disabled && draft.metrics.length > 1 ? () => onChange({ metrics: draft.metrics.filter((item) => item.id !== metric.id) }) : undefined}><div className="grid gap-3 lg:grid-cols-3"><TextField label="Qué medirás" value={metric.metric} disabled={disabled} onChange={(value) => updateMetric(metric.id, { metric: value })} /><TextField label="Meta" value={metric.target} disabled={disabled} onChange={(target) => updateMetric(metric.id, { target })} placeholder="Ej.: ≥ 90 %" /><TextField label="Cómo lo verificarás" value={metric.verification} disabled={disabled} onChange={(verification) => updateMetric(metric.id, { verification })} /></div></RowCard>)}
    </DynamicSection>
    <DynamicSection title="Riesgos y mitigaciones" description="Mínimo 3: técnicos, de seguridad, datos, cronograma o recursos." error={errors.risks} onAdd={disabled ? undefined : () => onChange({ risks: [...draft.risks, createIRRisk(crypto.randomUUID())] })}>
      {draft.risks.map((risk, index) => <RowCard key={risk.id} title={`Riesgo ${index + 1}`} onRemove={!disabled && draft.risks.length > 1 ? () => onChange({ risks: draft.risks.filter((item) => item.id !== risk.id) }) : undefined}><div className="grid gap-3 lg:grid-cols-2"><TextArea label="Riesgo" value={risk.risk} min={15} rows={3} disabled={disabled} onChange={(value) => updateRisk(risk.id, { risk: value })} /><TextArea label="Prevención o mitigación" value={risk.mitigation} min={25} rows={3} disabled={disabled} onChange={(mitigation) => updateRisk(risk.id, { mitigation })} /></div></RowCard>)}
    </DynamicSection>
    <div className="grid gap-4 lg:grid-cols-2"><TextArea label="Ética, seguridad y ambiente" value={draft.ethicsAndSafety} min={120} rows={6} disabled={disabled} error={errors.ethicsAndSafety} onChange={(ethicsAndSafety) => onChange({ ethicsAndSafety })} /><TextArea label="Impacto esperado y beneficiarios" value={draft.expectedImpact} min={120} rows={6} disabled={disabled} error={errors.expectedImpact} onChange={(expectedImpact) => onChange({ expectedImpact })} /></div>
    <TextArea label="Limitaciones y alcance realista" value={draft.limitations} min={80} rows={4} disabled={disabled} error={errors.limitations} onChange={(limitations) => onChange({ limitations })} />
    <DynamicSection title="Fuentes y antecedentes" description="Mínimo 2 fuentes confiables: artículos, repositorios, normas o documentación técnica." error={errors.references} onAdd={disabled ? undefined : () => onChange({ references: [...draft.references, createIRReference(crypto.randomUUID())] })}>
      {draft.references.map((reference, index) => <RowCard key={reference.id} title={`Fuente ${index + 1}`} onRemove={!disabled && draft.references.length > 1 ? () => onChange({ references: draft.references.filter((item) => item.id !== reference.id) }) : undefined}><div className="grid gap-3 lg:grid-cols-2"><TextField label="Título / autor" value={reference.title} disabled={disabled} onChange={(title) => updateReference(reference.id, { title })} /><TextField label="URL completa" type="url" value={reference.url} disabled={disabled} onChange={(url) => updateReference(reference.id, { url })} placeholder="https://..." /></div></RowCard>)}
    </DynamicSection>
  </Section>;
}

interface SectionProps { draft: IRSubmission; disabled: boolean; errors: Partial<Record<IRFieldId, string>>; onChange: (patch: Partial<IRSubmission>) => void; }
function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) { return <section><div className="mb-5"><h3 className="font-heading text-xl font-semibold text-white">{title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{intro}</p></div><div className="space-y-5">{children}</div></section>; }
function DynamicSection({ title, description, error, onAdd, children }: { title: string; description: string; error?: string; onAdd?: () => void; children: ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-semibold text-white">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div>{onAdd && <button type="button" onClick={onAdd} className="min-h-9 rounded-lg border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan">Agregar</button>}</div><div className="mt-4 space-y-3">{children}</div>{error && <ErrorText>{error}</ErrorText>}</section>; }
function RowCard({ title, onRemove, children }: { title: string; onRemove?: () => void; children: ReactNode }) { return <article className="rounded-xl border border-white/10 bg-black/15 p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h5 className="text-xs font-bold uppercase tracking-[0.12em] text-cyan">{title}</h5>{onRemove && <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-400/10">Quitar</button>}</div><div className="space-y-3">{children}</div></article>; }
function TextField({ label, value, min, disabled, error, onChange, placeholder, type = "text" }: { label: string; value: string; min?: number; disabled: boolean; error?: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="block text-xs font-semibold text-slate-300">{label}<input type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`mt-2 min-h-11 w-full rounded-xl border bg-black/20 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan/60 ${error ? "border-danger/60" : "border-white/15"}`} />{min && <Counter value={value} min={min} />}{error && <ErrorText>{error}</ErrorText>}</label>; }
function TextArea({ label, description, value, min, rows, disabled, error, onChange }: { label: string; description?: string; value: string; min?: number; rows: number; disabled: boolean; error?: string; onChange: (value: string) => void }) { return <label className="block text-xs font-semibold text-slate-300">{label}{description && <span className="mt-1 block font-normal leading-5 text-slate-500">{description}</span>}<textarea value={value} rows={rows} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`mt-2 w-full resize-y rounded-xl border bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan/60 ${error ? "border-danger/60" : "border-white/15"}`} />{min && <Counter value={value} min={min} />}{error && <ErrorText>{error}</ErrorText>}</label>; }
function Counter({ value, min }: { value: string; min: number }) { return <span className={`mt-1 block text-right text-[10px] ${value.trim().length >= min ? "text-ok" : "text-slate-500"}`}>{value.trim().length}/{min} mínimo</span>; }
function ErrorText({ children }: { children: ReactNode }) { return <p role="alert" className="mt-2 text-xs leading-5 text-rose-300">{children}</p>; }
function BranchSelector({ selected, disabled, error, onChange }: { selected: readonly string[]; disabled: boolean; error?: string; onChange: (branches: string[]) => void }) { return <fieldset disabled={disabled}><legend className="text-xs font-semibold text-slate-300">Áreas que integra el proyecto</legend><p className="mt-1 text-xs text-slate-500">Elige mínimo 2 y explica su relación en la arquitectura.</p><div className="mt-3 flex flex-wrap gap-2">{IR_BRANCH_OPTIONS.map((branch) => { const checked = selected.includes(branch.id); return <label key={branch.id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition ${checked ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-white/12 bg-black/15 text-slate-400"}`}><input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((id) => id !== branch.id) : [...selected, branch.id])} className="sr-only" />{branch.label}</label>; })}</div>{error && <ErrorText>{error}</ErrorText>}</fieldset>; }

function createInitialProgress(saved?: NodeChallengeProgress): NodeChallengeProgress {
  const now = Date.now();
  const valid = saved?.nodeId === "IR" ? saved : undefined;
  const step = valid?.steps[IR_STEP_ID];
  return { nodeId: "IR", currentStepId: IR_STEP_ID, shuffleSeed: valid?.shuffleSeed ?? now, startedAt: valid?.startedAt ?? now, updatedAt: valid?.updatedAt ?? now, completedAt: valid?.completedAt ?? null, steps: { [IR_STEP_ID]: { draft: toJson(normalizeDraft(step?.draft)), attempts: step?.attempts ?? [], revealedHints: step?.revealedHints ?? 0, totalActiveSeconds: step?.totalActiveSeconds ?? 0, solvedAt: step?.solvedAt ?? null } }, analytics: valid?.analytics ?? { lastEvent: "challenge_started", reviewerRequired: true } };
}
function normalizeDraft(value: JsonValue | undefined): IRSubmission {
  const fallback = createIRDraft();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  return {
    ...fallback,
    title: text(raw.title), branches: stringArray(raw.branches), context: text(raw.context), problem: text(raw.problem), researchQuestion: text(raw.researchQuestion), justification: text(raw.justification), generalObjective: text(raw.generalObjective), hypothesis: text(raw.hypothesis), solution: text(raw.solution), architecture: text(raw.architecture), innovation: text(raw.innovation), ethicsAndSafety: text(raw.ethicsAndSafety), expectedImpact: text(raw.expectedImpact), limitations: text(raw.limitations),
    specificObjectives: normalizeArray(raw.specificObjectives, normalizeObjective, fallback.specificObjectives),
    actionPhases: normalizeArray(raw.actionPhases, normalizePhase, fallback.actionPhases),
    resources: normalizeArray(raw.resources, normalizeResource, fallback.resources), metrics: normalizeArray(raw.metrics, normalizeMetric, fallback.metrics), risks: normalizeArray(raw.risks, normalizeRisk, fallback.risks), references: normalizeArray(raw.references, normalizeReference, fallback.references), diagramFiles: evidenceArray(raw.diagramFiles), proposalFiles: evidenceArray(raw.proposalFiles),
  };
}
function normalizeArray<T>(value: unknown, normalize: (value: unknown) => T | null, fallback: readonly T[]): T[] { if (!Array.isArray(value)) return [...fallback]; const result = value.map(normalize).filter((item): item is T => item !== null).slice(0, 30); return result.length ? result : [...fallback]; }
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function normalizeObjective(value: unknown): IRSpecificObjective | null { const item = record(value); return item ? { id: id(item.id), objective: text(item.objective), successIndicator: text(item.successIndicator) } : null; }
function normalizePhase(value: unknown): IRActionPhase | null { const item = record(value); return item ? { id: id(item.id), name: text(item.name), purpose: text(item.purpose), activities: text(item.activities), deliverable: text(item.deliverable), duration: text(item.duration) } : null; }
function normalizeResource(value: unknown): IRResource | null { const item = record(value); return item ? { id: id(item.id), name: text(item.name), purpose: text(item.purpose), source: text(item.source) } : null; }
function normalizeMetric(value: unknown): IRMetric | null { const item = record(value); return item ? { id: id(item.id), metric: text(item.metric), target: text(item.target), verification: text(item.verification) } : null; }
function normalizeRisk(value: unknown): IRRisk | null { const item = record(value); return item ? { id: id(item.id), risk: text(item.risk), mitigation: text(item.mitigation) } : null; }
function normalizeReference(value: unknown): IRReference | null { const item = record(value); return item ? { id: id(item.id), title: text(item.title), url: text(item.url) } : null; }
function evidenceArray(value: unknown): LocalEvidenceFile[] { if (!Array.isArray(value)) return []; return value.filter((item): item is LocalEvidenceFile => { const data = record(item); return Boolean(data && typeof data.id === "string" && typeof data.name === "string" && typeof data.mimeType === "string" && typeof data.size === "number"); }); }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 10) : []; }
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function id(value: unknown): string { return typeof value === "string" && value ? value : crypto.randomUUID(); }
function toJson(value: unknown): JsonValue { return JSON.parse(JSON.stringify(value)) as JsonValue; }

export default IRChallenge;
