"use client";

// Data Import — one page that walks the user through every Tally import
// in the order the data depends on each other:
//
//   1. Product Master      POST /api/migration/product                       (SSE)
//   2. Agencies            POST /api/migration/agency                        (SSE)
//   3. Purchase Register   POST /api/migration/import  type=PURCHASE         (SSE)
//   4. Sale Register       POST /api/migration/import  type=SALE             (SSE)
//   5. Transactions        POST /api/migration/import/journal?type=TRANSACTION (SSE)
//   6. Debit/Credit Notes  POST /api/migration/import/inward-debit-credit-notes (JSON)
//   7. Journals            POST /api/migration/import/journal?type=JOURNAL   (SSE)
//
// The user attaches a file to each step they want, ticks the steps, and
// clicks "Start Import": the selected steps run one after another in this
// window. Every step can also be run on its own with "Import only this".
// If a step fails outright (network / server error) the run pauses so the
// user can Retry, Skip and continue, or Stop.

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  CircleSlash,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Package,
  Play,
  Receipt,
  RotateCcw,
  ShoppingCart,
  SkipForward,
  Square,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { hasModulePermission } from "@/lib/usePermissions";
import { cn } from "@/lib/utils";
import {
  importAgencyMaster,
  importDebitCreditNotes,
  importJournalRegister,
  importProductMaster,
  importRegister,
} from "@/app/services/import.service";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

type StepKey =
  | "product"
  | "agency"
  | "purchase"
  | "sale"
  | "transaction"
  | "drcr"
  | "journal";

interface StepDef {
  key: StepKey;
  title: string;
  /** Which Tally export the user should upload. */
  source: string;
  /** What the step creates in the ERP. */
  description: string;
  /** Any one of these modules with WRITE permission unlocks the step. */
  modules: string[];
  icon: React.ElementType;
  /** True when the backend streams live progress. */
  streams: boolean;
}

const STEPS: StepDef[] = [
  {
    key: "product",
    title: "Product Master",
    source: "Tally Stock Summary",
    description: "Creates products and their opening stock.",
    modules: ["PRODUCT"],
    icon: Package,
    streams: true,
  },
  {
    key: "agency",
    title: "Agencies",
    source: "Tally Sundry Debtors / Sundry Creditors",
    description:
      "Creates or updates vendors and clients (matched by GSTIN or name) with their opening balances.",
    modules: ["AGENCY"],
    icon: Briefcase,
    streams: true,
  },
  {
    key: "purchase",
    title: "Purchase Register",
    source: "Tally Purchase Register",
    description: "Imports purchase invoices. Products and agencies must already exist.",
    modules: ["PURCHASE"],
    icon: ShoppingCart,
    streams: true,
  },
  {
    key: "sale",
    title: "Sale Register",
    source: "Tally Sales Register",
    description: "Imports sales invoices. Products and agencies must already exist.",
    modules: ["SALE"],
    icon: Receipt,
    streams: true,
  },
  {
    key: "transaction",
    title: "Transactions",
    source: "Tally Journal Register / Day Book",
    description:
      "Imports payment, receipt and invoice-linked vouchers only. Plain journal vouchers are left for the Journals step.",
    modules: ["TRANSACTION"],
    icon: CreditCard,
    streams: true,
  },
  {
    key: "drcr",
    title: "Debit / Credit Notes",
    source: "Debit/Credit Note register (Date, Particular, Voucher Type, Voucher No., Debit, Credit, Path)",
    description:
      "Imports inward and outward notes and links each to its approved purchase or sale invoice. Notes already in the ERP are skipped.",
    modules: ["DRCR_NOTE", "SALE"],
    icon: FileText,
    streams: false,
  },
  {
    key: "journal",
    title: "Journals",
    source: "Tally vouchers in the sample journal format, exported head by head from the Trial Balance",
    description:
      "From the Trial Balance report in Tally, for each head export all the vouchers in the sample journal format. Imports journal vouchers only. Purchase and sales invoice vouchers in the file are skipped.",
    modules: ["JOURNAL"],
    icon: BookOpen,
    streams: true,
  },
];

