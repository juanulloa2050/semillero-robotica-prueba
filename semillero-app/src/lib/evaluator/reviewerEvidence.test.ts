import { describe, expect, it } from "vitest";
import {
  buildEvidenceAttachments,
  buildIntroductionAttachments,
  formatEvidenceSize,
  isSafeHttpUrl,
  previewKind,
} from "./reviewerEvidence";

describe("reviewerEvidence", () => {
  it("combina la presentación remota con texto del snapshot sin duplicar archivos", () => {
    const result = buildIntroductionAttachments(
      [
        { id: "local-file", type: "file", title: "perfil.pdf", content: "storage:user/run/introduction/perfil.pdf", createdAt: 10 },
        { id: "text", type: "text", title: "Sobre mí", content: "Me interesa la robótica.", createdAt: 20 },
      ],
      [
        { id: "remote-file", kind: "file", title: "perfil.pdf", content: null, storage_path: "user/run/introduction/perfil.pdf", position: 0, created_at: "2026-08-28T00:00:00Z" },
      ]
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "remote-file", storagePath: "user/run/introduction/perfil.pdf", localOnly: false });
    expect(result[1]).toMatchObject({ kind: "text", content: "Me interesa la robótica." });
  });

  it("normaliza evidencias y detecta vistas previas", () => {
    const [attachment] = buildEvidenceAttachments([
      { id: "evidence", node_id: "E2", field_id: "schematic", storage_path: "user/run/E2/schema.pdf", original_name: "schema.pdf", mime_type: "application/pdf", size_bytes: 2048, created_at: "2026-08-28T00:00:00Z" },
    ]);
    expect(attachment.nodeId).toBe("E2");
    expect(previewKind(attachment)).toBe("pdf");
    expect(formatEvidenceSize(attachment.sizeBytes)).toBe("2.0 KB");
  });

  it("sólo permite enlaces http y https", () => {
    expect(isSafeHttpUrl("https://example.com/demo")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("texto libre")).toBe(false);
  });
});
