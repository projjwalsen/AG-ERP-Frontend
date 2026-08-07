"use client";

import * as React from "react";
import { FileSpreadsheet, Loader2, Upload, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  importJournalMaster,
  JournalImportProgress,
} from "@/app/services/import.service";
import { useToast } from "@/components/ui/toast";

interface JournalImportButtonProps {
  /**
   * Fired once the stream closes successfully. The parent page can use
   * this to refetch its list (the import may have inserted new rows).
   */
  onCompleted?: () => void;
  /**
   * Variant: outline (default) or solid.
   */
  variant?: "outline" | "default";
  /**
   * Optional fixed label; defaults to "Import Journal Register".
   */
  label?: string;
}

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/**
 * Import button for `/api/migration/import/journal`. The importer is
 * always called with `type=BOTH` so it accepts every voucher row in
 * the file regardless of whether the caller is the journal page or
 * the transactions page. Streams SSE progress and shows the same
 * kind of progress bar the product/agency importers use.
 */
export function JournalImportButton({
  onCompleted,
  variant = "outline",
  label = "Import Journal Register",
}: JournalImportButtonProps) {
  const { addToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] =
    React.useState<JournalImportProgress | null>(null);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setProgress(null);
  };

  const reset = () => {
    setFile(null);
    setProgress(null);
  };

  const closeModal = () => {
    if (running) return;
    setOpen(false);
    reset();
  };

  const handleStart = async () => {
    if (!file) {
      addToast("Please select an Excel file to import", "error");
      return;
    }
    setRunning(true);
    setProgress({ total: 0, processed: 0, success: 0, failed: 0, percentage: 0, errors: [] });
    try {
      await importJournalMaster(file, {
        onProgress: (p) => setProgress(p),
        onComplete: (r) => {
          setProgress(r);
          addToast(
            r.failed > 0
              ? `Imported ${r.success}/${r.total} (${r.failed} failed)`
              : `Imported ${r.success} rows successfully`,
            r.failed > 0 ? "error" : "success"
          );
          onCompleted?.();
          setTimeout(() => {
            setRunning(false);
            setOpen(false);
            reset();
          }, 1200);
        },
        onError: (err) => {
          setRunning(false);
          addToast(err.message || "Import failed", "error");
        },
      });
    } catch (err: any) {
      setRunning(false);
      addToast(err?.message || "Import failed", "error");
    }
  };

  const percent =
    progress?.percentage ??
    (progress?.total
      ? Math.round(((progress.processed || 0) / Math.max(progress.total, 1)) * 100)
      : null);

  const total = progress?.total ?? 0;
  const processed = progress?.processed ?? 0;
  const successCount = progress?.success ?? 0;
  const failedCount = progress?.failed ?? 0;

  return (
    <>
      <Button
        variant={variant}
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent
          className="max-w-lg"
          showCloseButton={!running}
          onInteractOutside={(e) => {
            if (running) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Import Journal Register
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload an Excel workbook (.xlsx / .xls) of the journal
              register. The importer accepts both Journal and Transaction
              voucher rows in a single upload.
            </p>

            <div className="space-y-2">
              <Label htmlFor="journal-import-file">Excel File *</Label>
              <div className="flex items-center gap-2">
                <label
                  className={
                    "flex-1 flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-sm cursor-pointer transition " +
                    (running
                      ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40")
                  }
                >
                  <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                  <span className="truncate text-gray-700">
                    {file ? file.name : "Choose an .xlsx or .xls file"}
                  </span>
                  <input
                    id="journal-import-file"
                    type="file"
                    accept={ACCEPTED_EXTENSIONS.join(",")}
                    className="hidden"
                    onChange={handleSelectFile}
                    disabled={running}
                  />
                </label>
                {file && !running && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>

            {(running || progress) && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    Importing rows…
                  </span>
                  <span className="tabular-nums text-gray-500">
                    {processed}/{total || "?"} ({percent ?? 0}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(percent ?? (running ? 8 : 100),
                        0
                      ),
                      100
                      )}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-emerald-50 px-2 py-1.5">
                    <p className="text-emerald-700 font-semibold">{successCount}</p>
                    <p className="text-[11px] text-emerald-600">Imported</p>
                  </div>
                  <div className="rounded-md bg-rose-50 px-2 py-1.5">
                    <p className="text-rose-700 font-semibold">{failedCount}</p>
                    <p className="text-[11px] text-rose-600">Failed</p>
                  </div>
                  <div className="rounded-md bg-gray-100 px-2 py-1.5">
                    <p className="text-gray-700 font-semibold">{total}</p>
                    <p className="text-[11px] text-gray-500">Total</p>
                  </div>
                </div>

                {progress?.errors && progress.errors.length > 0 && !running && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-rose-100 bg-rose-50/50">
                    <ul className="divide-y divide-rose-100">
                      {progress.errors.slice(0, 10).map((e, i) => (
                        <li key={i} className="px-3 py-2 text-xs text-rose-700">
                          <span className="font-mono">
                            {e.voucherNo ? `Voucher ${e.voucherNo}` : "Row"}
                          </span>
                          <span className="block text-rose-600 mt-0.5">
                            {e.message}
                          </span>
                        </li>
                      ))}
                      {progress.errors.length > 10 && (
                        <li className="px-3 py-2 text-xs text-rose-700 italic">
                          +{progress.errors.length - 10} more row(s) failed
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {running && (
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading and processing — please don&apos;t close this
                    dialog.
                  </p>
                )}

                {!running && progress && progress.total > 0 && (
                  <p className="text-[11px] text-gray-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Done — {successCount} imported, {failedCount} failed.
                  </p>
                )}

                {!running && progress && progress.total === 0 && (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    No rows matched the workbook.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={running}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStart}
              disabled={!file || running}
              loading={running && !progress?.total}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}