"use client";

import * as React from "react";
import { Briefcase, Plus, Search, Edit, Eye, MapPin, MoreHorizontal, Phone, Mail, Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { agencyApi, UpdateAgencyPayload } from "@/app/services/agency.service";
import {
  importAgencyMaster,
  AgencyImportProgress,
} from "@/app/services/import.service";
import { metaApi } from "@/app/services/meta.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { downloadFile } from "@/lib/download";
import { Agency } from "@/app/types/agency";
import { useRouter } from "next/navigation";

const agencyTypeLabels: Record<string, string> = {
  VENDOR: "Vendor",
  CLIENT: "Client",
  BOTH: "Both",
};

export default function AgenciesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agency Management</h1>
        <p className="text-gray-500 mt-1">
          Manage vendors, clients, and their branch assignments
        </p>
      </div>

      <AgenciesTab />
      <ToastContainer />
    </div>
  );
}

function AgenciesTab() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ total: number; totalPages: number; page: number; limit: number } | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedAgency, setSelectedAgency] = React.useState<Agency | null>(null);
  const [exporting, setExporting] = React.useState(false);
  // Agency-master import — drives POST /api/migration/agency via SSE.
  const [importOpen, setImportOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] =
    React.useState<AgencyImportProgress | null>(null);
  const [importFinal, setImportFinal] = React.useState<{
    total: number;
    processed: number;
    success: number;
    failed: number;
    errors: AgencyImportProgress["errors"];
  } | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const importAbortRef = React.useRef<AbortController | null>(null);
  const { permissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(permissions, "AGENCY", "VIEW");
  const canWrite = hasModulePermission(permissions, "AGENCY", "WRITE");

  React.useEffect(() => {
    if (canView) {
      fetchAgencies(currentPage, searchTerm, selectedType);
    }
  }, [canView, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
    if (canView) {
      fetchAgencies(1, searchTerm, selectedType);
    }
  }, [searchTerm, selectedType]);

  const fetchAgencies = async (page: number = 1, search?: string, type?: string) => {
    setLoading(true);
    try {
      const response = await agencyApi.getAll({ page, limit: 10, search, type: type as any });
      const agenciesData = response.data?.agencies ?? [];
      setAgencies(agenciesData);
      if (response.data && typeof response.data === "object" && "pagination" in response.data) {
        setPagination((response.data as any).pagination);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load agencies", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredAgencies = React.useMemo(() => {
    return agencies.filter((agency) => {
      const name = agency.name || "";
      const gstin = agency.gstin || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             gstin.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [agencies, searchTerm]);

  const handleCreate = () => {
    router.push("/agencies/new");
  };

  const handleEditSuccess = () => {
    window.location.reload();
  };

  const handleEdit = (agency: Agency) => {
    setSelectedAgency(agency);
    setEditModalOpen(true);
  };

  const handleView = (agency: Agency) => {
    setSelectedAgency(agency);
    setViewModalOpen(true);
  };

  const handleToggleStatus = async (agency: Agency) => {
    try {
      const newStatus = agency.isActive ? false : true;
      const response = await agencyApi.updateStatus(agency.id, newStatus);
      if (response.success) {
        addToast(`Agency ${newStatus ? "activated" : "deactivated"} successfully`, "success");
        fetchAgencies(currentPage, searchTerm, selectedType);
      } else {
        addToast(response.message || "Failed to update status", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update status", "error");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadFile(
        `api/agencies/all?${new URLSearchParams({
          export: "true",
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(selectedType ? { type: selectedType } : {}),
        }).toString()}`,
        "agencies.xlsx"
      );
      addToast("Agencies exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export agencies", "error");
    } finally {
      setExporting(false);
    }
  };

  const openImport = () => {
    setImportProgress(null);
    setImportFinal(null);
    setImportError(null);
    setImportOpen(true);
  };

  const closeImport = () => {
    if (importing) {
      importAbortRef.current?.abort();
    }
    setImportOpen(false);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportProgress(null);
    setImportFinal(null);
    setImportError(null);

    const controller = new AbortController();
    importAbortRef.current = controller;

    try {
      await importAgencyMaster(file, {
        signal: controller.signal,
        onProgress: (p) => setImportProgress(p),
        onComplete: (r) => {
          setImportFinal(r);
          setImporting(false);
          importAbortRef.current = null;
          addToast(
            r.failed > 0
              ? `Imported ${r.success}/${r.total} agencies (${r.failed} failed)`
              : `Imported ${r.success} agencies successfully`,
            r.failed > 0 ? "error" : "success"
          );
          fetchAgencies(currentPage, searchTerm, selectedType);
        },
        onError: (err) => {
          setImportError(err.message || "Import failed");
          setImporting(false);
          importAbortRef.current = null;
        },
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setImportError(err?.message || "Import failed");
        addToast(err?.message || "Import failed", "error");
      }
      setImporting(false);
      importAbortRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Agencies</h2>
          <p className="text-sm text-gray-500">Manage agency information and status</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={openImport}
            >
              <Upload className="h-4 w-4" />
              Import Agencies
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Agency
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search agencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Types</option>
            <option value="VENDOR">Vendor</option>
            <option value="CLIENT">Client</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        {(searchTerm || selectedType) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedType("");
            }}
          >
            Clear
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
          loading={exporting}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredAgencies.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Agency</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAgencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agency.name}</p>
                            {agency.gstin && (
                              <p className="text-xs text-gray-500 font-mono">{agency.gstin}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {agencyTypeLabels[agency.type] || agency.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {agency.contactPerson && (
                            <p className="text-sm text-gray-600">{agency.contactPerson}</p>
                          )}
                          {agency.mobileNumber && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />{agency.mobileNumber}
                            </p>
                          )}
                          {agency.email && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />{agency.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {agency.city && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {agency.city}, {agency.state}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={agency.isActive ? "success" : "error"} className={agency.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {agency.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {canView && (
                              <DropdownMenuItem onClick={() => handleView(agency)}>
                                <Eye className="mr-2 h-4 w-4" />View
                              </DropdownMenuItem>
                            )}
                            {canWrite && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(agency)}>
                                  <Edit className="mr-2 h-4 w-4" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(agency)} className={agency.isActive ? "text-red-600" : "text-green-600"}>
                                  {agency.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No agencies found</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add First Agency
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedAgency && (
        <EditAgencyModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          agency={selectedAgency}
        />
      )}

      {selectedAgency && (
        <ViewAgencyModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          agency={selectedAgency}
        />
      )}

      <ImportAgenciesModal
        open={importOpen}
        onClose={closeImport}
        importing={importing}
        progress={importProgress}
        final={importFinal}
        error={importError}
        onFileSelected={handleImportFile}
      />
    </div>
  );
}

// ============================================================================
// Import agencies from Excel — drives POST /api/migration/agency.
//
// Backend streams `data: { total, processed, success, failed, percentage,
// errors: [{ agency, error }] }` SSE chunks while it imports. The
// modal shows a live progress bar and a final summary.
// ============================================================================

function ImportAgenciesModal({
  open,
  onClose,
  importing,
  progress,
  final,
  error,
  onFileSelected,
}: {
  open: boolean;
  onClose: () => void;
  importing: boolean;
  progress: AgencyImportProgress | null;
  final: {
    total: number;
    processed: number;
    success: number;
    failed: number;
    errors: AgencyImportProgress["errors"];
  } | null;
  error: string | null;
  onFileSelected: (file: File) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = React.useState<string>("");

  const handleChooseFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    onFileSelected(file);
    e.target.value = "";
  };

  React.useEffect(() => {
    if (!open) setFileName("");
  }, [open]);

  const totalRows = progress?.total ?? final?.total ?? 0;
  const processedRows = progress?.processed ?? final?.processed ?? 0;
  const successRows = progress?.success ?? final?.success ?? 0;
  const failedRows = progress?.failed ?? final?.failed ?? 0;
  const percentage =
    final != null
      ? 100
      : Math.min(100, Math.max(0, progress?.percentage ?? 0));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Import Agency Master
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload an Excel workbook (.xlsx / .xls) of agency master
            rows. The importer streams per-row progress as it processes
            the file.
          </p>

          {!importing && !final && !error && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleChooseFile}
              >
                <Upload className="h-4 w-4" />
                {fileName ? `Re-pick file (${fileName})` : "Choose Excel file"}
              </Button>
            </div>
          )}

          {(importing || progress) && !final && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {importing
                    ? `Importing… ${processedRows}/${totalRows || "?"}`
                    : "Preparing…"}
                </span>
                <span>{percentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-emerald-50 px-2 py-1.5">
                  <p className="text-emerald-700 font-semibold">
                    {successRows}
                  </p>
                  <p className="text-[11px] text-emerald-600">Imported</p>
                </div>
                <div className="rounded-md bg-rose-50 px-2 py-1.5">
                  <p className="text-rose-700 font-semibold">{failedRows}</p>
                  <p className="text-[11px] text-rose-600">Failed</p>
                </div>
                <div className="rounded-md bg-gray-100 px-2 py-1.5">
                  <p className="text-gray-700 font-semibold">{totalRows}</p>
                  <p className="text-[11px] text-gray-500">Total</p>
                </div>
              </div>
            </div>
          )}

          {error && !final && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
              <div className="flex items-start gap-2 text-sm text-rose-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Import failed</p>
                  <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {final && (
            <div className="space-y-3">
              <div
                className={
                  "rounded-md border p-3 " +
                  (final.failed > 0
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50")
                }
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className={
                      "h-4 w-4 mt-0.5 shrink-0 " +
                      (final.failed > 0
                        ? "text-amber-600"
                        : "text-emerald-600")
                    }
                  />
                  <div className="text-sm">
                    <p
                      className={
                        "font-semibold " +
                        (final.failed > 0
                          ? "text-amber-700"
                          : "text-emerald-700")
                      }
                    >
                      {final.failed > 0
                        ? `Imported ${final.success} of ${final.total} agencies`
                        : `Imported ${final.success} agencies successfully`}
                    </p>
                    {final.failed > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        {final.failed} row(s) failed — see errors below.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-emerald-50 px-2 py-1.5">
                  <p className="text-emerald-700 font-semibold">
                    {final.success}
                  </p>
                  <p className="text-[11px] text-emerald-600">Imported</p>
                </div>
                <div className="rounded-md bg-rose-50 px-2 py-1.5">
                  <p className="text-rose-700 font-semibold">{final.failed}</p>
                  <p className="text-[11px] text-rose-600">Failed</p>
                </div>
                <div className="rounded-md bg-gray-100 px-2 py-1.5">
                  <p className="text-gray-700 font-semibold">{final.total}</p>
                  <p className="text-[11px] text-gray-500">Total</p>
                </div>
              </div>

              {final.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border border-rose-100 bg-rose-50/50">
                  <ul className="divide-y divide-rose-100">
                    {final.errors.slice(0, 20).map((e, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 text-xs text-rose-700"
                      >
                        <span className="font-medium">
                          {e.agency || "Unknown agency"}
                        </span>
                        <span className="block text-rose-600 mt-0.5">
                          {e.error || "Unknown error"}
                        </span>
                      </li>
                    ))}
                    {final.errors.length > 20 && (
                      <li className="px-3 py-2 text-xs text-rose-700 italic">
                        +{final.errors.length - 20} more row(s) failed
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={importing}
          >
            {final || error ? "Close" : "Cancel"}
          </Button>
          {!final && !error && !importing && (
            <Button
              type="button"
              className="gap-2"
              onClick={handleChooseFile}
            >
              <Upload className="h-4 w-4" />
              Choose Excel file
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAgencyModal({
  open,
  onClose,
  onSuccess,
  agency,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agency: Agency;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [states, setStates] = React.useState<{ name: string; isoCode: string; stateCode: string }[]>([]);
  const [form, setForm] = React.useState<UpdateAgencyPayload>({});

  React.useEffect(() => {
    fetchStates();
  }, []);

  React.useEffect(() => {
    if (agency) {
      setForm({
        name: agency.name,
        type: agency.type,
        gstin: agency.gstin || "",
        contactPerson: agency.contactPerson || "",
        mobileNumber: agency.mobileNumber || "",
        email: agency.email || "",
        addressLine1: agency.addressLine1 || "",
        addressLine2: agency.addressLine2 || "",
        city: agency.city || "",
        state: agency.state || "",
        stateCode: agency.stateCode || "",
        pinCode: agency.pinCode || "",
      });
    }
  }, [agency, open]);

  const fetchStates = async () => {
    try {
      const response = await metaApi.getStates();
      if (response.success && response.data?.states) {
        setStates(response.data.states);
      }
    } catch (err) {
      console.error("Failed to fetch states", err);
    }
  };

  const handleStateChange = (stateName: string) => {
    const selectedState = states.find((s) => s.name === stateName);
    if (selectedState) {
      setForm({ ...form, state: stateName, stateCode: selectedState.stateCode });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) {
      addToast("Name and type are required", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmUpdate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await agencyApi.update(agency.id, form);
      if (response.success) {
        addToast("Agency updated successfully", "success");
        onSuccess();
      } else {
        addToast(response.message || "Failed to update agency", "error");
        setLoading(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update agency", "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Edit Agency
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Agency Name *</Label>
              <Input
                id="edit-name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Agency Type *</Label>
              <select
                id="edit-type"
                value={form.type || ""}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="VENDOR">Vendor</option>
                <option value="CLIENT">Client</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-gstin">GSTIN</Label>
              <Input
                id="edit-gstin"
                value={form.gstin || ""}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stateCode">State Code</Label>
              <Input
                id="edit-stateCode"
                value={form.stateCode || ""}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-contactPerson">Contact Person</Label>
              <Input
                id="edit-contactPerson"
                value={form.contactPerson || ""}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobileNumber">Mobile Number</Label>
              <Input
                id="edit-mobileNumber"
                value={form.mobileNumber || ""}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-addressLine1">Address Line 1</Label>
            <Input
              id="edit-addressLine1"
              value={form.addressLine1 || ""}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-addressLine2">Address Line 2</Label>
            <Input
              id="edit-addressLine2"
              value={form.addressLine2 || ""}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State</Label>
              <select
                id="edit-state"
                value={form.state || ""}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select state</option>
                {states.map((state) => (
                  <option key={state.isoCode} value={state.name}>{state.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pinCode">Pin Code</Label>
              <Input
                id="edit-pinCode"
                value={form.pinCode || ""}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
              />
            </div>
          </div>

          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="max-w-sm w-full mx-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Confirm Update</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to update agency <span className="font-semibold text-gray-900">{form.name}</span>?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                    <Button onClick={handleConfirmUpdate} loading={loading}>Yes, Update</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Update Agency</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewAgencyModal({
  open,
  onClose,
  agency,
}: {
  open: boolean;
  onClose: () => void;
  agency: Agency;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Agency Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Agency Name</p>
              <p className="font-medium text-gray-900">{agency.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Type</p>
              <Badge variant="outline" className="capitalize">
                {agencyTypeLabels[agency.type] || agency.type}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <Badge variant={agency.isActive ? "success" : "error"} className={agency.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {agency.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">State Code</p>
              <p className="text-sm text-gray-700">{agency.stateCode || "-"}</p>
            </div>
          </div>

          {agency.gstin && (
            <div>
              <p className="text-xs text-gray-500 uppercase">GSTIN</p>
              <p className="font-mono text-sm text-gray-700">{agency.gstin}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 uppercase">Contact Information</p>
            <div className="space-y-1 text-sm text-gray-700">
              {agency.contactPerson && <p>Contact: {agency.contactPerson}</p>}
              {agency.mobileNumber && <p>Phone: {agency.mobileNumber}</p>}
              {agency.email && <p>Email: {agency.email}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">Address</p>
            <p className="text-sm text-gray-700">
              {agency.addressLine1}
              {agency.addressLine2 && <>, {agency.addressLine2}</>}
              <br />
              {agency.city && agency.state && <>{agency.city}, {agency.state} {agency.pinCode}</>}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Assigned Branches ({agency.branches?.length || 0})</p>
            {agency.branches && agency.branches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agency.branches.map((b) => (
                  <Badge key={b.branchId} variant="secondary">
                    {b.branch?.name || b.branchId}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No branches assigned</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}