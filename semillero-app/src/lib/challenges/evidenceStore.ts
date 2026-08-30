import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface LocalEvidenceFile {
  id: string;
  nodeId: string;
  fieldId: string;
  name: string;
  mimeType: string;
  size: number;
  lastModified: number;
  storedAt: number;
  storagePath?: string;
}

interface StoredEvidenceRecord extends LocalEvidenceFile {
  blob: Blob;
}

const DATABASE_NAME = "semillero-electronics-evidence";
const DATABASE_VERSION = 1;
const STORE_NAME = "files";

function requireIndexedDb(): IDBFactory {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("El almacenamiento local de archivos no está disponible.");
  }
  return window.indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(STORE_NAME)) return;
      const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("nodeId", "nodeId", { unique: false });
      store.createIndex("nodeField", ["nodeId", "fieldId"], { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("No fue posible abrir los archivos locales."));
    request.onblocked = () =>
      reject(new Error("Cierra otras pestañas de la prueba e inténtalo de nuevo."));
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("No fue posible guardar el archivo."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("El guardado local fue interrumpido."));
    });
  } finally {
    database.close();
  }
}

export async function storeEvidenceFile(
  nodeId: string,
  fieldId: string,
  file: File
): Promise<LocalEvidenceFile> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) {
      const { data: run, error: runError } = await supabase
        .from("assessment_runs")
        .select("id")
        .eq("candidate_id", user.id)
        .single();
      if (runError) throw runError;
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${run.id}/${nodeId}/${id}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const metadata: LocalEvidenceFile = {
        id, nodeId, fieldId, name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size, lastModified: file.lastModified,
        storedAt: Date.now(), storagePath,
      };
      const { error: metadataError } = await supabase.from("evidence_files").insert({
        id, run_id: run.id, node_id: nodeId, field_id: fieldId,
        storage_path: storagePath, original_name: file.name,
        mime_type: metadata.mimeType, size_bytes: file.size,
      });
      if (metadataError) {
        await supabase.storage.from("evidence").remove([storagePath]);
        throw metadataError;
      }
      return metadata;
    }
  }

  const metadata: LocalEvidenceFile = {
    id: crypto.randomUUID(),
    nodeId,
    fieldId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified,
    storedAt: Date.now(),
  };

  const record: StoredEvidenceRecord = { ...metadata, blob: file };
  await runTransaction<IDBValidKey>("readwrite", (store) => store.put(record));
  return metadata;
}

export async function getEvidenceBlob(id: string): Promise<Blob | null> {
  try {
    const result = await runTransaction<StoredEvidenceRecord | undefined>(
      "readonly",
      (store) => store.get(id)
    );
    if (result?.blob instanceof Blob) return result.blob;
  } catch {
    // IndexedDB may be unavailable; remote storage remains usable.
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data: metadata } = await supabase
    .from("evidence_files")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!metadata?.storage_path) return null;
  const { data } = await supabase.storage.from("evidence").download(metadata.storage_path);
  return data ?? null;
}

export async function removeEvidenceFile(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.from("evidence_files").select("storage_path").eq("id", id).maybeSingle();
    if (data?.storage_path) {
      const { error } = await supabase.from("evidence_files").delete().eq("id", id);
      if (error) throw error;
      await supabase.storage.from("evidence").remove([data.storage_path]);
      return;
    }
  }
  await runTransaction<undefined>("readwrite", (store) => store.delete(id));
}

export async function removeNodeEvidence(nodeId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("nodeId");
      const cursorRequest = index.openKeyCursor(IDBKeyRange.only(nodeId));

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
      cursorRequest.onerror = () => transaction.abort();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("No fue posible limpiar los archivos."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("La limpieza fue interrumpida."));
    });
  } finally {
    database.close();
  }
}

export async function clearAllEvidenceFiles(): Promise<void> {
  await runTransaction<undefined>("readwrite", (store) => store.clear());
}

export function formatEvidenceSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1_048_576) return `${Math.max(1, Math.round(bytes / 1_024))} KB`;
  return `${(bytes / 1_048_576).toFixed(bytes < 10_485_760 ? 1 : 0)} MB`;
}
