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
  /** Current rows processed so far. */
  processed?: number;
  /** Current row being processed, if the backend reports a finer-grained index. */
  current?: number;
  /** Total rows being processed, if the backend reports it. */
  total?: number;
  /** Number of successful rows so far. */
  success?: number;
  /** Number of failed rows so far. */
  failed?: number;
  /** Percent complete 0-100 (computed from processed/total when missing). */
  percentage?: number;
  /** Backend-level success flag if the completed event carries one. */
  successFlag?: boolean;
  /** Optional URL to download an import error report. */
  errorReportUrl?: string;
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

  const callbacksWithAutoDownload: StreamCallbacks = {
    ...callbacks,
    onComplete: (final) => {
      callbacks.onComplete?.(final);
      downloadErrorReportIfNeeded(final.errorReportUrl as string | undefined);
    },
  };

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
        handleSseChunk(rawEvent, callbacksWithAutoDownload);
        separator = buffer.indexOf("\n\n");
      }
    }

    // Flush trailing lines without a trailing blank line.
    if (buffer.trim().length > 0) {
      handleSseChunk(buffer, callbacksWithAutoDownload);
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
    const result = (payload as any)?.data ?? payload;
    const normalized: ImportProgress = {
      ...result,
      success: result.success ?? true,
      processed: result.processed ?? result.current ?? undefined,
      current: result.current ?? undefined,
      total: result.total ?? undefined,
      failed: result.failed ?? undefined,
      percentage:
        result.percentage ??
        (typeof result.processed === "number" && typeof result.total === "number"
          ? Number(((result.processed / result.total) * 100).toFixed(2))
          : undefined),
      errorReportUrl:
        typeof result.errorReportUrl === "string"
          ? result.errorReportUrl
          : undefined,
      message: result.message ?? payload.message,
    };

    callbacks.onComplete?.(normalized);
  } else {
    callbacks.onProgress?.(payload);
  }
}

async function downloadErrorReportIfNeeded(
  errorReportUrl?: string
): Promise<void> {
  if (!errorReportUrl) return;

  try {
    const url = errorReportUrl.startsWith("http")
      ? errorReportUrl
      : `${API_BASE_URL}${errorReportUrl}`;
    const response = await fetch(url, {
      credentials: "include",
    });
    if (!response.ok) {
      return;
    }
    const blob = await response.blob();
    const filename = response.headers
      .get("content-disposition")
      ?.match(/filename="?(.*?)"?(;|$)/i)?.[1]
      ?.trim();

    const urlObject = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = urlObject;
    anchor.download = filename || "import-error-report.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(urlObject);
  } catch {
    // Ignore download failures silently; the import result is already
    // visible to the user.
  }
}

export const importApi = {
  importPurchase: (file: File, cb: StreamCallbacks) =>
    importRegister(file, "PURCHASE", cb),
  importSale: (file: File, cb: StreamCallbacks) =>
    importRegister(file, "SALE", cb),
};

// ---------------------------------------------------------------------------
// Product Master import — POST /api/migration/product
//
// Different endpoint and a strictly-typed progress payload, so this lives
// in its own helper. The backend's contract (see
// `AG-ERP-Backend/src/modules/import/import.controller.ts::importProductWorkbook`):
//
//   POST /api/migration/product
//     multipart/form-data: file=@<xlsx>
//
//   Response: text/event-stream
//     data: { total, processed, success, failed, percentage, errors[] }
//       (streamed once per progress tick)
//     event: completed
//     data: { success: true, message: "...", data: { total, processed,
//            success, failed, errors[] } }
// ---------------------------------------------------------------------------

export interface ProductImportProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  percentage: number;
  errors: Array<{
    row?: number;
    name?: string;
    sku?: string;
    message: string;
  }>;
}

export interface ProductImportResult {
  total: number;
  processed: number;
  success: number;
  failed: number;
  percentage?: number;
  errors: ProductImportProgress["errors"];
  errorReportUrl?: string;
}

