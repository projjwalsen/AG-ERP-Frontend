"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, FileText, Save, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout";
import { branchApi } from "@/app/services/branch.service";
import { journalApi, journalHeadApi } from "@/app/services/journal.service";
import {
  JournalHead,
  JournalHeadType,
  PaymentMode,
  PaymentType,
} from "@/app/types/journal";
import { Branch } from "@/app/types/branch";
import { formatCurrency } from "@/lib/utils";

const paymentModeOptions: PaymentMode[] = ["ONLINE", "OFFLINE"];
const paymentThroughOptions: PaymentType[] = [
  "CASH",
  "NEFT",
  "RTGS",
  "UPI",
  "CHEQUE",
  "DD",
  "BANK_DEPOSIT",
];

const paymentThroughLabels: Record<string, string> = {
  CASH: "Cash",
  NEFT: "NEFT",
  RTGS: "RTGS",
  UPI: "UPI",
  CHEQUE: "Cheque",
  DD: "DD",
  BANK_DEPOSIT: "Bank Deposit",
};

// Convert "YYYY-MM-DD" → ISO timestamp the backend expects.
function dateInputToIso(d: string): string {
  if (!d) return "";
  return `${d}T00:00:00.000Z`;
}

interface FormState {
  branchId: string;
  type: "" | JournalHeadType;
  journalHeadId: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentThrough: PaymentType;
  remarks: string;
  journalDate: string;
}

const initialForm: FormState = {
  branchId: "",
  type: "",
  journalHeadId: "",
  amount: 0,
  paymentMode: "OFFLINE",
  paymentThrough: "CASH",
  remarks: "",
  journalDate: "",
};

