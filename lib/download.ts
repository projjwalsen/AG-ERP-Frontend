// Shared helper for triggering a file download from a Blob in the browser.
// Mirrors the download pattern used in `purchase-sales/page.tsx` for invoice PDFs,
// but generalised for any binary response (xlsx, csv, pdf, ...).

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100";

/**
 * Fetch an endpoint as a binary blob. The request is authenticated with the
 * same HTTP-only cookie as `apiFetch`, so callers don't need to do anything
 * extra to inherit the session.
 *
 * @param endpoint - relative endpoint, with or without leading slash
 *                   (e.g. "api/agencies/all?export=true")
 * @param defaultName - fallback filename when the server doesn't send a
 *                      Content-Disposition header
 */
export async function fetchBlob(
  endpoint: string,
  defaultName: string
): Promise<{ blob: Blob; filename: string }> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL}/${cleanEndpoint}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response
      .blob()
      .catch(() => null)
      .then(async (blob) => {
        if (!blob) return { message: `HTTP error! status: ${response.status}` };
        try {
          const text = await blob.text();
          try {
            const json = JSON.parse(text);
            return { message: json.message || `HTTP error! status: ${response.status}` };
          } catch {
            return { message: text || `HTTP error! status: ${response.status}` };
          }
        } catch {
          return { message: `HTTP error! status: ${response.status}` };
        }
      });

    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();

  // Best-effort filename extraction from Content-Disposition.
  // Examples the backend can send:
  //   attachment; filename="agencies.xlsx"
  //   attachment; filename=ledger_BRANCH.xlsx
  //   attachment; filename*=UTF-8''transactions_1718800000000.xlsx
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : defaultName;

  return { blob, filename };
}

/**
 * Trigger a browser download for a Blob. Uses an object URL so the file is
 * saved with the filename we want regardless of server-suggested names.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/**
 * Convenience: fetch + download in one call. The export endpoint
 * (e.g. `/api/agencies/all?export=true`) streams back an .xlsx file
 * the backend builds with `ExcelService.export`; this helper turns that
 * stream into a saved file on the user's machine.
 */
export async function downloadFile(
  endpoint: string,
  defaultName: string
): Promise<void> {
  const { blob, filename } = await fetchBlob(endpoint, defaultName);
  downloadBlob(blob, filename);
}