import { describe, expect, it } from "vitest";
import type { LocalEvidenceFile } from "@/lib/challenges/evidenceStore";
import {
  FINAL_REFLECTION_FIELD_ID,
  FINAL_SUBMISSION_NODE_ID,
  buildFinalReflectionProgress,
  getFinalReflectionFiles,
  hasFinalReflectionVideo,
} from "@/lib/finalSubmission";

function evidence(mimeType: string): LocalEvidenceFile {
  return {
    id: "evidence-1",
    nodeId: FINAL_SUBMISSION_NODE_ID,
    fieldId: FINAL_REFLECTION_FIELD_ID,
    name: mimeType.startsWith("video/") ? "reflexion.mp4" : "reflexion.pdf",
    mimeType,
    size: 1_024,
    lastModified: 1,
    storedAt: 1,
  };
}

describe("finalSubmission", () => {
  it("conserva el video de reflexión en el progreso", () => {
    const progress = buildFinalReflectionProgress([evidence("video/mp4")], undefined);
    expect(getFinalReflectionFiles(progress)).toHaveLength(1);
    expect(hasFinalReflectionVideo(progress)).toBe(true);
  });

  it("no acepta un archivo que no sea video como reflexión final", () => {
    const progress = buildFinalReflectionProgress([evidence("application/pdf")], undefined);
    expect(hasFinalReflectionVideo(progress)).toBe(false);
  });
});