export default function NewJournalPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [journalHeads, setJournalHeads] = React.useState<JournalHead[]>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(true);
  const [loadingHeads, setLoadingHeads] = React.useState(true);
  const [form, setForm] = React.useState<FormState>(initialForm);

  React.useEffect(() => {
    fetchBranches();
    fetchJournalHeads();
  }, []);

  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const res = await branchApi.getActive();
      if (res.success && res.data) {
        setBranches(res.data.branches || []);
      } else {
        addToast(res.message || "Failed to load branches", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load branches", "error");
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchJournalHeads = async () => {
    setLoadingHeads(true);
    try {
      const res = await journalHeadApi.list();
      if (res.success && res.data) {
        setJournalHeads(res.data.journalHeads || []);
      } else {
        addToast(res.message || "Failed to load journal heads", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load journal heads", "error");
    } finally {
      setLoadingHeads(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.branchId) {
      addToast("Branch is required", "error");
      return;
    }
    if (!form.type) {
      addToast("Type (INWARD / OUTWARD) is required", "error");
      return;
    }
    if (!form.journalHeadId) {
      addToast("Journal Head is required", "error");
      return;
    }

    const linkedHead = journalHeads.find((h) => h.id === form.journalHeadId);
    if (linkedHead && linkedHead.type !== form.type) {
      addToast(
        `Selected head is ${linkedHead.type}; please pick a ${form.type} head`,
        "error"
      );
      return;
    }

    if (!form.amount || form.amount <= 0) {
      addToast("Amount must be greater than 0", "error");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const res = await journalApi.create({
        branchId: form.branchId,
        journalHeadId: form.journalHeadId,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        paymentThrough: form.paymentThrough,
        remarks: form.remarks.trim() || undefined,
        journalDate: dateInputToIso(form.journalDate) || undefined,
      });

      if (res.success) {
        addToast("Journal created successfully", "success");
        // Brief delay so the user sees the success toast before navigation.
        setTimeout(() => {
          router.push("/journal");
        }, 1200);
      } else {
        addToast(res.message || "Failed to create journal", "error");
        setLoading(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to create journal", "error");
      setLoading(false);
    }
  };

  const resetForm = () => setForm(initialForm);

  const headOptions: DataSelectOption[] = form.type
    ? journalHeads
        .filter((h) => h.type === form.type)
        .map((h) => ({
          value: h.id,
          label: h.name,
          description: h.ledger
            ? `${h.ledger.code ?? ""}${h.ledger.name ? " • " + h.ledger.name : ""}`
            : undefined,
          badge: h.type,
        }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <PageHeader
          title="Create Journal Entry"
          description="Post a manual inward or outward journal entry"
          breadcrumbs={[
            { label: "Journals", href: "/journal" },
            { label: "Create" },
          ]}
          actions={
            <Link href="/journal">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Journals
              </Button>
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Branch + Journal Head */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Journal Head
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="journal-branch">Branch *</Label>
                  <DataSelect
                    id="journal-branch"
                    value={form.branchId}
                    onChange={(v) => setForm({ ...form, branchId: v })}
                    placeholder={
                      loadingBranches ? "Loading branches..." : "Select Branch"
                    }
                    required
                    searchable
                    clearable
                    // The route renders inside the standard page layout (no
                    // Radix dialog overlay), but the inline-render style is
                    // still useful so the panel never collides with the
                    // page's overflow-y-auto scrollable content.
                    disablePortal
                    panelClassName="w-full"
                    options={branches.map<DataSelectOption>((b) => ({
                      value: b.id,
                      label: b.name,
                      description: [b.code, b.city, b.state]
                        .filter(Boolean)
                        .join(" • "),
                    }))}
                  />
                </div>

                {/* Type gates which heads appear in the next picker. Picking
                    a type resets the head so type and head side always match. */}
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["INWARD", "OUTWARD"] as const).map((t) => {
                      const active = form.type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, type: t, journalHeadId: "" })
                          }
                          className={
                            "h-10 rounded-lg border text-sm font-medium transition-colors " +
                            (active
                              ? t === "INWARD"
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50")
                          }
                        >
                          {t === "INWARD"
                            ? "Inward (money in)"
                            : "Outward (money out)"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="journal-head">Journal Head *</Label>
                <DataSelect
                  id="journal-head"
                  value={form.journalHeadId}
                  onChange={(v) => setForm({ ...form, journalHeadId: v })}
                  placeholder={
                    !form.type
                      ? "Select type first"
                      : loadingHeads
                      ? "Loading heads..."
                      : `Select ${form.type} Journal Head`
                  }
                  required
                  searchable
                  clearable
                  disablePortal
                  panelClassName="w-full"
                  options={headOptions}
                  disabled={!form.type || loadingHeads}
                />
              </div>
            </CardContent>
          </Card>

          {/* Amount + Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="journal-amount">Amount *</Label>
                  <Input
                    id="journal-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm({ ...form, amount: Number(e.target.value) || 0 })
                    }
                    placeholder="1000"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Preview:{" "}
                    <span className="font-medium text-gray-900">
                      {formatCurrency(Number(form.amount) || 0)}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="journal-date">Journal Date</Label>
                  <Input
                    id="journal-date"
                    type="date"
                    value={form.journalDate}
                    onChange={(e) =>
                      setForm({ ...form, journalDate: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="journal-payment-mode">Payment Mode *</Label>
                  <select
                    id="journal-payment-mode"
                    value={form.paymentMode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentMode: e.target.value as PaymentMode,
                      })
                    }
                    className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                    disabled={loading}
                  >
                    {paymentModeOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="journal-payment-through">
                    Payment Through
                  </Label>
                  <select
                    id="journal-payment-through"
                    value={form.paymentThrough}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentThrough: e.target.value as PaymentType,
                      })
                    }
                    className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loading}
                  >
                    {paymentThroughOptions.map((p) => (
                      <option key={p} value={p}>
                        {paymentThroughLabels[p] || p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="journal-remarks">Remarks</Label>
                <textarea
                  id="journal-remarks"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm({ ...form, remarks: e.target.value })
                  }
                  rows={3}
                  placeholder="Optional note..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>
                <Link href="/journal">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="gap-2" loading={loading}>
                  <Save className="h-4 w-4" />
                  Create Journal
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-sm w-full mx-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <svg
                      className="h-6 w-6 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirm Create Journal
                  </h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Create a journal entry of{" "}
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(Number(form.amount) || 0)}
                  </span>
                  ?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmCreate} loading={loading}>
                    Yes, Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
