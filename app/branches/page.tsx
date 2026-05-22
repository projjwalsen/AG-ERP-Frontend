"use client";

import * as React from "react";
import { Building, Plus, Search, Edit, Eye, MapPin, MoreHorizontal } from "lucide-react";
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
  DialogDescription,
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
import { branchApi, CreateBranchPayload, UpdateBranchPayload } from "@/app/services/branch.service";
import { metaApi } from "@/app/services/meta.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { Branch } from "@/app/types/branch";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export default function BranchesPage() {
  return (
    <div className=" min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
        <p className="text-gray-500 mt-1">
          Manage company branches and locations
        </p>
      </div>

      <BranchesTab />
      <ToastContainer />
    </div>
  );
}

// ============== BRANCHES TAB ==============
function BranchesTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<{ total: number; totalPages: number; page: number; limit: number } | null>(null);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
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
      // Handle both array response and object with branches property
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
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load branches";
      addToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = pagination?.totalPages || 1;
  const totalEntries = pagination?.total || 0;

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
    setSelectedBranch(null);
    setCreateModalOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditModalOpen(true);
  };

  const handleView = (branch: Branch) => {
    setSelectedBranch(branch);
    setViewModalOpen(true);
  };

  const handleCreateSuccess = (_branch: Branch) => {
    // Close modal
    setCreateModalOpen(false);
    // Force refresh the whole page to get latest data
    window.location.reload();
  };

  const handleEditSuccess = (_branch: Branch) => {
    // Close modal
    setEditModalOpen(false);
    // Force refresh the whole page to get latest data
    window.location.reload();
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
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to update status";
      addToast(errorMsg, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Search */}
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
      </div>

      {/* Branches Table */}
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
            {/* Pagination */}
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

      {/* Create Branch Modal */}
      <CreateBranchModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Branch Modal */}
      {selectedBranch && (
        <EditBranchModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          branch={selectedBranch}
        />
      )}

      {/* View Branch Modal */}
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

// ============== CREATE BRANCH MODAL ==============
function CreateBranchModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (branch: Branch) => void;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [states, setStates] = React.useState<{ name: string; isoCode: string; stateCode: string }[]>([]);
  const [form, setForm] = React.useState<CreateBranchPayload>({
    name: "",
    code: "",
    gstin: "",
    stateCode: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    phnNumber: "",
    email: "",
  });

  React.useEffect(() => {
    fetchStates();
  }, []);

  React.useEffect(() => {
    if (open) {
      setForm({
        name: "",
        code: "",
        gstin: "",
        stateCode: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pinCode: "",
        phnNumber: "",
        email: "",
      });
    }
  }, [open]);

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm({ ...form, name, code: normalizeCode(name) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.gstin || !form.stateCode || !form.addressLine1 || !form.city || !form.state || !form.pinCode) {
      addToast("Please fill all required fields", "error");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await branchApi.create(form);
      if (response && response.success) {
        const possible = response.data ?? (response as any).branch ?? (response as any).data?.branch;
        const newBranch = (possible && (possible.branch ?? possible)) || null;
        if (newBranch && typeof newBranch === "object") {
          onSuccess(newBranch as Branch);
        } else {
          addToast(response.message || "Branch created but response shape was unexpected", "error");
          setLoading(false);
        }
      } else {
        addToast(response?.message || "Failed to create branch", "error");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Create branch error:", err);
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to create branch";
      addToast(errorMsg, "error");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-green-600" />
            Add New Branch
          </DialogTitle>
          <DialogDescription>
            Create a new branch location for your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name *</Label>
              <Input id="name" value={form.name} onChange={handleNameChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Branch Code *</Label>
              <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })} className="font-mono uppercase" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN *</Label>
              <Input id="gstin" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className="font-mono uppercase" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stateCode">State Code</Label>
              <Input id="stateCode" value={form.stateCode} readOnly className="bg-gray-50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input id="addressLine1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input id="addressLine2" value={form.addressLine2 || ""} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Enter city name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <select
                id="state"
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
              <Label htmlFor="pinCode">Pin Code *</Label>
              <Input
                id="pinCode"
                value={form.pinCode}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={form.phnNumber || ""}
                onChange={(e) => setForm({ ...form, phnNumber: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="branch@example.com"
              />
            </div>
          </div>

          {/* Confirmation Dialog */}
          {showConfirm && (
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Create Branch
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to create branch <span className="font-semibold text-gray-900">{form.name}</span>?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                  <Button type="button" onClick={handleConfirmCreate} loading={loading}>
                    Yes, Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={() => setShowConfirm(true)}>Create Branch</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== EDIT BRANCH MODAL ==============
function EditBranchModal({
  open,
  onClose,
  onSuccess,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (branch: Branch) => void;
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
        onSuccess(response.data!.branch);
      } else {
        addToast(response.message || "Failed to update branch", "error");
        setLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to update branch";
      addToast(errorMsg, "error");
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
          <DialogDescription>
            Update branch information.
          </DialogDescription>
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

          {/* Confirmation Dialog */}
          {showConfirm && (
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Update Branch
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to update branch <span className="font-semibold text-gray-900">{form.name}</span>?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                  <Button type="button" onClick={handleConfirmUpdate} loading={loading}>
                    Yes, Update
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

// ============== VIEW BRANCH MODAL ==============
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
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to update status";
      addToast(errorMsg, "error");
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
              <p className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded inline-block">{branch.code}</p>
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