export interface ProductImportCallbacks {
  onProgress?: (p: ProductImportProgress) => void;
  onComplete?: (r: ProductImportResult) => void;
  onError?: (err: Error) => void;
  /** Optional AbortSignal — caller can cancel mid-stream. */
  signal?: AbortSignal;
}

/**
 * Upload the product-master Excel file to /api/migration/product and
 * stream progress. Same SSE parsing pattern as `importRegister`, but
 * the payload shape is fixed and strongly typed.
 */
export async function importProductMaster(
  file: File,
  callbacks: ProductImportCallbacks = {}
): Promise<void> {
  const url = `${API_BASE_URL}/api/migration/product`;
  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      credentials: "include",
      signal: callbacks.signal,
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

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleProductSseChunk(rawEvent, callbacks);
        separator = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim().length > 0) {
      handleProductSseChunk(buffer, callbacks);
    }
  } catch (err: any) {
    const error = new Error(err?.message || "Stream error during import");
    callbacks.onError?.(error);
    throw error;
  }
}

function handleProductSseChunk(
  chunk: string,
  callbacks: ProductImportCallbacks
): void {
  handleStandardImportSseChunk(
    chunk,
    (p) => callbacks.onProgress?.(p),
    (r) => callbacks.onComplete?.(r),
    callbacks.onError
  );
}

// Shared chunk parser for endpoints that follow the standard
// { total, processed, success, failed, percentage, errors[] }
// SSE contract (Product and Agency imports).
function handleStandardImportSseChunk(
  chunk: string,
  onProgress: (p: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    percentage: number;
    errors: any[];
  }) => void,
  onComplete: (r: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    /** Optional — some callers (e.g. journal) want percentage on the
     * terminal result too. Defaulted to 100 by the wrapper. */
    percentage?: number;
    errors: any[];
  }) => void,
  onError?: (err: Error) => void
): void {
  const lines = chunk.split(/\r?\n/);
  let dataLine: string | null = null;
  let isCompleted = false;

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("event: completed")) {
      isCompleted = true;
    } else if (line.startsWith("data:")) {
      dataLine = (dataLine ?? "") + line.slice(5).trimStart();
    }
  }

  if (dataLine === null) return;

  let payload: any;
  try {
    payload = JSON.parse(dataLine);
  } catch {
    return;
  }

  if (isCompleted) {
    const result = payload?.data ?? payload;
    onComplete({
      total: Number(result?.total ?? 0),
      processed: Number(result?.processed ?? 0),
      success: Number(result?.success ?? 0),
      failed: Number(result?.failed ?? 0),
      percentage: Number(result?.percentage ?? 100),
      errors: Array.isArray(result?.errors) ? result.errors : [],
      errorReportUrl: typeof result?.errorReportUrl === "string" ? result.errorReportUrl : undefined,
    });
  } else {
    onProgress({
      total: Number(payload?.total ?? 0),
      processed: Number(payload?.processed ?? 0),
      success: Number(payload?.success ?? 0),
      failed: Number(payload?.failed ?? 0),
      percentage: Number(payload?.percentage ?? 0),
      errors: Array.isArray(payload?.errors) ? payload.errors : [],
    });
  }
}

// ---------------------------------------------------------------------------
// Agency Master import — POST /api/migration/agency
//
// Same SSE contract as the product importer:
//   POST /api/migration/agency
//     multipart/form-data: file=@<xlsx>
//
//   Response: text/event-stream
//     data: { total, processed, success, failed, percentage,
//             errors: [{ agency, error }] }
//     event: completed
//       data: { success: true, message: "...", data: <summary> }
// ---------------------------------------------------------------------------

export interface AgencyImportProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  percentage: number;
  errors: Array<{
    agency?: string;
    error?: string;
  }>;
}

export interface AgencyImportResult {
  total: number;
  processed: number;
  success: number;
  failed: number;
  errors: AgencyImportProgress["errors"];
}

