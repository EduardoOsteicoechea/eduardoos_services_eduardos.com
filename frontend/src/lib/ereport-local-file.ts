/** Local .ereport bind via File System Access (Chrome/Edge, HTTPS or localhost). */

let fileHandle: FileSystemFileHandle | null = null;
let fileName = "";

const EREPORT_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "eReport",
    accept: { "application/json": [".ereport"], "application/x-ereport": [".ereport"] },
  },
];

export function isEreportFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showOpenFilePicker" in window &&
    "showSaveFilePicker" in window
  );
}

export function hasLocalEreportFile(): boolean {
  return fileHandle !== null;
}

export function getLocalEreportFileName(): string {
  return fileName;
}

export function clearLocalEreportFile(): void {
  fileHandle = null;
  fileName = "";
}

async function readHandle(handle: FileSystemFileHandle): Promise<Record<string, unknown>> {
  const file = await handle.getFile();
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El .ereport no es JSON válido.");
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { sections?: unknown }).sections)) {
    throw new Error("El .ereport no tiene sections[].");
  }
  return parsed as Record<string, unknown>;
}

async function writeHandle(handle: FileSystemFileHandle, data: Record<string, unknown>): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

export async function openLocalEreportFile(): Promise<Record<string, unknown>> {
  if (!isEreportFileSystemAccessSupported()) {
    throw new Error("Abrir desde el dispositivo requiere Chrome o Edge con HTTPS (o localhost).");
  }
  const [handle] = await window.showOpenFilePicker({
    types: EREPORT_PICKER_TYPES,
    excludeAcceptAllOption: true,
    multiple: false,
  });
  const data = await readHandle(handle);
  fileHandle = handle;
  fileName = handle.name;
  return data;
}

export async function saveLocalEreportFile(data: Record<string, unknown>): Promise<void> {
  if (!fileHandle) {
    throw new Error("No hay archivo .ereport local vinculado.");
  }
  await writeHandle(fileHandle, data);
}
