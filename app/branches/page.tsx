"use client";

import * as React from "react";
import {
  Building,
  Plus,
  Search,
  Edit,
  Eye,
  MapPin,
  MoreHorizontal,
  Download,
  Landmark,
  } from "lucide-react";
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
import { branchApi, UpdateBranchPayload } from "@/app/services/branch.service";
import { bankApi, BankAccount, CreateBankAccountPayload, UpdateBankAccountPayload } from "@/app/services/bank.service";
import { metaApi } from "@/app/services/meta.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { downloadFile } from "@/lib/download";
import { Branch } from "@/app/types/branch";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

type TabKey = "branches" | "bankAccounts";

export default function BranchesPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("branches");

  return (
    <div className=" min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
        <p className="text-gray-500 mt-1">
          Manage company branches, locations, and bank accounts
        </p>
      </div>

      <div className="inline-flex h-9 items-center bg-gray-100 p-0.5 rounded-md text-gray-600 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("branches")}
          className={
            "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
            (activeTab === "branches"
              ? "bg-white text-gray-900 shadow-sm"
              : "hover:text-gray-900")
          }
        >
          <Building className="h-3.5 w-3.5" />
          Branches
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bankAccounts")}
          className={
            "h-8 px-3 text-sm font-medium rounded inline-flex items-center gap-1.5 " +
            (activeTab === "bankAccounts"
              ? "bg-white text-gray-900 shadow-sm"
              : "hover:text-gray-900")
          }
        >
          <Landmark className="h-3.5 w-3.5" />
          Bank Accounts
        </button>
      </div>

      {activeTab === "branches" ? <BranchesTab /> : <BankAccountsTab />}
      <ToastContainer />
    </div>
  );
}

