"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChallengeAttempt, NodeChallengeProgress } from "@/lib/types";
import type { SystemsChallengeNodeId } from "@/lib/challenges/systems/registry";
import { executeTerminalCommand, replayTerminal, scenarioChecklist, terminalPrompt } from "@/lib/challenges/systems/terminalEngine";

interface Props {
  nodeId: SystemsChallengeNodeId;
  savedProgress?: NodeChallengeProgress;
  readOnly: boolean;
  onSave: (progress: NodeChallengeProgress) => void;
  onComplete: (progress: NodeChallengeProgress) => void;
  onExit?: () => void;
}

interface Scenario {
  category: string;
  instruction: string;
  objective: string;
  hints: string[];
  free?: boolean;
}

const SCENARIOS: Record<SystemsChallengeNodeId, Scenario> = {
  SI0: { category: "Fundamentos Linux", instruction: "Encuentra el nombre del robot", objective: "Explora el sistema con ls, cd y pwd. Localiza nombre_robot.txt y muestra su contenido con cat.", hints: ["Empieza listando el directorio actual.", "El archivo está dentro de proyectos/rover/config.", "Entra a cada carpeta con cd y después usa cat nombre_robot.txt."] },
  SI1A: { category: "Archivos", instruction: "Prepara los datos de entrega", objective: "Crea entrega, copia telemetria.csv, renómbrala como datos.csv, encuentra debug.tmp y elimínalo.", hints: ["Crea primero el destino con mkdir.", "Usa cp y luego mv para obtener entrega/datos.csv.", "find . -name debug.tmp te muestra qué archivo borrar."] },
  SI1B: { category: "Permisos", instruction: "Recupera el script de arranque", objective: "start_robot.sh responde Permission denied. Inspecciona sus permisos, añade sólo ejecución y vuelve a iniciarlo.", hints: ["Revisa permisos con ls -l.", "Al archivo le falta el bit de ejecución.", "Usa chmod +x start_robot.sh y vuelve a ejecutarlo."] },
  SI2: { category: "Debugging de entorno", instruction: "Repara el entorno de controller.py", objective: "Investiga el intérprete y sus paquetes, activa .venv, instala pyserial allí y comprueba el controlador.", hints: ["Comprueba qué python3 estás usando y lista sus paquetes.", "Hay un entorno .venv disponible.", "Actívalo e instala con python -m pip install pyserial."] },
  SI3A: { category: "Procesos", instruction: "Detén el proceso anómalo", objective: "Inspecciona los procesos y detén exactamente el que consume casi toda la CPU, sin afectar servicios críticos.", hints: ["Usa ps aux o top.", "vision_node consume 98% de CPU.", "El PID de vision_node es 622."] },
  SI3B: { category: "Networking", instruction: "Demuestra la causa de la desconexión", objective: "El PC 192.168.0.23/24 no alcanza al robot 192.168.1.52/24. Reúne evidencia y confirma el diagnóstico.", hints: ["Compara dirección y máscara de ambos equipos.", "Revisa si existe ruta hacia 192.168.1.0/24.", "Después de probar ping, usa diagnose subnet."] },
  SI4: { category: "ROS 2", instruction: "Encuentra dónde se rompe el flujo", objective: "El robot detecta objetos pero no se mueve. Sigue camera → detector → planner → cmd_vel y documenta la causa.", hints: ["Confirma que detector y planner estén vivos.", "Comprueba /objects y luego quién publica en /cmd_vel.", "planner está publicando en /cmd_vell por error; confirma con diagnose cmd_vell."] },
  SI5: { category: "Git colaborativo", instruction: "Entrega una resolución limpia", objective: "Inspecciona el repo, resuelve config.yaml, prepara sólo los archivos relevantes y crea un commit descriptivo.", hints: ["Empieza con status, diff y branch.", "Conserva max_speed: 0.6 y emergency_stop: true mediante resolve config.yaml.", "Añade controller.py y config.yaml; nunca notes.txt."] },
  SI6: { category: "Deployment reproducible", instruction: "Diseña una entrega reproducible", objective: "Explica cómo empaquetarías una aplicación de telemetría para que otra persona pueda iniciarla y diagnosticarla.", hints: ["Puedes elegir Docker, Bash, systemd o un paquete ROS 2.", "Separa configuración y secretos del código.", "Incluye un comando de arranque, salud/logs y al menos una limitación."], free: true },
};