export interface AgencyImportCallbacks {
  onProgress?: (p: AgencyImportProgress) => void;
  onComplete?: (r: AgencyImportResult) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function importAgencyMaster(
  file: File,
  callbacks: AgencyImportCallbacks = {}
): Promise<void> {
  const url = `${API_BASE_URL}/api/migration/agency`;
  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      credentials: "include",
      signal: callbacks.signal,
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

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleStandardImportSseChunk(
          rawEvent,
          (p) => callbacks.onProgress?.(p),
          (r) => callbacks.onComplete?.(r),
          callbacks.onError
        );
        separator = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim().length > 0) {
      handleStandardImportSseChunk(
        buffer,
        (p) => callbacks.onProgress?.(p),
        (r) => callbacks.onComplete?.(r),
        callbacks.onError
      );
    }
  } catch (err: any) {
    const error = new Error(err?.message || "Stream error during import");
    callbacks.onError?.(error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Journal Register import — POST /api/migration/import/journal
//
// The single endpoint handles both kinds of voucher rows. The user picks
// JOURNAL (default — skips Purchase / Tax Invoice vouchers) or TRANSACTION
// (only Purchase / Tax Invoice vouchers). The backend reads `type` from
// the query string, not the body, so we append it as `?...type=`.
//
//   POST /api/migration/import/journal?type=JOURNAL|TRANSACTION|BOTH
//     multipart/form-data: file=@<xlsx>
//
//   Response: text/event-stream
//     data: { total, processed, success, failed, percentage, errors[] }
//     event: completed
//       data: { success: true, message: "...", data: <summary> }
// ---------------------------------------------------------------------------

export type JournalImportType = "JOURNAL" | "TRANSACTION" | "BOTH";

export interface JournalImportProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  /** Optional — intermediate SSE chunks always carry it, but the
   * final event may omit it. */
  percentage?: number;
  errors: Array<{
    voucherNo?: string;
    message: string;
    [key: string]: unknown;
  }>;
}

export interface JournalImportResult {
  total: number;
  processed: number;
  success: number;
  failed: number;
  /** Optional — included when the backend reports it on the completed
   * event. The shared SSE parser defaults this to 100. */
  percentage?: number;
  errors: JournalImportProgress["errors"];
  errorReportUrl?: string;
}

export interface JournalImportCallbacks {
  onProgress?: (p: JournalImportProgress) => void;
  onComplete?: (r: JournalImportResult) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

/**
 * Import every voucher row from the file (both Journal and Transaction
 * vouchers). The backend's `type=BOTH` switch accepts all rows, so the
 * caller doesn't need to know which kind each row is. Use this from
 * anywhere — the journal page, the transactions page, or any other
 * place that needs to bulk-import a Tally register.
 */
export async function importJournalMaster(
  file: File,
  callbacks: JournalImportCallbacks = {}
): Promise<void> {
  // Always send `BOTH` — the importer accepts every voucher row from
  // the workbook regardless of whether the calling page is the journal
  // page or the transactions page.
  const url =
    `${API_BASE_URL}/api/migration/import/journal?type=${encodeURIComponent("BOTH")}`;
  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      credentials: "include",
      signal: callbacks.signal,
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

  const callbacksWithAutoDownload: JournalImportCallbacks = {
    ...callbacks,
    onComplete: (final) => {
      callbacks.onComplete?.(final);
      downloadErrorReportIfNeeded(final.errorReportUrl);
    },
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleStandardImportSseChunk(
          rawEvent,
          (p) => callbacksWithAutoDownload.onProgress?.(p),
          (r) => callbacksWithAutoDownload.onComplete?.(r),
          callbacksWithAutoDownload.onError
        );
        separator = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim().length > 0) {
      handleStandardImportSseChunk(
        buffer,
        (p) => callbacksWithAutoDownload.onProgress?.(p),
        (r) => callbacksWithAutoDownload.onComplete?.(r),
        callbacksWithAutoDownload.onError
      );
    }
  } catch (err: any) {
    const error = new Error(err?.message || "Stream error during import");
    callbacks.onError?.(error);
    throw error;
  }
}