const STEP_BY_KEY = Object.fromEntries(STEPS.map((s) => [s.key, s])) as Record<StepKey, StepDef>;

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Step runtime state
// ---------------------------------------------------------------------------

type StepStatus =
  | "idle" // nothing has happened yet
  | "queued" // waiting its turn in a running batch
  | "running"
  | "done" // finished, no failed rows
  | "warning" // finished, some rows failed
  | "error" // the request itself failed
  | "cancelled"
  | "skipped"; // user chose "Skip and continue" after an error

interface StepCounts {
  total: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  percentage: number;
}

/** Loose shape shared by every importer's progress / result payload. */
interface ProgressLike {
  total?: number;
  processed?: number;
  current?: number;
  success?: number | boolean;
  failed?: number;
  skipped?: number;
  percentage?: number;
  message?: unknown;
  errors?: unknown;
}

/** A failed row as reported by any importer. */
type RowError = Record<string, unknown>;

interface StepState {
  selected: boolean;
  file: File | null;
  status: StepStatus;
  counts: StepCounts | null;
  errors: RowError[];
  message?: string;
  startedAt?: number;
  finishedAt?: number;
}

const EMPTY_COUNTS: StepCounts = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  percentage: 0,
};

const initialState = (): Record<StepKey, StepState> =>
  Object.fromEntries(
    STEPS.map((s): [StepKey, StepState] => [
      s.key,
      { selected: true, file: null, status: "idle", counts: null, errors: [] },
    ])
  ) as Record<StepKey, StepState>;

/** Coerce any backend progress payload into our counters. */
function toCounts(p: ProgressLike | null | undefined): StepCounts {
  const total = Number(p?.total ?? 0);
  const processed = Number(p?.processed ?? p?.current ?? 0);
  const pct =
    p?.percentage != null
      ? Number(p.percentage)
      : total > 0
      ? (processed / total) * 100
      : 0;
  return {
    total,
    processed,
    success: Number(p?.success === true ? 0 : p?.success ?? 0),
    failed: Number(p?.failed ?? 0),
    skipped: Number(p?.skipped ?? 0),
    percentage: Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)),
  };
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function describeError(e: RowError): { label: string; message: string } {
  const message = String(e?.message ?? e?.error ?? "Failed");
  const label = e?.voucherNo
    ? `Voucher ${e.voucherNo}`
    : e?.agency
    ? String(e.agency)
    : e?.name || e?.sku
    ? String(e.name ?? e.sku)
    : e?.row != null
    ? `Row ${e.row}`
    : e?.sourceRow != null
    ? `Row ${e.sourceRow}`
    : "Row";
  return { label, message };
}

