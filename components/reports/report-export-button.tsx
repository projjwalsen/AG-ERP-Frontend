"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { downloadFile } from "@/lib/download";

interface ReportExportButtonProps {
  /**
   * Async export handler. Should call the matching `reportApi.exportXxx`
   * method and return `{ blob, filename }`. The component wraps it with
   * the loading state and toasts.
   */
  onExport: () => Promise<{ blob: Blob; filename: string }>;
  /** Optional label override. Default "Export Excel". */
  label?: string;
  /** Disable the button (e.g. while the report is still loading). */
  disabled?: boolean;
}

/**
 * Standard "Export Excel" button used in the report header actions slot.
 * Streams the file via `downloadFile` (which fetches the blob and
 * triggers a browser download).
 */
export function ReportExportButton({
  onExport,
  label = "Export Excel",
  disabled = false,
}: ReportExportButtonProps) {
  const { addToast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const { blob, filename } = await onExport();
      // downloadFile expects (endpoint, defaultName). For an in-memory
      // blob we have to short-circuit through a tiny object URL — use
      // the helper from lib/download.
      const { downloadBlob } = await import("@/lib/download");
      downloadBlob(blob, filename);
      addToast(`${label} downloaded`, "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export report", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || busy}
      loading={busy}
      className="gap-1.5"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}

// Re-export `downloadFile` so report pages can use it if they prefer the
// endpoint-based form (mirrors how transactions/agencies do it).
export { downloadFile };
