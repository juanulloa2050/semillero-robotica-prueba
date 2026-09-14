import type { IntroItem, IntroItemType } from "@/lib/types";

export type ReviewerAttachmentSource = "introduction" | "challenge";
export type ReviewerPreviewKind = "image" | "audio" | "video" | "pdf" | "none";

export interface IntroductionRow {
  id: string;
  kind: IntroItemType;
  title: string;
  content: string | null;
  storage_path: string | null;
  position: number;
  created_at: string;
}

export interface EvidenceRow {
  id: string;
  node_id: string;
  field_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ReviewerAttachment {
  id: string;
  source: ReviewerAttachmentSource;
  kind: IntroItemType | "evidence";
  title: string;
  content: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  nodeId: string | null;
  fieldId: string | null;
  createdAt: string | null;
  localOnly: boolean;
}

export function buildIntroductionAttachments(
  snapshotItems: readonly IntroItem[],
  rows: readonly IntroductionRow[]
): ReviewerAttachment[] {
  const remotePaths = new Set(rows.flatMap((row) => row.storage_path ? [row.storage_path] : []));
  const remoteContent = new Set(rows.flatMap((row) => row.content ? [row.content] : []));
  const remote = [...rows]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((row) => ({
      id: row.id,
      source: "introduction" as const,
      kind: row.kind,
      title: row.title,
      content: row.content,
      storagePath: row.storage_path,
      mimeType: inferMimeType(row.title, row.kind),
      sizeBytes: null,
      nodeId: null,
      fieldId: null,
      createdAt: row.created_at,
      localOnly: false,
    }));

  const snapshotOnly = snapshotItems
    .filter((item) => {
      const path = storagePathFromContent(item.content);
      if (path) return !remotePaths.has(path);
      return !remoteContent.has(item.content);
    })
    .map((item) => {
      const storagePath = storagePathFromContent(item.content);
      return {
        id: `snapshot-${item.id}`,
        source: "introduction" as const,
        kind: item.type,
        title: item.title,
        content: storagePath ? null : item.content,
        storagePath,
        mimeType: inferMimeType(item.title, item.type),
        sizeBytes: null,
        nodeId: null,
        fieldId: null,
        createdAt: new Date(item.createdAt).toISOString(),
        localOnly: item.content.startsWith("blob:"),
      };
    });

  return [...remote, ...snapshotOnly];
}

export function buildEvidenceAttachments(rows: readonly EvidenceRow[]): ReviewerAttachment[] {
  return rows.map((row) => ({
    id: row.id,
    source: "challenge",
    kind: "evidence",
    title: row.original_name,
    content: null,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    nodeId: row.node_id,
    fieldId: row.field_id,
    createdAt: row.created_at,
    localOnly: false,
  }));
}

export function storagePathFromContent(content: string): string | null {
  return content.startsWith("storage:") ? content.slice("storage:".length) : null;
}

export function previewKind(attachment: ReviewerAttachment): ReviewerPreviewKind {
  const mime = attachment.mimeType?.toLowerCase() ?? "";
  const name = attachment.title.toLowerCase();
  if (attachment.kind === "image" || mime.startsWith("image/")) return "image";
  if (attachment.kind === "audio" || mime.startsWith("audio/")) return "audio";
  if (attachment.kind === "video" || mime.startsWith("video/")) return "video";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "none";
}

export function formatEvidenceSize(sizeBytes: number | null): string | null {
  if (sizeBytes === null || !Number.isFinite(sizeBytes) || sizeBytes < 0) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 ** 2) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 ** 2).toFixed(1)} MB`;
}

export function isSafeHttpUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function inferMimeType(name: string, kind: IntroItemType): string | null {
  if (kind === "image") return "image/*";
  if (kind === "audio") return "audio/*";
  if (kind === "video") return "video/*";
  if (name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  return null;
}
