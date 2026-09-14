import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import type { JsonValue, NodeChallengeProgress } from "@/lib/types";

export const FINAL_SUBMISSION_NODE_ID = "FINAL_SUBMISSION";
export const FINAL_REFLECTION_STEP_ID = "reflection";
export const FINAL_REFLECTION_FIELD_ID = "final-reflection-video";
export const FINAL_REFLECTION_QUESTION =
  "¿Por qué quieres pertenecer al Semillero de Robótica?";

interface FinalReflectionDraft {
  question: string;
  files: LocalEvidenceFile[];
}

export function getFinalReflectionFiles(
  progress: NodeChallengeProgress | undefined
): LocalEvidenceFile[] {
  if (progress?.nodeId !== FINAL_SUBMISSION_NODE_ID) return [];
  const draft = progress.steps[FINAL_REFLECTION_STEP_ID]?.draft;
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) return [];
  const files = (draft as Record<string, JsonValue>).files;
  if (!Array.isArray(files)) return [];
  return files
    .filter(isEvidenceFile)
    .map((file) => file as unknown as LocalEvidenceFile);
}

export function hasFinalReflectionVideo(
  progress: NodeChallengeProgress | undefined
): boolean {
  return getFinalReflectionFiles(progress).some((file) =>
    file.mimeType.toLowerCase().startsWith("video/")
  );
}

export function buildFinalReflectionProgress(
  files: LocalEvidenceFile[],
  current: NodeChallengeProgress | undefined
): NodeChallengeProgress {
  const now = Date.now();
  const previous =
    current?.nodeId === FINAL_SUBMISSION_NODE_ID ? current : undefined;
  const previousStep = previous?.steps[FINAL_REFLECTION_STEP_ID];
  const draft: FinalReflectionDraft = {
    question: FINAL_REFLECTION_QUESTION,
    files,
  };

  return {
    nodeId: FINAL_SUBMISSION_NODE_ID,
    currentStepId: FINAL_REFLECTION_STEP_ID,
    shuffleSeed: previous?.shuffleSeed ?? now,
    startedAt: previous?.startedAt ?? now,
    updatedAt: now,
    completedAt: null,
    steps: {
      [FINAL_REFLECTION_STEP_ID]: {
        draft: JSON.parse(JSON.stringify(draft)) as JsonValue,
        attempts: previousStep?.attempts ?? [],
        revealedHints: 0,
        totalActiveSeconds: previousStep?.totalActiveSeconds ?? 0,
        solvedAt: null,
      },
    },
    analytics: {
      ...(previous?.analytics ?? {}),
      lastEvent: "final_reflection_changed",
      videoAttached: files.some((file) =>
        file.mimeType.toLowerCase().startsWith("video/")
      ),
    },
  };
}

function isEvidenceFile(value: JsonValue): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.nodeId === "string" &&
    typeof value.fieldId === "string" &&
    typeof value.name === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.size === "number"
  );
}
