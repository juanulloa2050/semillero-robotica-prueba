"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatEvidenceSize,
  getEvidenceBlob,
  removeEvidenceFile,
  storeEvidenceFile,
  type LocalEvidenceFile,
} from "@/lib/challenges/evidenceStore";

export interface LocalEvidenceUploaderProps {
  nodeId: string;
  fieldId: string;
  label: string;
  description: string;
  accept: string;
  value: LocalEvidenceFile[];
  onChange: (files: LocalEvidenceFile[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  required?: boolean;
}
const DEFAULT_MAX_SIZE = 40 * 1_048_576;

export function LocalEvidenceUploader({
  nodeId,
  fieldId,
  label,
  description,
  accept,
  value,
  onChange,
  multiple = false,
  maxFiles = multiple ? 6 : 1,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  disabled = false,
  required = false,
}: LocalEvidenceUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  const fileIdsKey = value.map((file) => file.id).join(",");

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const files = valueRef.current;

    void Promise.all(
      files.map(async (file) => {
        try {
          const blob = await getEvidenceBlob(file.id);
          if (!blob) return [file.id, ""] as const;
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return [file.id, ""] as const;
          }
          objectUrls.push(url);
          return [file.id, url] as const;
        } catch {
          return [file.id, ""] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setUrls(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [fileIdsKey]);

  const selectFiles = async (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    setError("");

    const selected = Array.from(fileList);
    const availableSlots = multiple ? Math.max(0, maxFiles - value.length) : 1;
    const candidates = selected.slice(0, availableSlots);
    if (selected.length > availableSlots) {
      setError(`Puedes guardar máximo ${maxFiles} archivo${maxFiles === 1 ? "" : "s"}.`);
    }

    const oversized = candidates.find((file) => file.size > maxSizeBytes);
    if (oversized) {
      setError(
        `${oversized.name} supera el máximo de ${formatEvidenceSize(maxSizeBytes)}.`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      const stored: LocalEvidenceFile[] = [];
      for (const file of candidates) {
        stored.push(await storeEvidenceFile(nodeId, fieldId, file));
      }

      if (!multiple && value[0]) {
        await removeEvidenceFile(value[0].id).catch(() => undefined);
      }
      onChange(multiple ? [...value, ...stored] : stored);
    } catch {
      setError(
        "No pudimos guardar el archivo en este navegador. Revisa el espacio disponible e inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (file: LocalEvidenceFile) => {
    if (disabled || busy) return;
    setError("");
    setBusy(true);
    try {
      await removeEvidenceFile(file.id);
      onChange(value.filter((item) => item.id !== file.id));
    } catch {
      setError("No fue posible eliminar el archivo local. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const atLimit = multiple ? value.length >= maxFiles : false;

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-line bg-night/30 p-4 sm:p-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink">
            {label}
            {required && <span className="ml-1 text-cyan" aria-hidden="true">*</span>}
          </h4>
          <p id={`${inputId}-description`} className="mt-1 max-w-2xl text-xs leading-5 text-muted">
            {description} Máximo {formatEvidenceSize(maxSizeBytes)} por archivo.
          </p>
        </div>
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-xl border px-4 text-xs font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan sm:w-auto ${
            disabled || busy || atLimit
              ? "cursor-not-allowed border-line bg-surface/40 text-muted/60"
              : "cursor-pointer border-cyan/35 bg-cyan/10 text-cyan hover:bg-cyan/15"
          }`}
        >
          {busy ? "Guardando…" : value.length > 0 && !multiple ? "Reemplazar" : "Agregar archivo"}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled || busy || atLimit}
            required={required && value.length === 0}
            aria-describedby={`${inputId}-description ${inputId}-status`}
            className="sr-only"
            onChange={(event) => void selectFiles(event.target.files)}
          />
        </label>
      </div>

      <div id={`${inputId}-status`} role="status" aria-live="polite" className="mt-3 min-h-5 text-xs">
        {busy ? (
          <span className="text-cyan">Guardando el archivo de forma privada en este dispositivo…</span>
        ) : error ? (
          <span className="text-danger">{error}</span>
        ) : value.length === 0 ? (
          <span className="text-muted">Aún no has agregado evidencia.</span>
        ) : (
          <span className="text-ok">
            {value.length} archivo{value.length === 1 ? "" : "s"} guardado{value.length === 1 ? "" : "s"} localmente.
          </span>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-3 min-w-0 space-y-2">
          {value.map((file) => {
            const url = urls[file.id];
            return (
              <li
                key={file.id}
                className="grid min-w-0 max-w-full gap-3 overflow-hidden rounded-xl border border-line bg-surface/45 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                  <FilePreview file={file} url={url} />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-xs font-semibold text-ice" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {getFileTypeLabel(file)} <span aria-hidden="true">·</span>{" "}
                      {formatEvidenceSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 border-t border-line/70 pt-2 sm:border-t-0 sm:pt-0">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir ${file.name} en una pestaña nueva`}
                      className="rounded-lg px-2.5 py-2 text-xs font-semibold text-cyan hover:bg-cyan/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                    >
                      Abrir
                    </a>
                  )}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => void remove(file)}
                      disabled={busy}
                      aria-label={`Quitar ${file.name}`}
                      className="rounded-lg px-2.5 py-2 text-xs font-semibold text-danger hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-4 text-muted/80">
        Prototipo sin backend: el archivo queda en el almacenamiento privado de este navegador y no sale de tu dispositivo.
      </p>
    </section>
  );
}

function FilePreview({ file, url }: { file: LocalEvidenceFile; url?: string }) {
  if (url && file.mimeType.startsWith("image/")) {
    // Blob URLs are created at runtime and cannot use Next's static image pipeline.
    return (
      <span
        aria-hidden="true"
        className="relative block h-12 w-12 min-w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-night"
        style={{
          width: 48,
          height: 48,
          maxWidth: 48,
          maxHeight: 48,
          contain: "strict",
          isolation: "isolate",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 block h-full w-full object-cover"
          style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 min-w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-cyan/10 text-cyan"
      style={{ width: 48, height: 48, maxWidth: 48, maxHeight: 48 }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M6 3h8l4 4v14H6V3Z" strokeLinejoin="round" />
        <path d="M14 3v5h4M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function getFileTypeLabel(file: LocalEvidenceFile) {
  if (file.mimeType.startsWith("image/")) return "Imagen";
  if (file.mimeType.startsWith("video/")) return "Video";
  if (file.mimeType === "application/pdf") return "PDF";

  const extension = file.name.split(".").pop()?.trim().toUpperCase();
  return extension && extension !== file.name.toUpperCase() ? extension : "Archivo";
}
