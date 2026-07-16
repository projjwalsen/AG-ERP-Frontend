"use client";

import * as React from "react";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
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
  ImportRegisterType,
  importRegister,
  ImportProgress,
} from "@/app/services/import.service";
import { useToast } from "@/components/ui/toast";

interface ImportButtonProps {
  /**
   * What register type the file should be imported as. When omitted,
   * the user picks "Purchase register" or "Sale register" from a
   * radio inside the modal.
   */
  registerType?: ImportRegisterType;
  /**
   * Optional fixed label; defaults to "Import". Override when the
   * button is shown alongside a more specific action (e.g. "Import
   * Purchases").
   */
  label?: string;
  /**
   * Fired once the stream closes successfully. The parent page can
   * use this to refetch its list (the import may have inserted new
   * rows that should show up immediately).
   */
  onCompleted?: (result: ImportProgress) => void;
  /**
   * Variant: outline (default) or solid. Outline fits well in the
   * header next to a "New X" button.
   */
  variant?: "outline" | "default";
}

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/**
 * One-click "Import" affordance. Opens a modal that walks the user
 * through picking an Excel register (Purchase or Sale) and uploading
 * it to the backend's SSE import endpoint. Live progress is shown in
 * the modal as the stream emits events.
 *
 * The component is intentionally self-contained — pages just drop an
 * `<ImportButton onCompleted={refetch} />` next to their action row.
 */
export function ImportButton({
  registerType: fixedType,
  label = "Import",
  onCompleted,
  variant = "outline",
}: ImportButtonProps) {
  const { addToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [selectedType, setSelectedType] =
    React.useState<ImportRegisterType>(fixedType ?? "PURCHASE");
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<ImportProgress | null>(null);

  // When the modal opens, snap the selected type to the fixed type
  // (so a transactions-page button doesn't show "PURCHASE" as a fixed
  // option while the user can still toggle to SALE — we always reset
  // to the prop value).
  React.useEffect(() => {
    if (open && fixedType) {
      setSelectedType(fixedType);
    }
  }, [open, fixedType]);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setProgress(null);
  };

  const reset = () => {
    setFile(null);
    setProgress(null);
    setSelectedType(fixedType ?? "PURCHASE");
  };

  const closeModal = () => {
    if (running) return; // disallow closing mid-upload
    setOpen(false);
    reset();
  };

  const handleStart = async () => {
    if (!file) {
      addToast("Please select an Excel file to import", "error");
      return;
    }
    setRunning(true);
    setProgress({ stage: "STARTING", message: "Uploading file…" });
    try {
      await importRegister(file, selectedType, {
        onProgress: (p) => setProgress(p),
        onComplete: (p) => {
          setProgress(p);
          addToast(
            p.message ||
              `${selectedType} register imported successfully`,
            "success"
          );
          onCompleted?.(p);
          // Give the user a moment to read the final progress line
          // before closing the modal.
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
    progress?.progress ??
    (progress?.current != null && progress?.total
      ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
      : null);

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
              Import Register
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!fixedType && (
              <div className="space-y-2">
                <Label>Register Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PURCHASE", "SALE"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={running}
                      onClick={() => setSelectedType(opt)}
                      className={
                        "border rounded-lg px-3 py-2 text-sm font-medium transition " +
                        (selectedType === opt
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")
                      }
                    >
                      {opt === "PURCHASE" ? "Purchase Register" : "Sale Register"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="import-file">Excel File *</Label>
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
                    id="import-file"
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
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    {progress?.stage ?? "Working…"}
                  </span>
                  <span className="tabular-nums text-gray-500">
                    {progress?.current != null && progress?.total
                      ? `${progress.current} / ${progress.total}`
                      : percent != null
                      ? `${percent}%`
                      : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(percent ?? (running ? 8 : 100), 0),
                        100
                      )}%`,
                    }}
                  />
                </div>
                {progress?.message && (
                  <p className="text-[11px] text-gray-600 truncate">
                    {progress.message}
                  </p>
                )}
                {running && (
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading and processing — please don't close this
                    dialog.
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
              loading={running && !progress?.success}
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