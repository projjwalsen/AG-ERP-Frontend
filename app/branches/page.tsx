"use client";

import * as React from "react";
import { Building, Plus, Search, Edit, Eye, MapPin } from "lucide-react";
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
import { useToast, ToastContainer } from "@/components/ui/toast";
import { branchApi, CreateBranchPayload, UpdateBranchPayload } from "@/app/services/branch.service";
import { Branch } from "@/app/types/branch";

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
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);

  React.useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await branchApi.getAll();
      if (response.success && response.data?.branches) {
        setBranches(response.data.branches);
      } else {
        addToast(response.message || "Failed to load branches", "error");
      }
    } catch {
      addToast("Failed to load branches", "error");
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

  const handleCreateSuccess = (branch: Branch) => {
    setBranches((prev) => [...prev, branch]);
    setCreateModalOpen(false);
  };

  const handleEditSuccess = (branch: Branch) => {
    setBranches((prev) => prev.map((b) => (b.id === branch.id ? branch : b)));
    setEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Branches</h2>
          <p className="text-sm text-gray-500">Manage branch information and status</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Branch
        </Button>
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

      {/* Branches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBranches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((branch) => (
            <Card key={branch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Building className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{branch.name}</h3>
                      <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{branch.code}</code>
                    </div>
                  </div>
                  <Badge variant={branch.isActive ? "success" : "error"} className={branch.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {branch.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span>{branch.city}, {branch.state}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    GSTIN: <span className="font-mono">{branch.gstin}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleView(branch)}>
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEdit(branch)}>
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
          onToggleStatus={fetchBranches}
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
  });

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
      });
    }
  }, [open]);

  const normalizeCode = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

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
    setLoading(true);
    try {
      const response = await branchApi.create(form);
      if (response.success && response.data?.branch) {
        addToast("Branch created successfully", "success");
        onSuccess(response.data.branch);
        onClose();
      } else {
        addToast(response.message || "Failed to create branch", "error");
      }
    } catch {
      addToast("Failed to create branch", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
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
              <Input id="name" placeholder="Kolkata Depot" value={form.name} onChange={handleNameChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Branch Code *</Label>
              <Input id="code" placeholder="KOL_DEPOT" value={form.code} onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })} className="font-mono uppercase" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN *</Label>
              <Input id="gstin" placeholder="19ABCDE1234F1Z5" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className="font-mono uppercase" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stateCode">State Code *</Label>
              <Input id="stateCode" placeholder="19" value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input id="addressLine1" placeholder="Main Road" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input id="addressLine2" placeholder="Near Industrial Area" value={form.addressLine2 || ""} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" placeholder="Kolkata" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input id="state" placeholder="West Bengal" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode">Pin Code *</Label>
              <Input id="pinCode" placeholder="700001" value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} required />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Branch</Button>
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
  const [form, setForm] = React.useState<UpdateBranchPayload>({});

  React.useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name,
        code: branch.code,
        gstin: branch.gstin,
        stateCode: branch.stateCode,
        addressLine1: branch.addressLine1,
        addressLine2: branch.addressLine2 || "",
        city: branch.city,
        state: branch.state,
        pinCode: branch.pinCode,
      });
    }
  }, [branch, open]);

  const normalizeCode = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      addToast("Name and code are required", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await branchApi.update(branch.id, form);
      if (response.success && response.data?.branch) {
        addToast("Branch updated successfully", "success");
        onSuccess(response.data.branch);
        onClose();
      } else {
        addToast(response.message || "Failed to update branch", "error");
      }
    } catch {
      addToast("Failed to update branch", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
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
              <Label htmlFor="edit-stateCode">State Code *</Label>
              <Input id="edit-stateCode" value={form.stateCode || ""} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} required />
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
              <Input id="edit-city" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State *</Label>
              <Input id="edit-state" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pinCode">Pin Code *</Label>
              <Input id="edit-pinCode" value={form.pinCode || ""} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} required />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Update Branch</Button>
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
      const response = await branchApi.updateStatus(branch.id, !branch.isActive);
      if (response.success) {
        addToast(`Branch ${!branch.isActive ? "activated" : "deactivated"} successfully`, "success");
        onToggleStatus();
        onClose();
      } else {
        addToast(response.message || "Failed to update status", "error");
      }
    } catch {
      addToast("Failed to update status", "error");
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