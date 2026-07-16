// Import Service — uploads an Excel register to the backend's SSE
// import endpoint and streams the per-batch progress events back to
// the caller.
//
// The backend exposes a single endpoint that handles Purchase or Sale
// registers:
//
//   POST /api/migration/import
//     multipart/form-data: file=@<xlsx> + type=PURCHASE|SALE
//
// The response is `text/event-stream`. Each `data:` line carries a
// progress JSON object, and the stream terminates with an
// `event: completed` block. We wrap that in a small callback-driven
// helper so the UI can show a live progress strip.
//
// Note: there is no transaction-import endpoint on the backend today.
// The Import button on the transactions page mirrors the same flow
// for symmetry; the UI shows a hint explaining that the export types
// are limited to Purchase / Sale registers.

export type ImportRegisterType = "PURCHASE" | "SALE";

export interface ImportProgress {
  /** Stage the worker is in (e.g. "READING_FILE", "IMPORTING_AGENCIES"). */
  stage?: string;
  /** Free-form message surfaced to the user. */
  message?: string;
  /** Current row being processed, if the backend reports it. */
  current?: number;
  /** Total rows being processed, if the backend reports it. */
  total?: number;
  /** Percent complete 0-100 (computed from current/total when missing). */
  progress?: number;
  /** Backend-level success flag if the completed event carries one. */
  success?: boolean;
  /** Arbitrary extra fields from the backend payload. */
  [key: string]: unknown;
}

interface StreamCallbacks {
  onProgress?: (p: ImportProgress) => void;
  onComplete?: (final: ImportProgress) => void;
  onError?: (err: Error) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";

/**
 * Upload an Excel register to the backend and stream progress. The
 * caller supplies `onProgress` for live updates and `onComplete` /
 * `onError` for the terminal state. Resolves once the stream ends.
 */
export async function importRegister(
  file: File,
  type: ImportRegisterType,
  callbacks: StreamCallbacks = {}
): Promise<void> {
  const url = `${API_BASE_URL}/api/migration/import`;
  const form = new FormData();
  form.append("file", file);
  form.append("type", type);

  // `fetch` doesn't bubble SSE-progress the same way EventSource does,
  // but for an upload we need POST + multipart, so we read the body
  // ourselves with `getReader` and parse the `data:` lines manually.
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      credentials: "include",
    });
  } catch (err: any) {
    const error = new Error(err?.message || "Network error during import");
    callbacks.onError?.(error);
    throw error;
  }

  if (!response.ok || !response.body) {
    let message = `Import failed (HTTP ${response.status})`;
    try {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        message = json?.message || message;
      } catch {
        if (text) message = text;
      }
    } catch {
      /* keep default */
    }
    const error = new Error(message);
    callbacks.onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by a blank line. Pull one at a time.
      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleSseChunk(rawEvent, callbacks);
        separator = buffer.indexOf("\n\n");
      }
    }

    // Flush trailing lines without a trailing blank line.
    if (buffer.trim().length > 0) {
      handleSseChunk(buffer, callbacks);
    }
  } catch (err: any) {
    const error = new Error(err?.message || "Stream error during import");
    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Parse a single SSE event block. The backend uses:
 *   data: { "stage": "..." }
 *   data: { "...": ... }
 *     (blank line)
 *   event: completed
 *   data: { "success": true, "data": ... }
 */
function handleSseChunk(chunk: string, callbacks: StreamCallbacks): void {
  const lines = chunk.split(/\r?\n/);
  let dataLine: string | null = null;
  let isCompleted = false;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("event: completed")) {
      isCompleted = true;
    } else if (line.startsWith("data:")) {
      // SSE allows multiple `data:` lines per event; concatenate them.
      dataLine = (dataLine ?? "") + line.slice(5).trimStart();
    }
  }

  if (dataLine === null) return;

  let payload: ImportProgress;
  try {
    payload = JSON.parse(dataLine);
  } catch {
    // Treat unparseable lines as a plain-text progress message.
    payload = { message: dataLine };
  }

  if (isCompleted) {
    payload.success = payload.success ?? true;
    callbacks.onComplete?.(payload);
  } else {
    callbacks.onProgress?.(payload);
  }
}

export const importApi = {
  importPurchase: (file: File, cb: StreamCallbacks) =>
    importRegister(file, "PURCHASE", cb),
  importSale: (file: File, cb: StreamCallbacks) =>
    importRegister(file, "SALE", cb),
};
