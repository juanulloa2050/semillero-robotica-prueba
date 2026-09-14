"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { nodeById } from "@/lib/data/nodes";
import {
  buildEvidenceAttachments,
  buildIntroductionAttachments,
  formatEvidenceSize,
  isSafeHttpUrl,
  previewKind,
  type EvidenceRow,
  type IntroductionRow,
  type ReviewerAttachment,
} from "@/lib/evaluator/reviewerEvidence";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { IntroItem } from "@/lib/types";

const SIGNED_URL_TTL_SECONDS = 10 * 60;

interface SignedLinks {
  viewUrl: string | null;
  downloadUrl: string | null;
  error: string | null;
}

interface Props {
  runId: string;
  snapshotIntroduction?: readonly IntroItem[];
  nodeId?: string;
  showIntroduction?: boolean;
  showEvidence?: boolean;
  compact?: boolean;
}

export function RunEvidencePanel({ runId, snapshotIntroduction, nodeId, showIntroduction = true, showEvidence = true, compact = false }: Props) {
  const [introductions, setIntroductions] = useState<ReviewerAttachment[]>([]);
  const [evidence, setEvidence] = useState<ReviewerAttachment[]>([]);
  const [links, setLinks] = useState<Record<string, SignedLinks>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadEvidence = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setError("Supabase no está configurado en este despliegue.");
      return;
    }

    setLoading(true);
    setError("");

    const [introductionResult, evidenceResult] = await Promise.all([
      supabase
        .from("introductions")
        .select("id,kind,title,content,storage_path,position,created_at")
        .eq("run_id", runId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("evidence_files")
        .select("id,node_id,field_id,storage_path,original_name,mime_type,size_bytes,created_at")
        .eq("run_id", runId)
        .order("node_id", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (requestId !== requestIdRef.current) return;
    if (introductionResult.error || evidenceResult.error) {
      setError(introductionResult.error?.message ?? evidenceResult.error?.message ?? "No fue posible consultar los archivos.");
      setLoading(false);
      return;
    }

    const nextIntroductions = buildIntroductionAttachments(
      snapshotIntroduction ?? [],
      (introductionResult.data ?? []) as IntroductionRow[]
    );
    const nextEvidence = buildEvidenceAttachments((evidenceResult.data ?? []) as EvidenceRow[]);
    const signable = [...nextIntroductions, ...nextEvidence].filter(
      (attachment) => attachment.storagePath && !attachment.localOnly
    );

    const signedEntries = await Promise.all(
      signable.map(async (attachment) => {
        const path = attachment.storagePath as string;
        const [viewResult, downloadResult] = await Promise.all([
          supabase.storage.from("evidence").createSignedUrl(path, SIGNED_URL_TTL_SECONDS),
          supabase.storage.from("evidence").createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: true }),
        ]);
        return [
          attachment.id,
          {
            viewUrl: viewResult.data?.signedUrl ?? null,
            downloadUrl: downloadResult.data?.signedUrl ?? null,
            error: viewResult.error?.message ?? downloadResult.error?.message ?? null,
          },
        ] as const;
      })
    );

    if (requestId !== requestIdRef.current) return;
    setIntroductions(nextIntroductions);
    setEvidence(nextEvidence);
    setLinks(Object.fromEntries(signedEntries));
    setLoading(false);
  }, [runId, snapshotIntroduction]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(loadEvidence).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : "No fue posible cargar las evidencias.");
      setLoading(false);
    });
    return () => {
      active = false;
      requestIdRef.current += 1;
    };
  }, [loadEvidence]);

  const evidenceGroups = useMemo(() => {
    const groups = new Map<string, ReviewerAttachment[]>();
    for (const attachment of evidence) {
      if (nodeId && attachment.nodeId !== nodeId) continue;
      const groupNodeId = attachment.nodeId ?? "OTRO";
      groups.set(groupNodeId, [...(groups.get(groupNodeId) ?? []), attachment]);
    }
    return [...groups.entries()];
  }, [evidence, nodeId]);

  if (loading) {
    return (
      <section className="mt-7" aria-busy="true" aria-label="Cargando archivos y presentación">
        <div className="h-5 w-52 animate-pulse rounded bg-surface-raised/70" />
        <div className="mt-3 h-28 animate-pulse rounded-xl border border-line bg-night/30" />
      </section>
    );
  }

  return (
    <section className={compact ? "mt-5" : "mt-7"} aria-labelledby={`attachments-${runId}-${nodeId ?? "all"}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id={`attachments-${runId}-${nodeId ?? "all"}`} className="text-sm font-semibold text-ink">{nodeId ? "Archivos del reto" : "Archivos y presentación"}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Los archivos son privados. Los enlaces de revisión vencen en 10 minutos.</p>
        </div>
        <button type="button" onClick={() => void loadEvidence()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-ice transition-colors hover:border-cyan/45 hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">
          <RefreshIcon /> Actualizar enlaces
        </button>
      </div>

      {error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">No pudimos cargar los archivos. {error}</p>
          <button type="button" onClick={() => void loadEvidence()} className="min-h-9 rounded-lg border border-danger/35 px-3 text-xs font-semibold text-ink hover:bg-danger/10">Reintentar</button>
        </div>
      ) : (!showIntroduction || introductions.length === 0) && (!showEvidence || evidenceGroups.length === 0) ? (
        <div className="mt-3 rounded-xl border border-dashed border-line bg-night/20 p-6 text-center">
          <p className="text-sm font-semibold text-ice">No hay archivos asociados</p>
          <p className="mt-1 text-xs leading-5 text-muted">{nodeId ? "El aspirante no adjuntó archivos en este reto." : "Cuando el aspirante adjunte su presentación o evidencias de un reto aparecerán aquí."}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {showIntroduction && introductions.length > 0 && (
            <AttachmentGroup title="Presentación inicial" count={introductions.length}>
              {introductions.map((attachment) => <AttachmentItem key={attachment.id} attachment={attachment} links={links[attachment.id]} />)}
            </AttachmentGroup>
          )}

          {showEvidence && evidenceGroups.map(([nodeId, attachments]) => (
            <AttachmentGroup key={nodeId} title={`${nodeId} · ${nodeById(nodeId)?.title ?? "Reto"}`} count={attachments.length}>
              {attachments.map((attachment) => <AttachmentItem key={attachment.id} attachment={attachment} links={links[attachment.id]} />)}
            </AttachmentGroup>
          ))}
        </div>
      )}
    </section>
  );
}

function AttachmentGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-night/25">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h4 className="min-w-0 truncate text-xs font-semibold text-ice">{title}</h4>
        <span className="shrink-0 text-[11px] tabular-nums text-muted">{count} {count === 1 ? "elemento" : "elementos"}</span>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function AttachmentItem({ attachment, links }: { attachment: ReviewerAttachment; links?: SignedLinks }) {
  const size = formatEvidenceSize(attachment.sizeBytes);
  const kind = previewKind(attachment);
  const safeLink = attachment.kind === "link" && isSafeHttpUrl(attachment.content) ? attachment.content : null;
  const canPreview = Boolean(links?.viewUrl && kind !== "none");

  return (
    <article className="min-w-0 px-4 py-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised/70 text-cyan"><FileIcon /></span>
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-ink">{attachment.title || "Sin título"}</p>
            <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted">
              <span>{attachment.source === "challenge" ? fieldLabel(attachment.fieldId) : kindLabel(attachment.kind)}</span>
              {attachment.mimeType && <span>{attachment.mimeType}</span>}
              {size && <span>{size}</span>}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {safeLink && <ActionLink href={safeLink} label="Abrir enlace" icon={<ExternalIcon />} />}
          {links?.viewUrl && <ActionLink href={links.viewUrl} label="Abrir" icon={<ExternalIcon />} />}
          {links?.downloadUrl && <ActionLink href={links.downloadUrl} label="Descargar" icon={<DownloadIcon />} download />}
        </div>
      </div>

      {attachment.kind === "text" && attachment.content && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-surface/35 p-3 text-sm leading-6 text-ice">{attachment.content}</p>}
      {attachment.kind === "link" && attachment.content && !safeLink && <p className="mt-3 text-xs text-danger">El enlace guardado no tiene un formato seguro http/https.</p>}
      {attachment.localOnly && <p className="mt-3 text-xs leading-5 text-muted">Este elemento sólo quedó disponible en el navegador donde fue creado y no puede abrirse desde el panel.</p>}
      {links?.error && <p className="mt-3 text-xs leading-5 text-danger">No se pudo firmar este archivo. Actualiza los enlaces o revisa los permisos de Storage.</p>}
      {canPreview && <AttachmentPreview kind={kind} url={links?.viewUrl as string} title={attachment.title} mimeType={attachment.mimeType} />}
    </article>
  );
}

function AttachmentPreview({ kind, url, title, mimeType }: { kind: ReturnType<typeof previewKind>; url: string; title: string; mimeType: string | null }) {
  if (kind === "audio") return <audio controls preload="metadata" className="mt-4 w-full" src={url}>Tu navegador no puede reproducir este audio.</audio>;
  if (kind === "video") return <video controls preload="metadata" className="mt-4 max-h-[28rem] w-full rounded-lg bg-black" src={url}>Tu navegador no puede reproducir este video.</video>;
  if (kind === "image") return <object data={url} type={mimeType ?? "image/*"} aria-label={`Vista previa de ${title}`} className="mt-4 h-72 w-full rounded-lg bg-night object-contain"><a href={url} target="_blank" rel="noreferrer">Abrir imagen</a></object>;
  if (kind === "pdf") return <iframe src={url} title={`Vista previa de ${title}`} loading="lazy" className="mt-4 h-[28rem] w-full rounded-lg border border-line bg-white" />;
  return null;
}

function ActionLink({ href, label, icon, download = false }: { href: string; label: string; icon: ReactNode; download?: boolean }) {
  return <a href={href} target="_blank" rel="noreferrer" download={download || undefined} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-ice transition-colors hover:border-cyan/45 hover:text-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan">{icon}{label}</a>;
}

function kindLabel(kind: ReviewerAttachment["kind"]): string {
  const labels: Record<ReviewerAttachment["kind"], string> = { text: "Texto", image: "Imagen", audio: "Audio", video: "Video", file: "Archivo", link: "Enlace", evidence: "Evidencia" };
  return labels[kind];
}

function fieldLabel(fieldId: string | null): string {
  if (!fieldId) return "Evidencia";
  const labels: Record<string, string> = {
    schematic: "Esquema",
    demonstration: "Demostración",
    code: "Código",
    "final-reflection-video": "Reflexión final · ¿Por qué el Semillero de Robótica?",
    "research-diagram": "IR · Diagrama de investigación",
    "research-proposal": "IR · Documento de apoyo",
  };
  return labels[fieldId] ?? fieldId.replaceAll("-", " ");
}

function FileIcon() { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true"><path d="M5 2.8h6l4 4v10.4H5V2.8Z" strokeLinejoin="round"/><path d="M11 3v4h4"/></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true"><path d="M15.5 6.5A6 6 0 1 0 16 12" strokeLinecap="round"/><path d="M12.5 6.5h3v-3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ExternalIcon() { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5" aria-hidden="true"><path d="M8 5H4.5v10.5H15V12M10.5 4.5h5v5M9 11l6.2-6.2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5" aria-hidden="true"><path d="M10 3v9m0 0 3-3m-3 3L7 9M4 16h12" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
