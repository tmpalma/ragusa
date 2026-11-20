import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { FilePicker } from "@capawesome/capacitor-file-picker";

export const isNative = Capacitor.isNativePlatform();

export interface SaveBytesParams {
  bytes: string | Uint8Array | ArrayBuffer;
  filename: string;
  mimeType: string;
}

export interface ShareFileParams extends SaveBytesParams {
  title?: string;
}

export interface PickFileParams {
  accept?: Record<string, string[]>;
  multiple?: boolean;
}

export interface PickedFile {
  name: string;
  text?: string;
  bytes?: Uint8Array;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isPickerCancelled(error: unknown): boolean {
  return error instanceof Error && error.message.includes("pickFiles canceled");
}

function toUint8Array(bytes: Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer> {
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return new Uint8Array(bytes);
}

function sanitizeFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").trim();
  return base.length > 0 ? base : "export";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildPickerTypes(mimeType: string, filename: string): FilePickerAcceptType[] {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot) : "";
  return [{ description: mimeType, accept: { [mimeType]: ext ? [ext] : [] } }];
}

function buildAcceptAttribute(accept: Record<string, string[]>): string {
  return Object.entries(accept)
    .flatMap(([mime, extensions]) => [mime, ...extensions])
    .join(",");
}

function buildNativePickerTypes(accept?: Record<string, string[]>): string[] | undefined {
  if (!accept) return undefined;
  const types = Object.keys(accept);
  if (types.includes("application/json") && !types.includes("application/octet-stream")) {
    types.push("application/octet-stream");
  }
  return types;
}

function downloadBlob(bytes: string | Uint8Array | ArrayBuffer, filename: string, mimeType: string): void {
  const blob =
    typeof bytes === "string"
      ? new Blob([bytes], { type: mimeType })
      : new Blob([toUint8Array(bytes)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readPickedFile(file: File): Promise<PickedFile> {
  const text = await file.text();
  return { name: file.name, text };
}

async function readNativePickedFile(file: {
  name: string;
  blob?: Blob;
  webPath?: string;
}): Promise<PickedFile> {
  if (file.blob) {
    const text = await file.blob.text();
    return { name: file.name, text };
  }
  if (file.webPath) {
    const response = await fetch(file.webPath);
    const text = await response.text();
    return { name: file.name, text };
  }
  return { name: file.name };
}

function pickFilesViaInput(accept?: Record<string, string[]>, multiple = false): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.hidden = true;
    input.multiple = multiple;
    if (accept) {
      input.accept = buildAcceptAttribute(accept);
    }

    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener("focus", onWindowFocus);
      void (async () => {
        const results: PickedFile[] = [];
        for (const file of files) {
          results.push(await readPickedFile(file));
        }
        resolve(results);
      })();
    };

    input.addEventListener("change", () => {
      finish(Array.from(input.files ?? []));
    });

    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && input.isConnected && !input.files?.length) {
          settled = true;
          input.remove();
          window.removeEventListener("focus", onWindowFocus);
          resolve([]);
        }
      }, 500);
    };
    window.addEventListener("focus", onWindowFocus);

    document.body.appendChild(input);
    input.click();
  });
}

async function writeCacheFile(
  bytes: string | Uint8Array | ArrayBuffer,
  filename: string,
): Promise<string> {
  const path = sanitizeFilename(filename);
  if (typeof bytes === "string") {
    const result = await Filesystem.writeFile({
      path,
      data: bytes,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    return result.uri;
  }

  const result = await Filesystem.writeFile({
    path,
    data: bytesToBase64(toUint8Array(bytes)),
    directory: Directory.Cache,
  });
  return result.uri;
}

async function shareViaNative({ bytes, filename, title }: ShareFileParams): Promise<void> {
  const uri = await writeCacheFile(bytes, filename);
  await Share.share({
    title: title ?? sanitizeFilename(filename),
    files: [uri],
  });
}

async function saveBytesWeb({ bytes, filename, mimeType }: SaveBytesParams): Promise<void> {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: buildPickerTypes(mimeType, filename),
      });
      const writable = await handle.createWritable();
      if (typeof bytes === "string") {
        await writable.write(bytes);
      } else {
        await writable.write(toUint8Array(bytes));
      }
      await writable.close();
      return;
    } catch (error) {
      if (isAbortError(error)) return;
      console.warn("Save file picker failed, falling back to download", error);
    }
  }

  downloadBlob(bytes, filename, mimeType);
}

async function pickFileWeb({ accept, multiple = false }: PickFileParams): Promise<PickedFile[]> {
  if (typeof window.showOpenFilePicker === "function") {
    try {
      const types = accept ? [{ accept }] : undefined;
      const handles = await window.showOpenFilePicker({ multiple, types });
      const results: PickedFile[] = [];
      for (const handle of handles) {
        results.push(await readPickedFile(await handle.getFile()));
      }
      return results;
    } catch (error) {
      if (isAbortError(error)) return [];
      throw error;
    }
  }

  return pickFilesViaInput(accept, multiple);
}

async function pickFileNative({ accept, multiple = false }: PickFileParams): Promise<PickedFile[]> {
  try {
    const result = await FilePicker.pickFiles({
      types: buildNativePickerTypes(accept),
      limit: multiple ? 0 : 1,
      readData: false,
    });
    const picked: PickedFile[] = [];
    for (const file of result.files) {
      picked.push(await readNativePickedFile(file));
    }
    return picked;
  } catch (error) {
    if (isPickerCancelled(error)) return [];
    throw error;
  }
}

export async function saveBytes(params: SaveBytesParams): Promise<void> {
  if (isNative) {
    await shareViaNative(params);
    return;
  }
  await saveBytesWeb(params);
}

export async function shareFile(params: ShareFileParams): Promise<void> {
  if (isNative) {
    await shareViaNative(params);
    return;
  }
  await saveBytesWeb(params);
}

export async function pickFile(params: PickFileParams): Promise<PickedFile[]> {
  if (isNative) {
    return pickFileNative(params);
  }
  return pickFileWeb(params);
}