function BranchesTab() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ total: number; totalPages: number; page: number; limit: number } | null>(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const { permissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(permissions, "BRANCH", "VIEW");
  const canWrite = hasModulePermission(permissions, "BRANCH", "WRITE");

  React.useEffect(() => {
    if (canView) {
      fetchBranches(currentPage, searchTerm);
    }
  }, [canView, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
    if (canView) {
      fetchBranches(1, searchTerm);
    }
  }, [searchTerm]);

  const fetchBranches = async (page: number = 1, search?: string) => {
    setLoading(true);
    try {
      const response = await branchApi.getAll({ page, limit: 10, search });
      let branchesData: Branch[] = [];
      if (Array.isArray(response.data)) {
        branchesData = response.data;
      } else if (response.data?.branches) {
        branchesData = response.data.branches;
      }
      setBranches(branchesData);
      if (response.data && typeof response.data === "object" && "pagination" in response.data) {
        setPagination((response.data as any).pagination);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load branches", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = React.useMemo(() => {
    return branches.filter((branch) => {
      const name = branch.name || "";
      const code = branch.code || "";
      const city = branch.city || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             code.toLowerCase().includes(searchTerm.toLowerCase()) ||
             city.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [branches, searchTerm]);

  const handleCreate = () => {
    router.push("/branches/new");
  };

  const handleEditSuccess = () => {
    window.location.reload();
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditModalOpen(true);
  };

  const handleView = (branch: Branch) => {
    setSelectedBranch(branch);
    setViewModalOpen(true);
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      const newStatus = branch.isActive ? false : true;
      const response = await branchApi.updateStatus(branch.id, newStatus);
      if (response.success) {
        addToast(`Branch ${newStatus ? "activated" : "deactivated"} successfully`, "success");
        fetchBranches(currentPage, searchTerm);
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
        `api/branches/all?${new URLSearchParams({
          export: "true",
          ...(searchTerm ? { search: searchTerm } : {}),
        }).toString()}`,
        "branches.xlsx"
      );
      addToast("Branches exported successfully", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export branches", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Branches</h2>
          <p className="text-sm text-gray-500">Manage branch information and status</p>
        </div>
        {canWrite && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
      ) : filteredBranches.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Building className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{branch.name}</p>
                            {(branch.addressLine1 || branch.city) && (
                              <p className="text-xs text-gray-500">{branch.addressLine1 || branch.city}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{branch.code}</code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {branch.city}, {branch.state}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{branch.phnNumber || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-600">{branch.gstin}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={branch.isActive ? "success" : "error"} className={branch.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {branch.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{branch.createdAt ? formatDate(branch.createdAt) : "-"}</span>
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
                              <DropdownMenuItem onClick={() => handleView(branch)}>
                                <Eye className="mr-2 h-4 w-4" />View
                              </DropdownMenuItem>
                            )}
                            {canWrite && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(branch)}>
                                  <Edit className="mr-2 h-4 w-4" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleStatus(branch)} className={branch.isActive ? "text-red-600" : "text-green-600"}>
                                  {branch.isActive ? "Deactivate" : "Activate"}
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
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No branches found</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add First Branch
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedBranch && (
        <EditBranchModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          branch={selectedBranch}
        />
      )}

      {selectedBranch && (
        <ViewBranchModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          branch={selectedBranch}
          onToggleStatus={() => fetchBranches(currentPage, searchTerm)}
        />
      )}
    </div>
  );
}

function EditBranchModal({
  open,
  onClose,
  onSuccess,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branch: Branch;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [states, setStates] = React.useState<{ name: string; isoCode: string; stateCode: string }[]>([]);
  const [form, setForm] = React.useState<UpdateBranchPayload>({});

  React.useEffect(() => {
    fetchStates();
  }, []);

  React.useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name || "",
        code: branch.code || "",
        gstin: branch.gstin || "",
        stateCode: branch.stateCode || "",
        addressLine1: branch.addressLine1 || "",
        addressLine2: branch.addressLine2 || "",
        city: branch.city || "",
        state: branch.state || "",
        pinCode: branch.pinCode || "",
        phnNumber: branch.phnNumber || "",
        email: branch.email || "",
      });
    }
  }, [branch, open]);

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

  const normalizeCode = (value: string) =>
    value.toUpperCase().replace(/\s+/g, "_").replace(/^[\s_]+|[\s_]+$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      addToast("Name and code are required", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmUpdate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await branchApi.update(branch.id, form);
      if (response.success && response.data?.branch) {
        addToast("Branch updated successfully", "success");
        onSuccess();
      } else {
        addToast(response.message || "Failed to update branch", "error");
        setLoading(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update branch", "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-green-600" />
            Edit Branch
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Branch Name *</Label>
              <Input id="edit-name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Branch Code *</Label>
              <Input id="edit-code" value={form.code || ""} onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })} className="font-mono uppercase" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-gstin">GSTIN *</Label>
              <Input id="edit-gstin" value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className="font-mono uppercase" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stateCode">State Code</Label>
              <Input id="edit-stateCode" value={form.stateCode || ""} readOnly className="bg-gray-50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-addressLine1">Address Line 1 *</Label>
            <Input id="edit-addressLine1" value={form.addressLine1 || ""} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-addressLine2">Address Line 2</Label>
            <Input id="edit-addressLine2" value={form.addressLine2 || ""} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City *</Label>
              <Input
                id="edit-city"
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Enter city name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State *</Label>
              <select
                id="edit-state"
                value={form.state || ""}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select state</option>
                {states.map((state) => (
                  <option key={state.isoCode} value={state.name}>{state.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pinCode">Pin Code *</Label>
              <Input
                id="edit-pinCode"
                value={form.pinCode || ""}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={form.phnNumber || ""}
                onChange={(e) => setForm({ ...form, phnNumber: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="branch@example.com"
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
                    Are you sure you want to update branch <span className="font-semibold text-gray-900">{form.name}</span>?
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
            <Button type="submit">Update Branch</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewBranchModal({
  open,
  onClose,
  branch,
  onToggleStatus,
}: {
  open: boolean;
  onClose: () => void;
  branch: Branch;
  onToggleStatus: () => void;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const newStatus = branch.isActive ? false : true;
      const response = await branchApi.updateStatus(branch.id, newStatus);
      if (response.success) {
        addToast(`Branch ${newStatus ? "activated" : "deactivated"} successfully`, "success");
        onToggleStatus();
        onClose();
      } else {
        addToast(response.message || "Failed to update status", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-green-600" />
            Branch Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Branch Name</p>
              <p className="font-medium text-gray-900">{branch.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Code</p>
              <p className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded inline-block">
                {branch.code?.slice(0, 10)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <Badge variant={branch.isActive ? "success" : "error"} className={branch.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {branch.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">State Code</p>
              <p className="text-sm text-gray-700">{branch.stateCode}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">GSTIN</p>
            <p className="font-mono text-sm text-gray-700">{branch.gstin}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase">Address</p>
            <p className="text-sm text-gray-700">
              {branch.addressLine1}
              {branch.addressLine2 && <>, {branch.addressLine2}</>}
              <br />
              {branch.city}, {branch.state} - {branch.pinCode}
            </p>
          </div>

          {(branch.phnNumber || branch.email) && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Contact Information</p>
              <div className="space-y-1 text-sm text-gray-700">
                {branch.phnNumber && <p>Phone: {branch.phnNumber}</p>}
                {branch.email && <p>Email: {branch.email}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                {branch.isActive ? "Deactivate this branch" : "Activate this branch"}
              </span>
            </div>
            <Switch
              checked={branch.isActive}
              onCheckedChange={handleToggleStatus}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// BANK ACCOUNTS TAB
// ============================================================================
//
// Manages bank accounts per branch. The user must pick a branch first,
// then can add / edit / toggle status of bank accounts under it. Account
// deletion is implemented via the backend's toggle-status endpoint
// (deactivate) since there is no hard-delete route.
// ============================================================================

function BankAccountsTab() {
  const { addToast } = useToast();
  const { permissions } = useAppSelector((state) => state.auth);
  const canWrite = hasModulePermission(permissions, "BRANCH", "WRITE");

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = React.useState(true);
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<BankAccount | null>(null);
  const [confirmToggle, setConfirmToggle] = React.useState<BankAccount | null>(null);
  const [toggling, setToggling] = React.useState(false);

  // Load active branches for the picker on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await branchApi.getActive();
        if (cancelled) return;
        if (res.success && res.data) {
          setBranches(res.data.branches || []);
        }
      } catch (err: any) {
        if (!cancelled) addToast(err?.message || "Failed to load branches", "error");
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const loadAccounts = React.useCallback(
    async (branchId: string, search?: string) => {
      if (!branchId) {
        setAccounts([]);
        return;
      }
      setAccountsLoading(true);
      try {
        const res = await bankApi.getAll({ branchId, search });
        if (res.success && res.data) {
          setAccounts(res.data);
        } else {
          setAccounts([]);
        }
      } catch (err: any) {
        addToast(err?.message || "Failed to load bank accounts", "error");
        setAccounts([]);
      } finally {
        setAccountsLoading(false);
      }
    },
    [addToast]
  );

  React.useEffect(() => {
    loadAccounts(selectedBranchId, searchTerm);
  }, [selectedBranchId, loadAccounts]);

  React.useEffect(() => {
    // Reset to page-1 behaviour: re-fetch on search.
    if (selectedBranchId) {
      loadAccounts(selectedBranchId, searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) || null;

  const openCreate = () => {
    if (!selectedBranchId) {
      addToast("Please select a branch first", "error");
      return;
    }
    setEditingAccount(null);
    setFormOpen(true);
  };

  const openEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditingAccount(null);
    loadAccounts(selectedBranchId, searchTerm);
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    try {
      const nextActive = !confirmToggle.isActive;
      const res = await bankApi.updateStatus(confirmToggle.id, nextActive);
      if (res.success) {
        addToast(
          `Bank account ${nextActive ? "activated" : "deactivated"} successfully`,
          "success"
        );
        loadAccounts(selectedBranchId, searchTerm);
      } else {
        addToast(res.message || "Failed to update status", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to update status", "error");
    } finally {
      setToggling(false);
      setConfirmToggle(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
          <p className="text-sm text-gray-500">
            Add and manage bank accounts for each branch
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="gap-2" disabled={!selectedBranchId}>
            <Plus className="h-4 w-4" />
            Add Bank Account
          </Button>
        )}
      </div>

      <div className="flex items-end gap-4 bg-white p-4 rounded-lg border border-gray-200 flex-wrap">
        <div className="space-y-1.5 shrink-0 max-w-[200px]">
          <Label htmlFor="bank-branch-picker">Branch</Label>
          <select
            id="bank-branch-picker"
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setSearchTerm("");
            }}
            className="flex h-9 w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            disabled={branchesLoading}
          >
            <option value="">
              {branchesLoading ? "Loading branches…" : "Select a branch"}
            </option>
            {branches.map((b) => (
              <option
                key={b.id}
                value={b.id}
                // Truncate long branch names to 10 characters + "…" so
                // the picker stays narrow and the search bar fits on
                // the same row without wrapping. The full name is
                // available as the option's `title` tooltip and is
                // also rendered in full inside the table body.
                title={b.name}
              >
                {(b.name?.length ?? 0) > 10
                  ? `${b.name.slice(0, 10)}…`
                  : b.name}{" "}
                ({b.code})
              </option>
            ))}
          </select>
        </div>

        {selectedBranchId && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by bank / account / IFSC…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {!selectedBranchId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Pick a branch to get started</p>
            <p className="text-sm text-gray-500 mt-1">
              Choose a branch above to view and manage its bank accounts.
            </p>
          </CardContent>
        </Card>
      ) : accountsLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Landmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No bank accounts yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add the first bank account for{" "}
              <span className="font-medium text-gray-700">
                {selectedBranch?.name}
              </span>
              .
            </p>
            {canWrite && (
              <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add Bank Account
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Bank</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Account No.</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">IFSC</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branch Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Landmark className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {acc.bankName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {acc.accountNumber}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <code className="font-mono text-xs text-gray-600">
                          {acc.ifscCode}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {acc.bankBranchName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={acc.isActive ? "success" : "error"}
                          className={
                            acc.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {acc.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openEdit(acc)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setConfirmToggle(acc)}
                                className={
                                  acc.isActive ? "text-red-600" : "text-green-600"
                                }
                              >
                                {acc.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {formOpen && selectedBranch && (
        <BankAccountFormModal
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingAccount(null);
          }}
          onSaved={handleSaved}
          branch={selectedBranch}
          editing={editingAccount}
        />
      )}

      {confirmToggle && (
        <Dialog open={!!confirmToggle} onOpenChange={(o) => !o && setConfirmToggle(null)}>
          <DialogContent className="max-w-sm" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-blue-600" />
                Confirm {confirmToggle.isActive ? "Deactivation" : "Activation"}
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Are you sure you want to{" "}
                {confirmToggle.isActive ? "deactivate" : "activate"} bank account{" "}
                <span className="font-semibold text-gray-900">
                  {confirmToggle.bankName} — {confirmToggle.accountNumber}
                </span>
                ?
              </p>
              {confirmToggle.isActive && (
                <p className="text-xs text-gray-500">
                  Deactivated accounts won't be selectable in the transaction
                  "Payment Through" dropdown.
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmToggle(null)}
                disabled={toggling}
              >
                Cancel
              </Button>
              <Button
                onClick={handleToggleStatus}
                loading={toggling}
                variant={confirmToggle.isActive ? "destructive" : "default"}
              >
                Yes, {confirmToggle.isActive ? "Deactivate" : "Activate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BankAccountFormModal({
  open,
  onClose,
  onSaved,
  branch,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  branch: Branch;
  editing: BankAccount | null;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState<
    CreateBankAccountPayload | UpdateBankAccountPayload
  >({});

  React.useEffect(() => {
    if (editing) {
      setForm({
        accountNumber: editing.accountNumber,
        ifscCode: editing.ifscCode,
        bankName: editing.bankName,
        bankBranchName: editing.bankBranchName,
      });
    } else {
      setForm({ accountNumber: "", ifscCode: "", bankName: "", bankBranchName: "" });
    }
  }, [editing, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = form as CreateBankAccountPayload;
    if (
      !payload.bankName ||
      !payload.accountNumber ||
      !payload.ifscCode ||
      !payload.bankBranchName
    ) {
      addToast("Bank name, account number, IFSC and branch name are required", "error");
      return;
    }
    setLoading(true);
    try {
      const res = editing
        ? await bankApi.update(editing.id, form)
        : await bankApi.create({ ...payload, branchId: branch.id });
      if (res.success) {
        addToast(
          editing ? "Bank account updated successfully" : "Bank account created successfully",
          "success"
        );
        onSaved();
      } else {
        addToast(res.message || "Failed to save bank account", "error");
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to save bank account", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-600" />
            {editing ? "Edit Bank Account" : "Add Bank Account"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
            Branch:{" "}
            <span className="font-semibold">
              {branch.name} ({branch.code})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Bank Name *</Label>
              <Input
                id="bank-name"
                value={(form as any).bankName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, bankName: e.target.value })
                }
                placeholder="e.g. HDFC Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-branch-name">Bank Branch *</Label>
              <Input
                id="bank-branch-name"
                value={(form as any).bankBranchName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, bankBranchName: e.target.value })
                }
                placeholder="e.g. Andheri West"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank-account-no">Account Number *</Label>
              <Input
                id="bank-account-no"
                value={(form as any).accountNumber ?? ""}
                onChange={(e) =>
                  setForm({ ...form, accountNumber: e.target.value.trim() })
                }
                placeholder="e.g. 50100123456789"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-ifsc">IFSC Code *</Label>
              <Input
                id="bank-ifsc"
                value={(form as any).ifscCode ?? ""}
                onChange={(e) =>
                  setForm({ ...form, ifscCode: e.target.value.toUpperCase() })
                }
                placeholder="e.g. HDFC0000123"
                className="font-mono uppercase"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "Update Bank Account" : "Create Bank Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}