type Decision = "retry" | "skip" | "stop";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DataImportPage() {
  const { addToast } = useToast();
  const { permissions } = useAppSelector((state) => state.auth);

  const [steps, setSteps] = React.useState<Record<StepKey, StepState>>(initialState);
  const [running, setRunning] = React.useState(false);
  const [queue, setQueue] = React.useState<StepKey[]>([]);
  const [currentKey, setCurrentKey] = React.useState<StepKey | null>(null);
  const [blockedKey, setBlockedKey] = React.useState<StepKey | null>(null);
  const [missingFiles, setMissingFiles] = React.useState<Set<StepKey>>(new Set());
  const [runFinished, setRunFinished] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);
  const decisionRef = React.useRef<((d: Decision) => void) | null>(null);

  // Permissions haven't loaded (or UI-only session) → don't lock anything;
  // the sidebar follows the same rule.
  const canRun = React.useCallback(
    (def: StepDef) =>
      permissions.length === 0 ||
      def.modules.some((m) => hasModulePermission(permissions, m, "WRITE")),
    [permissions]
  );

  const patch = React.useCallback((key: StepKey, next: Partial<StepState>) => {
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));
  }, []);

  // Warn before leaving the page while an import is in flight.
  React.useEffect(() => {
    if (!running) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [running]);

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------

  const setFile = (key: StepKey, file: File | null) => {
    if (file) {
      const lower = file.name.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        addToast("Only Excel files (.xlsx or .xls) can be imported", "error");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        addToast("File is larger than 20 MB", "error");
        return;
      }
    }
    patch(key, {
      file,
      status: "idle",
      counts: null,
      errors: [],
      message: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      ...(file ? { selected: true } : {}),
    });
    if (file) {
      setMissingFiles((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // -------------------------------------------------------------------------
  // Running one step
  // -------------------------------------------------------------------------

  /** Runs one import. Resolves true when the request completed. */
  const executeStep = async (key: StepKey, signal: AbortSignal): Promise<boolean> => {
    const file = steps[key].file;
    if (!file) return false;

    setCurrentKey(key);
    patch(key, {
      status: "running",
      counts: { ...EMPTY_COUNTS },
      errors: [],
      message: "Uploading file…",
      startedAt: Date.now(),
      finishedAt: undefined,
    });

    let final: ProgressLike | null = null;
    const onProgress = (p: ProgressLike) =>
      patch(key, {
        counts: toCounts(p),
        message: typeof p?.message === "string" ? p.message : "Importing rows…",
      });
    const onComplete = (r: ProgressLike) => {
      final = r;
    };

    try {
      switch (key) {
        case "product":
          await importProductMaster(file, { onProgress, onComplete, signal });
          break;
        case "agency":
          await importAgencyMaster(file, { onProgress, onComplete, signal });
          break;
        case "purchase":
          await importRegister(file, "PURCHASE", { onProgress, onComplete, signal });
          break;
        case "sale":
          await importRegister(file, "SALE", { onProgress, onComplete, signal });
          break;
        case "transaction":
          await importJournalRegister(file, "TRANSACTION", { onProgress, onComplete, signal });
          break;
        case "journal":
          await importJournalRegister(file, "JOURNAL", { onProgress, onComplete, signal });
          break;
        case "drcr":
          patch(key, { message: "Processing notes — this step reports when finished…" });
          final = await importDebitCreditNotes(file, { signal });
          break;
      }

      if (!final) {
        throw new Error(
          "The server closed the connection before reporting a result. Check the module list before re-running this step."
        );
      }

      const counts = toCounts({ ...final, percentage: 100 });
      patch(key, {
        status: counts.failed > 0 ? "warning" : "done",
        counts,
        errors: Array.isArray(final.errors) ? (final.errors as RowError[]) : [],
        message:
          counts.failed > 0
            ? `${counts.failed} row(s) failed. Failed purchase, sale and journal rows download as an Excel error report.`
            : "Completed",
        finishedAt: Date.now(),
      });
      return true;
    } catch (err: unknown) {
      if (signal.aborted) {
        patch(key, {
          status: "cancelled",
          message:
            "Cancelled. Rows the server already processed stay imported.",
          finishedAt: Date.now(),
        });
        return false;
      }
      patch(key, {
        status: "error",
        message: (err instanceof Error && err.message) || "Import failed",
        finishedAt: Date.now(),
      });
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // Running a list of steps one after another
  // -------------------------------------------------------------------------

  const runQueue = async (keys: StepKey[]) => {
    if (running || keys.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setRunFinished(false);
    setQueue(keys);
    keys.forEach((k) =>
      patch(k, { status: "queued", counts: null, errors: [], message: undefined })
    );

    let stopped = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const ok = await executeStep(key, controller.signal);
      if (controller.signal.aborted) {
        stopped = true;
        break;
      }
      if (ok) continue;

      // Request-level failure: wait for the user to decide.
      setBlockedKey(key);
      const decision = await new Promise<Decision>((resolve) => {
        decisionRef.current = resolve;
      });
      decisionRef.current = null;
      setBlockedKey(null);

      if (decision === "retry") {
        i--;
      } else if (decision === "skip") {
        patch(key, { status: "skipped" });
      } else {
        stopped = true;
        break;
      }
    }

    // Anything still queued didn't run.
    setSteps((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        if (next[k].status === "queued") next[k] = { ...next[k], status: "idle" };
      });
      return next;
    });

    abortRef.current = null;
    setCurrentKey(null);
    setRunning(false);
    setRunFinished(true);
    addToast(stopped ? "Import stopped" : "Import finished", stopped ? "error" : "success");
  };

  const startSelected = () => {
    const selected = STEPS.filter((s) => steps[s.key].selected && canRun(s)).map((s) => s.key);
    if (selected.length === 0) {
      addToast("Select at least one step to import", "error");
      return;
    }
    const missing = selected.filter((k) => !steps[k].file);
    if (missing.length > 0) {
      setMissingFiles(new Set(missing));
      addToast(
        `Choose a file for: ${missing.map((k) => STEP_BY_KEY[k].title).join(", ")}`,
        "error"
      );
      return;
    }
    setMissingFiles(new Set());
    runQueue(selected);
  };

  const cancelRun = () => {
    abortRef.current?.abort();
    // If the run is paused on an error, release it.
    decisionRef.current?.("stop");
  };

  const resetAll = () => {
    if (running) return;
    setSteps(initialState());
    setQueue([]);
    setMissingFiles(new Set());
    setRunFinished(false);
  };

  const setAllSelected = (value: boolean) => {
    setSteps((prev) => {
      const next = { ...prev };
      STEPS.forEach((s) => {
        if (canRun(s)) next[s.key] = { ...next[s.key], selected: value };
      });
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const selectedCount = STEPS.filter((s) => steps[s.key].selected && canRun(s)).length;
  const runIndex = currentKey ? queue.indexOf(currentKey) : -1;
  const completedInQueue = queue.filter((k) =>
    ["done", "warning", "error", "skipped", "cancelled"].includes(steps[k].status)
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Import"
        description="Import your Tally data step by step. Run every step in order, or pick only the ones you need."
        actions={
          <>
            <Button variant="outline" onClick={resetAll} disabled={running} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            {running ? (
              <Button variant="outline" onClick={cancelRun} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            ) : (
              <Button onClick={startSelected} disabled={selectedCount === 0} className="gap-2">
                <Play className="h-4 w-4" />
                Start Import ({selectedCount} {selectedCount === 1 ? "step" : "steps"})
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ---------------- Step list ---------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Tick the steps to include and attach the Tally export for each one.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="font-medium text-green-700 hover:underline disabled:opacity-50"
                onClick={() => setAllSelected(true)}
                disabled={running}
              >
                Select all
              </button>
              <button
                type="button"
                className="font-medium text-gray-600 hover:underline disabled:opacity-50"
                onClick={() => setAllSelected(false)}
                disabled={running}
              >
                Clear
              </button>
            </div>
          </div>

          {STEPS.map((def, index) => (
            <StepCard
              key={def.key}
              index={index}
              def={def}
              state={steps[def.key]}
              allowed={canRun(def)}
              running={running}
              isCurrent={currentKey === def.key}
              isBlocked={blockedKey === def.key}
              missingFile={missingFiles.has(def.key)}
              isLast={index === STEPS.length - 1}
              sameFileOffer={
                def.key === "journal" &&
                !steps.journal.file &&
                steps.transaction.file
                  ? steps.transaction.file
                  : def.key === "transaction" &&
                    !steps.transaction.file &&
                    steps.journal.file
                  ? steps.journal.file
                  : null
              }
              onToggle={(v) => patch(def.key, { selected: v })}
              onFile={(f) => setFile(def.key, f)}
              onRunOnly={() => runQueue([def.key])}
              onDecision={(d) => decisionRef.current?.(d)}
            />
          ))}
        </div>

        {/* ---------------- Side panel ---------------- */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Run status</p>
              {queue.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Nothing has run yet. Attach files and click{" "}
                  <span className="font-medium text-gray-700">Start Import</span>, or use{" "}
                  <span className="font-medium text-gray-700">Import only this</span> on a single step.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {running
                        ? blockedKey
                          ? `Paused on ${STEP_BY_KEY[blockedKey].title}`
                          : `Step ${runIndex + 1} of ${queue.length}`
                        : runFinished
                        ? "Run finished"
                        : ""}
                    </span>
                    <span className="tabular-nums text-gray-500">
                      {completedInQueue}/{queue.length}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {queue.map((k) => (
                      <div
                        key={k}
                        title={STEP_BY_KEY[k].title}
                        className={cn("h-1.5 flex-1 rounded-full", segmentColor(steps[k].status))}
                      />
                    ))}
                  </div>
                  <ul className="space-y-1.5 pt-1">
                    {queue.map((k) => (
                      <li key={k} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <StatusIcon status={steps[k].status} small />
                          <span className="truncate text-gray-700">{STEP_BY_KEY[k].title}</span>
                        </span>
                        <span className="tabular-nums text-gray-500 shrink-0">
                          {steps[k].counts && steps[k].status !== "queued"
                            ? `${steps[k].counts!.success}/${steps[k].counts!.total}`
                            : statusLabel(steps[k].status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2 text-xs text-gray-600">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Info className="h-4 w-4 text-blue-600" />
                Before you start
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Steps run in the order shown. Later steps need the data from earlier ones (e.g. purchases need products and agencies).</li>
                <li>Use the standard Tally export saved as Excel (.xlsx or .xls), up to 20 MB per file.</li>
                <li>Transactions and Journals both read the Tally journal format, so you can attach the same file to both.</li>
                <li>For Journals: from the Trial Balance report in Tally, for each head export all the vouchers in the sample journal format.</li>
                <li>Debit/Credit Notes link to approved purchase and sale invoices, so import those first.</li>
                <li>Failed purchase, sale and journal rows download automatically as an Excel error report.</li>
                <li>Keep this window open until the run finishes.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step card
// ---------------------------------------------------------------------------

function StepCard({
  index,
  def,
  state,
  allowed,
  running,
  isCurrent,
  isBlocked,
  missingFile,
  isLast,
  sameFileOffer,
  onToggle,
  onFile,
  onRunOnly,
  onDecision,
}: {
  index: number;
  def: StepDef;
  state: StepState;
  allowed: boolean;
  running: boolean;
  isCurrent: boolean;
  isBlocked: boolean;
  missingFile: boolean;
  isLast: boolean;
  sameFileOffer: File | null;
  onToggle: (v: boolean) => void;
  onFile: (f: File | null) => void;
  onRunOnly: () => void;
  onDecision: (d: Decision) => void;
}) {
  const inputId = `import-file-${def.key}`;
  const Icon = def.icon;
  const counts = state.counts;
  const showProgress =
    state.status !== "idle" && state.status !== "queued" && (counts || state.message);
  const hasResult = ["done", "warning"].includes(state.status);
  const [showErrors, setShowErrors] = React.useState(false);

  return (
    <div className="relative flex gap-3">
      {/* Step rail */}
      <div className="flex flex-col items-center pt-4">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold shrink-0 bg-white",
            railColor(state.status, isCurrent)
          )}
        >
          {state.status === "idle" || state.status === "queued" ? (
            index + 1
          ) : (
            <StatusIcon status={state.status} />
          )}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
      </div>

      <Card
        className={cn(
          "flex-1 transition-shadow",
          isCurrent && "ring-2 ring-green-500/40 shadow-md",
          !allowed && "opacity-60",
          missingFile && "ring-2 ring-red-300"
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-1 items-start gap-3 min-w-0">
              <Checkbox
                className="mt-1"
                checked={state.selected && allowed}
                disabled={running || !allowed}
                onCheckedChange={(v) => onToggle(v === true)}
                aria-label={`Include ${def.title}`}
              />
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {index + 1}. {def.title}
                  </p>
                  <StatusBadge status={state.status} />
                  {!allowed && (
                    <Badge variant="outline" className="text-[10px]">
                      No write permission
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{def.description}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  File: <span className="text-gray-600">{def.source}</span>
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={onRunOnly}
              disabled={running || !allowed || !state.file}
              title={!state.file ? "Choose a file first" : undefined}
            >
              <Upload className="h-3.5 w-3.5" />
              Import only this
            </Button>
          </div>

          {/* File picker */}
          <div className="flex items-center gap-2">
            <label
              htmlFor={inputId}
              className={cn(
                "flex-1 flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-sm transition min-w-0",
                running || !allowed
                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                  : missingFile
                  ? "border-red-300 bg-red-50/40 cursor-pointer"
                  : "border-gray-300 bg-white cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40"
              )}
            >
              <FileSpreadsheet className="h-4 w-4 text-gray-400 shrink-0" />
              <span className={cn("truncate", state.file ? "text-gray-800" : "text-gray-500")}>
                {state.file ? state.file.name : "Choose an .xlsx or .xls file"}
              </span>
              {state.file && (
                <span className="ml-auto text-[11px] text-gray-400 shrink-0">
                  {(state.file.size / 1024).toFixed(0)} KB
                </span>
              )}
              <input
                id={inputId}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                className="hidden"
                disabled={running || !allowed}
                onChange={(e) => {
                  onFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
            {state.file && !running && (
              <Button variant="ghost" size="icon" onClick={() => onFile(null)} aria-label="Remove file">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {sameFileOffer && !running && allowed && (
            <button
              type="button"
              className="text-[11px] font-medium text-green-700 hover:underline"
              onClick={() => onFile(sameFileOffer)}
            >
              Use the same file ({sameFileOffer.name})
            </button>
          )}
          {missingFile && (
            <p className="text-[11px] text-red-600">Choose a file for this step or untick it.</p>
          )}

          {/* Progress / result */}
          {showProgress && (
            <div
              className={cn(
                "rounded-md border p-3 space-y-2",
                state.status === "error"
                  ? "border-red-200 bg-red-50/60"
                  : state.status === "cancelled"
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              {(state.status === "running" || hasResult) && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 truncate">
                      {state.status === "running" ? state.message ?? "Importing…" : "Completed"}
                    </span>
                    <span className="tabular-nums text-gray-500 shrink-0 ml-2">
                      {def.streams || hasResult
                        ? `${counts?.processed ?? 0}/${counts?.total || "?"} (${Math.round(
                            counts?.percentage ?? 0
                          )}%)`
                        : ""}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    {state.status === "running" && (!def.streams || !counts?.total) ? (
                      <div className="h-full w-1/3 bg-emerald-500 rounded-full animate-pulse" />
                    ) : (
                      <div
                        className={cn(
                          "h-full transition-all",
                          state.status === "warning" ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(Math.max(counts?.percentage ?? 0, 0), 100)}%` }}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <Counter label="Imported" value={counts?.success ?? 0} tone="emerald" />
                    <Counter label="Failed" value={counts?.failed ?? 0} tone="rose" />
                    <Counter label="Skipped" value={counts?.skipped ?? 0} tone="amber" />
                    <Counter label="Total" value={counts?.total ?? 0} tone="gray" />
                  </div>
                </>
              )}

              {state.status === "running" && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading and processing — please keep this window open.
                </p>
              )}

              {hasResult && state.startedAt && state.finishedAt && (
                <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                  {state.status === "done" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  )}
                  {state.status === "done"
                    ? `Done in ${formatDuration(state.finishedAt - state.startedAt)}.`
                    : `${state.message} (${formatDuration(state.finishedAt - state.startedAt)})`}
                </p>
              )}

              {hasResult && state.errors.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-rose-700 hover:underline"
                    onClick={() => setShowErrors((s) => !s)}
                  >
                    {showErrors ? "Hide" : "Show"} failed rows ({state.errors.length})
                  </button>
                  {showErrors && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-rose-100 bg-white">
                      <ul className="divide-y divide-rose-100">
                        {state.errors.slice(0, 50).map((e, i) => {
                          const { label, message } = describeError(e);
                          return (
                            <li key={i} className="px-3 py-2 text-xs">
                              <span className="font-mono text-rose-700">{label}</span>
                              <span className="block text-rose-600 mt-0.5">{message}</span>
                            </li>
                          );
                        })}
                        {state.errors.length > 50 && (
                          <li className="px-3 py-2 text-xs italic text-rose-700">
                            +{state.errors.length - 50} more row(s)
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(state.status === "error" ||
                state.status === "cancelled" ||
                state.status === "skipped") && (
                <p
                  className={cn(
                    "text-xs flex items-start gap-1.5",
                    state.status === "error" ? "text-red-700" : "text-gray-600"
                  )}
                >
                  {state.status === "error" ? (
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <CircleSlash className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>
                    {state.status === "skipped"
                      ? `Skipped after error: ${state.message ?? ""}`
                      : state.message}
                  </span>
                </p>
              )}

              {isBlocked && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-gray-700 mr-1">The run is paused. What next?</span>
                  <Button size="sm" className="gap-1.5" onClick={() => onDecision("retry")}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onDecision("skip")}>
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip and continue
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => onDecision("stop")}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "gray";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    gray: "bg-gray-100 text-gray-700",
  } as const;
  return (
    <div className={cn("rounded-md px-2 py-1.5", tones[tone])}>
      <p className="font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] opacity-80">{label}</p>
    </div>
  );
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case "idle":
      return "Not run";
    case "queued":
      return "Waiting";
    case "running":
      return "Importing";
    case "done":
      return "Completed";
    case "warning":
      return "Completed with failures";
    case "error":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "skipped":
      return "Skipped";
  }
}

function StatusBadge({ status }: { status: StepStatus }) {
  if (status === "idle") return null;
  const variant: "success" | "warning" | "error" | "info" | "outline" =
    status === "done"
      ? "success"
      : status === "warning" || status === "queued"
      ? "warning"
      : status === "error"
      ? "error"
      : status === "running"
      ? "info"
      : "outline";
  return (
    <Badge variant={variant} className="text-[10px]">
      {statusLabel(status)}
    </Badge>
  );
}

function StatusIcon({ status, small = false }: { status: StepStatus; small?: boolean }) {
  const cls = small ? "h-3.5 w-3.5" : "h-4 w-4";
  switch (status) {
    case "running":
      return <Loader2 className={cn(cls, "animate-spin text-green-600")} />;
    case "done":
      return <CheckCircle2 className={cn(cls, "text-emerald-600")} />;
    case "warning":
      return <AlertTriangle className={cn(cls, "text-amber-600")} />;
    case "error":
      return <XCircle className={cn(cls, "text-red-600")} />;
    case "cancelled":
    case "skipped":
      return <CircleSlash className={cn(cls, "text-gray-400")} />;
    default:
      return <span className={cn("inline-block rounded-full border border-gray-300", small ? "h-3 w-3" : "h-3.5 w-3.5")} />;
  }
}

function railColor(status: StepStatus, isCurrent: boolean): string {
  if (isCurrent || status === "running") return "border-green-500 text-green-700";
  switch (status) {
    case "done":
      return "border-emerald-500";
    case "warning":
      return "border-amber-500";
    case "error":
      return "border-red-500";
    case "queued":
      return "border-amber-300 text-amber-700";
    default:
      return "border-gray-300 text-gray-500";
  }
}

function segmentColor(status: StepStatus): string {
  switch (status) {
    case "running":
      return "bg-green-400 animate-pulse";
    case "done":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "error":
      return "bg-red-500";
    case "cancelled":
    case "skipped":
      return "bg-gray-400";
    default:
      return "bg-gray-200";
  }
}
