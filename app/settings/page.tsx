"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  Save,
  RefreshCcw,
  Package,
  Receipt,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchSettings,
  updateSettings,
} from "@/app/store/settingsSlice";
import { formatDateTime } from "@/lib/utils";

// Description copy for each toggle. Kept here so the page renders the
// same hint text no matter which value the user picks.
const TOGGLE_META: Record<
  string,
  { title: string; description: string; icon: React.ElementType; accent: string }
> = {
  allowNegativeInventory: {
    title: "Allow Negative Inventory",
    description:
      "Permit stock quantities to go below zero on sales issues. Useful when back-orders are accepted, but flag this with finance for accurate COGS reporting.",
    icon: Package,
    accent: "bg-blue-50",
  },
  allowNegativeTransaction: {
    title: "Allow Negative Transaction Amounts",
    description:
      "Allow inward/outward transactions to be recorded with a negative amount. Use for reversal entries and credit memos.",
    icon: Receipt,
    accent: "bg-violet-50",
  },
};

export default function SystemSettingsPage() {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const settings = useAppSelector((s) => s.settings.settings);
  const isLoading = useAppSelector((s) => s.settings.isLoading);
  const isSubmitting = useAppSelector((s) => s.settings.isSubmitting);
  const error = useAppSelector((s) => s.settings.error);

  // Local working copy of the toggles. We only PATCH the diff against
  // the server-side `settings` snapshot, so unsaved changes don't get
  // committed on every flip.
  const [draft, setDraft] = React.useState({
    allowNegativeInventory: false,
    allowNegativeTransaction: false,
    sellerLogo: "",
    sellerCIN: "",
    companyPAN: "",
    signatureImage: "",
    jurisdictionText: "",
  });
  // Tracks whether the user has touched a toggle since the last load /
  // save. Used to enable/disable the Save button.
  const [dirty, setDirty] = React.useState<boolean>(false);

  // Sync the local draft from the server-side settings whenever the
  // fetched row changes (initial load + after a successful save).
  React.useEffect(() => {
    if (!settings) {
      console.info("[settings] draft sync skipped — settings is null");
      return;
    }
    console.info("[settings] draft synced from server", settings);
    setDraft({
      allowNegativeInventory: settings.allowNegativeInventory,
      allowNegativeTransaction: settings.allowNegativeTransaction,
      sellerLogo: settings.sellerLogo || "",
      sellerCIN: settings.sellerCIN || "",
      companyPAN: settings.companyPAN || "",
      signatureImage: settings.signatureImage || "",
      jurisdictionText: settings.jurisdictionText || "",
    });
    setDirty(false);
  }, [settings]);

  // Initial fetch + on-demand re-fetch from the toolbar button.
  const loadSettings = React.useCallback(() => {
    console.info("[settings] dispatch fetchSettings");
    dispatch(fetchSettings());
  }, [dispatch]);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Surface slice errors as a toast.
  React.useEffect(() => {
    if (error) addToast(error, "error");
  }, [error, addToast]);

  const handleToggle = (
    key: "allowNegativeInventory" | "allowNegativeTransaction"
  ) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSave = async () => {
    // When the GET has loaded, `settings` is the server baseline; we
    // diff the draft against it. When the GET has *not* loaded yet
    // (the user is fast and clicked Save before the response came
    // back), we fall back to the schema defaults (both false) so the
    // diff is still meaningful — the user's switches are still
    // applied against a known baseline.
    const baseline = settings ?? {
      id: "",
      allowNegativeInventory: false,
      allowNegativeTransaction: false,
      sellerLogo: "",
      sellerCIN: "",
      companyPAN: "",
      signatureImage: "",
      jurisdictionText: "",
    };

    // Build the diff so the PATCH only carries the keys the user
    // actually changed. The backend treats undefined as "leave alone"
    // (see setting.service.ts), so this is safe.
    const payload: {
      allowNegativeInventory?: boolean;
      allowNegativeTransaction?: boolean;
      sellerLogo?: string | null;
      sellerCIN?: string | null;
      companyPAN?: string | null;
      signatureImage?: string | null;
      jurisdictionText?: string | null;
    } = {};
    if (draft.allowNegativeInventory !== baseline.allowNegativeInventory) {
      payload.allowNegativeInventory = draft.allowNegativeInventory;
    }
    if (draft.allowNegativeTransaction !== baseline.allowNegativeTransaction) {
      payload.allowNegativeTransaction = draft.allowNegativeTransaction;
    }
    const invoiceKeys = [
      "sellerLogo",
      "sellerCIN",
      "companyPAN",
      "signatureImage",
      "jurisdictionText",
    ] as const;
    invoiceKeys.forEach((key) => {
      if (draft[key] !== (baseline[key] || "")) {
        payload[key] = draft[key].trim() || null;
      }
    });
    if (Object.keys(payload).length === 0) {
      addToast("No changes to save", "info");
      return;
    }

    // Helpful breadcrumb so you can confirm in DevTools that the
    // click actually reached the handler, what the server baseline
    // was, and what payload we're about to send.
    console.info("[settings] handleSave", {
      settingsLoaded: !!settings,
      baseline,
      draft,
      payload,
    });

    try {
      await dispatch(updateSettings(payload)).unwrap();
      addToast("Settings updated successfully", "success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to update settings";
      addToast(message, "error");
    }
  };

  const toggleKeys: Array<"allowNegativeInventory" | "allowNegativeTransaction"> =
    ["allowNegativeInventory", "allowNegativeTransaction"];

  return (
    <div className="space-y-5">
      <PageHeader
        title="System Settings"
        description="Configure organisation-wide flags for inventory and transactions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={loadSettings}
              disabled={isLoading}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={handleSave}
              loading={isSubmitting}
              disabled={!dirty || isSubmitting}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Status banner when settings are loaded successfully */}
      {settings && (
        <Card className="border-0 shadow-sm bg-blue-50/40">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Settings loaded
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Last updated on{" "}
                {settings.updatedAt
                  ? formatDateTime(settings.updatedAt)
                  : "—"}{" "}
                • Toggle the switches below and click Save to apply.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main settings card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <SettingsIcon className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-gray-900">
              Inventory &amp; Transaction Controls
            </CardTitle>
            {dirty && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                Unsaved changes
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {isLoading && !settings ? (
            <div className="space-y-3">
              {toggleKeys.map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 p-3 border border-gray-100 rounded-lg"
                >
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            toggleKeys.map((key) => {
              const meta = TOGGLE_META[key];
              const Icon = meta.icon;
              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 p-4 border border-gray-100 rounded-lg bg-white"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`shrink-0 p-2 rounded-lg ${meta.accent}`}
                    >
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <Label
                        htmlFor={`switch-${key}`}
                        className="text-sm font-semibold text-gray-900"
                      >
                        {meta.title}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {meta.description}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
                        {key} = {String(draft[key])}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={`switch-${key}`}
                    checked={draft[key]}
                    onCheckedChange={() => handleToggle(key)}
                    disabled={isSubmitting}
                  />
                </div>
              );
            })
          )}

          {/* Footer: status line. Save / Revert buttons live in the
              page header (top-right) so they're always visible. */}
          {settings && (
            <div className="border-t border-gray-100 pt-3 flex items-center gap-1.5 text-xs text-gray-500">
              {dirty ? (
                <>
                  <Info className="h-3.5 w-3.5 text-amber-600" />
                  You have unsaved changes. Click Save in the top-right to apply.
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  All changes saved.
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["sellerCIN", "Company CIN"],
            ["companyPAN", "Company PAN"],
            ["sellerLogo", "Seller Logo URL/Data URI"],
            ["signatureImage", "Signature Image URL/Data URI"],
            ["jurisdictionText", "Jurisdiction Text"],
          ].map(([key, label]) => (
            <div
              key={key}
              className={`space-y-2 ${key === "jurisdictionText" ? "md:col-span-2" : ""}`}
            >
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={draft[key as keyof typeof draft] as string}
                onChange={(event) => {
                  setDraft((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }));
                  setDirty(true);
                }}
                disabled={isSubmitting}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <ToastContainer />
    </div>
  );
}