export function SystemsChallenge({ nodeId, savedProgress, readOnly, onSave, onComplete }: Props) {
  const scenario = SCENARIOS[nodeId];
  const [progress, setProgress] = useState(() => normalizeProgress(nodeId, savedProgress));
  const [command, setCommand] = useState("");
  const [freeAnswer, setFreeAnswer] = useState(() => typeof progress.steps.mission.draft === "string" ? progress.steps.mission.draft : "");
  const [feedback, setFeedback] = useState("");
  const openedAt = useRef(progress.updatedAt);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const attempts = progress.steps.mission.attempts;
  const commands = useMemo(() => attempts.map((attempt) => String(attempt.answer)), [attempts]);
  const simulation = useMemo(() => replayTerminal(nodeId, commands), [nodeId, commands]);
  const checklist = useMemo(() => scenarioChecklist(nodeId, simulation), [nodeId, simulation]);
  const completed = Boolean(progress.completedAt);

  useEffect(() => { terminalScrollRef.current?.scrollTo({ top: terminalScrollRef.current.scrollHeight }); }, [attempts.length]);

  function commit(next: NodeChallengeProgress, complete = false) {
    setProgress(next);
    onSave(next);
    if (complete) onComplete(next);
  }

  function runCommand(event: React.FormEvent) {
    event.preventDefault();
    const normalized = command.trim().replace(/\s+/g, " ");
    if (!normalized || readOnly || completed) return;
    const now = Date.now();
    const prompt = terminalPrompt(simulation);
    const result = executeTerminalCommand(nodeId, simulation, normalized);
    const attempt: ChallengeAttempt = {
      id: crypto.randomUUID(), nodeId, stepId: "mission", attemptNumber: attempts.length + 1,
      startedAt: openedAt.current, submittedAt: now, durationSeconds: Math.max(0, Math.round((now - openedAt.current) / 1000)),
      answer: normalized, isCorrect: result.completed ? true : result.error ? false : null,
      hintsUsed: progress.steps.mission.revealedHints,
      metadata: { output: result.output, isError: result.error, recognized: result.recognized, prompt },
    };
    const step = { ...progress.steps.mission, attempts: [...attempts, attempt], totalActiveSeconds: progress.steps.mission.totalActiveSeconds + attempt.durationSeconds, solvedAt: result.completed ? now : null };
    const next = { ...progress, updatedAt: now, completedAt: result.completed ? now : null, steps: { mission: step }, analytics: { ...progress.analytics, commands: attempts.length + 1, lastEvent: result.completed ? "completed" : result.error ? "command_error" : "command" } };
    commit(next, result.completed);
    setCommand("");
    setFeedback(result.completed ? "Reto completado. Tu recorrido quedó registrado." : result.error ? result.output : "Comando ejecutado. Continúa con el objetivo.");
    openedAt.current = now;
  }

  function updateDraft(value: string) {
    setFreeAnswer(value);
    const next = { ...progress, updatedAt: Date.now(), steps: { mission: { ...progress.steps.mission, draft: value } } };
    setProgress(next);
    onSave(next);
  }

  function submitFree() {
    const answer = freeAnswer.trim();
    if (answer.length < 120 || readOnly || completed) { setFeedback("Desarrolla la propuesta con al menos 120 caracteres."); return; }
    const now = Date.now();
    const attempt: ChallengeAttempt = { id: crypto.randomUUID(), nodeId, stepId: "mission", attemptNumber: attempts.length + 1, startedAt: openedAt.current, submittedAt: now, durationSeconds: Math.max(0, Math.round((now - openedAt.current) / 1000)), answer, isCorrect: null, hintsUsed: progress.steps.mission.revealedHints, metadata: { review: "human" } };
    const next = { ...progress, updatedAt: now, completedAt: now, steps: { mission: { ...progress.steps.mission, draft: answer, attempts: [...attempts, attempt], solvedAt: now } }, analytics: { ...progress.analytics, lastEvent: "submitted_for_review" } };
    commit(next, true);
    setFeedback("Entrega registrada para revisión humana.");
  }

  function revealHint() {
    if (readOnly || completed) return;
    const count = Math.min(3, progress.steps.mission.revealedHints + 1);
    const next = { ...progress, updatedAt: Date.now(), steps: { mission: { ...progress.steps.mission, revealedHints: count } } };
    commit(next);
    setFeedback(scenario.hints[count - 1]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#071927]">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border-b border-line bg-[#0a2133] px-5 py-5 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-6 lg:py-7">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-cyan/25 bg-cyan/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan">{scenario.category}</span>
            <span className="font-mono text-xs text-muted">{nodeId}</span>
          </div>
          <h2 id="skill-detail-title" className="mt-5 text-balance font-heading text-2xl font-semibold tracking-[-0.025em] text-ink lg:text-3xl">{scenario.instruction}</h2>
          <p id="skill-detail-description" className="mt-3 text-sm leading-6 text-muted">{scenario.objective}</p>

          {!scenario.free && (
            <section className="mt-7 border-t border-line pt-5" aria-label="Progreso del reto">
              <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold text-ink">Objetivos</h3><span className="text-[11px] tabular-nums text-muted">{checklist.filter((item) => item.done).length}/{checklist.length}</span></div>
              <ul className="mt-3 space-y-3">
                {checklist.map((item) => (
                  <li key={item.label} className="flex gap-3 text-xs leading-5 text-muted"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-ok bg-ok/15 text-ok" : "border-line text-transparent"}`} aria-hidden="true">✓</span><span className={item.done ? "text-ice" : undefined}>{item.label}</span></li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <button type="button" onClick={revealHint} disabled={readOnly || completed || progress.steps.mission.revealedHints >= 3} className="min-h-10 rounded-lg border border-cyan/25 px-4 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/[0.07] disabled:cursor-not-allowed disabled:opacity-40">Pista {Math.min(3, progress.steps.mission.revealedHints + 1)} de 3</button>
            <p className={`mt-3 text-xs leading-5 ${completed ? "text-ok" : "text-muted"}`} aria-live="polite">{feedback || (completed ? "Reto completado." : `${attempts.length} ${scenario.free ? "entregas" : "comandos"} registrados`)}</p>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col p-3 sm:p-5 lg:p-6">
          {scenario.free ? (
            <div className="flex min-h-[60vh] flex-1 flex-col">
              <div className="mb-4 flex items-center justify-between gap-4"><div><h3 className="font-heading text-lg font-semibold text-ink">Documento de despliegue</h3><p className="mt-1 text-xs text-muted">Mínimo 120 caracteres · revisión humana</p></div><span className="font-mono text-xs tabular-nums text-muted">{freeAnswer.trim().length} caracteres</span></div>
              <textarea disabled={readOnly || completed} value={freeAnswer} onChange={(event) => updateDraft(event.target.value)} className="min-h-72 flex-1 resize-none rounded-xl border border-line bg-[#06131e] p-5 text-sm leading-7 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-cyan disabled:opacity-70" placeholder="Describe el artefacto, los comandos de instalación y arranque, la configuración sin secretos, cómo consultar logs y salud, y al menos una limitación…" />
              <div className="mt-4 flex justify-end"><button type="button" onClick={submitFree} disabled={readOnly || completed} className="min-h-11 rounded-lg bg-action px-5 text-sm font-semibold text-white transition-colors hover:bg-tech disabled:cursor-not-allowed disabled:opacity-50">Entregar para evaluación</button></div>
            </div>
          ) : (
            <section className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#030b12] font-mono shadow-[0_24px_70px_rgba(0,0,0,0.32)]" aria-label="Terminal simulada">
              <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.035] px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-danger" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-ok" /><span className="ml-2 text-[11px] text-muted">terminal de práctica · sistema aislado</span></div>
              <div ref={terminalScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 text-xs leading-6 text-ice/90 sm:p-5" aria-live="polite">
                <p className="text-muted">Escribe <span className="text-cyan">help</span> para ver los comandos disponibles.</p>
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="mt-3"><p className="break-all"><span className="text-cyan">{String(attempt.metadata?.prompt ?? "robot@semillero:~$")}</span> {String(attempt.answer)}</p>{String(attempt.metadata?.output ?? "") && <pre className={`whitespace-pre-wrap font-mono ${attempt.metadata?.isError ? "text-danger" : "text-muted"}`}>{String(attempt.metadata?.output ?? "")}</pre>}</div>
                ))}
              </div>
              <form onSubmit={runCommand} className="flex shrink-0 items-center border-t border-white/10 bg-[#06111a]"><label className="sr-only" htmlFor={`terminal-${nodeId}`}>Comando</label><span className="max-w-[45%] truncate py-3 pl-4 text-xs text-cyan sm:max-w-none">{terminalPrompt(simulation)}</span><input id={`terminal-${nodeId}`} disabled={readOnly || completed} value={command} onChange={(event) => setCommand(event.target.value)} autoComplete="off" spellCheck={false} autoFocus className="min-w-0 flex-1 bg-transparent px-2 py-3 text-xs text-ink outline-none disabled:cursor-not-allowed" /><button type="submit" disabled={readOnly || completed} className="self-stretch border-l border-white/10 px-4 text-xs font-semibold text-cyan transition-colors hover:bg-white/[0.04] disabled:text-muted">Ejecutar</button></form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function normalizeProgress(nodeId: SystemsChallengeNodeId, saved?: NodeChallengeProgress): NodeChallengeProgress {
  if (saved?.nodeId === nodeId && saved.steps.mission) return saved;
  const now = Date.now();
  return { nodeId, currentStepId: "mission", shuffleSeed: now, startedAt: now, updatedAt: now, completedAt: null, steps: { mission: { draft: null, attempts: [], revealedHints: 0, totalActiveSeconds: 0, solvedAt: null } }, analytics: { lastEvent: "opened" } };
}
