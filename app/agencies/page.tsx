"use client";

import * as React from "react";
import { Briefcase, Plus, Search, Edit, Eye, MapPin, MoreHorizontal, Building2, Phone, Mail } from "lucide-react";
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
import { agencyApi, CreateAgencyPayload, UpdateAgencyPayload } from "@/app/services/agency.service";
import { branchApi } from "@/app/services/branch.service";
import { Agency } from "@/app/types/agency";
import { Branch } from "@/app/types/branch";
import { formatDate } from "@/lib/utils";

const agencyTypeLabels: Record<string, string> = {
  VENDOR: "Vendor",
  CLIENT: "Client",
  BOTH: "Both",
};

export default function AgenciesPage() {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Page Header */}
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

// ============== AGENCIES TAB ==============
function AgenciesTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [selectedAgency, setSelectedAgency] = React.useState<Agency | null>(null);

  React.useEffect(() => {
    fetchAgencies();
    fetchBranches();
  }, []);

  // Listen for branch changes from other pages and refresh local branch list
  React.useEffect(() => {
    const handler = () => fetchBranches();
    try {
      window.addEventListener("branches:changed", handler as EventListener);
    } catch (e) {
      // noop for non-window environments
    }
    return () => {
      try {
        window.removeEventListener("branches:changed", handler as EventListener);
      } catch (e) {}
    };
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await branchApi.getAll();
      const branchesData = Array.isArray(response.data)
        ? response.data
        : response.data?.branches ?? [];
      setBranches(branchesData);
    } catch {
      console.error("Failed to fetch branches");
    }
  };

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const params: { search?: string; type?: string; branch?: string } = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedType) params.type = selectedType;

      const response = await agencyApi.getAll(
        Object.keys(params).length > 0 ? params as any : undefined
      );

      const agenciesData = response.data?.agencies ?? [];
      setAgencies(agenciesData);
    } catch {
      addToast("Failed to load agencies", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAgencies();
  }, [searchTerm, selectedType]);

  const filteredAgencies = React.useMemo(() => {
    return agencies.filter((agency) => {
      const name = agency.name || "";
      const gstin = agency.gstin || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             gstin.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [agencies, searchTerm]);

  const handleCreate = () => {
    setSelectedAgency(null);
    setCreateModalOpen(true);
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
        addToast(`Agency ${!agency.isActive ? "activated" : "deactivated"} successfully`, "success");
        fetchAgencies();
      } else {
        addToast(response.message || "Failed to update status", "error");
      }
    } catch {
      addToast("Failed to update status", "error");
    }
  };

  const handleCreateSuccess = (agency: Agency) => {
    setAgencies((prev) => [...prev, agency]);
    setCreateModalOpen(false);
  };

  const handleEditSuccess = (agency: Agency) => {
    setAgencies((prev) => prev.map((a) => (a.id === agency.id ? agency : a)));
    setEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All Agencies</h2>
          <p className="text-sm text-gray-500">Manage agency information and status</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Agency
        </Button>
      </div>

      {/* Filters */}
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
      </div>

      {/* Agencies Table */}
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branches</th>
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
                        <span className="text-sm text-gray-500">
                          {agency.branches?.length || 0} branches
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleView(agency)}>
                              <Eye className="mr-2 h-4 w-4" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(agency)}>
                              <Edit className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(agency)} className={agency.isActive ? "text-red-600" : "text-green-600"}>
                              {agency.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Create Agency Modal */}
      <CreateAgencyModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        branches={branches}
      />

      {/* Edit Agency Modal */}
      {selectedAgency && (
        <EditAgencyModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          agency={selectedAgency}
          branches={branches}
        />
      )}

      {/* View Agency Modal */}
      {selectedAgency && (
        <ViewAgencyModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          agency={selectedAgency}
        />
      )}
    </div>
  );
}

// ============== CREATE AGENCY MODAL ==============
function CreateAgencyModal({
  open,
  onClose,
  onSuccess,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (agency: Agency) => void;
  branches: Branch[];
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState<CreateAgencyPayload>({
    name: "",
    type: "VENDOR",
    gstin: "",
    contactPerson: "",
    mobileNumber: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    stateCode: "",
    pinCode: "",
    branches: [],
  });
  const [selectedBranches, setSelectedBranches] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setForm({
        name: "",
        type: "VENDOR",
        gstin: "",
        contactPerson: "",
        mobileNumber: "",
        email: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        stateCode: "",
        pinCode: "",
        branches: [],
      });
      setSelectedBranches([]);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) {
      addToast("Name and type are required", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateAgencyPayload = {
        ...form,
        branches: selectedBranches.map((branchId) => ({ branchId })),
      };
      const response = await agencyApi.create(payload);
      if (response && response.success) {
        const possible = response.data ?? (response as any).agency ?? (response as any).data?.agency;
        const newAgency = (possible && (possible.agency ?? possible)) || null;
        if (newAgency && typeof newAgency === "object") {
          addToast("Agency created successfully", "success");
          onSuccess(newAgency as Agency);
          onClose();
        } else {
          addToast(response.message || "Agency created but response shape was unexpected", "error");
        }
      } else {
        addToast(response?.message || "Failed to create agency", "error");
      }
    } catch {
      addToast("Failed to create agency", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Add New Agency
          </DialogTitle>
          <DialogDescription>
            Create a new agency (vendor/client).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agency Name *</Label>
              <Input
                id="name"
                placeholder="ABC Petrochem"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Agency Type *</Label>
              <select
                id="type"
                value={form.type}
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
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                placeholder="19ABCDE1234F1Z5"
                value={form.gstin || ""}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stateCode">State Code</Label>
              <Input
                id="stateCode"
                placeholder="19"
                value={form.stateCode || ""}
                onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                placeholder="Raj Sharma"
                value={form.contactPerson || ""}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                placeholder="9876543210"
                value={form.mobileNumber || ""}
                onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="agency@example.com"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              placeholder="Park Street"
              value={form.addressLine1 || ""}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              placeholder="Near Petrol Pump"
              value={form.addressLine2 || ""}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Kolkata"
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="West Bengal"
                value={form.state || ""}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode">Pin Code</Label>
              <Input
                id="pinCode"
                placeholder="700001"
                value={form.pinCode || ""}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign Branches ({selectedBranches.length} selected)</Label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {branches.length === 0 ? (
                <p className="text-sm text-gray-500">No branches available</p>
              ) : (
                branches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch.id)}
                      onChange={() => toggleBranch(branch.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{branch.name}</span>
                    <span className="text-xs text-gray-400">({branch.code})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Agency</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== EDIT AGENCY MODAL ==============
function EditAgencyModal({
  open,
  onClose,
  onSuccess,
  agency,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (agency: Agency) => void;
  agency: Agency;
  branches: Branch[];
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState<UpdateAgencyPayload>({});
  const [selectedBranches, setSelectedBranches] = React.useState<string[]>([]);

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
      setSelectedBranches(agency.branches?.map((b) => b.branchId) || []);
    }
  }, [agency, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) {
      addToast("Name and type are required", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: UpdateAgencyPayload = {
        ...form,
        branches: selectedBranches.map((branchId) => ({ branchId })),
      };
      const response = await agencyApi.update(agency.id, payload);
      if (response && response.success) {
        const possible = response.data ?? (response as any).agency ?? (response as any).data?.agency;
        const updatedAgency = (possible && (possible.agency ?? possible)) || null;
        if (updatedAgency && typeof updatedAgency === "object") {
          addToast("Agency updated successfully", "success");
          onSuccess(updatedAgency as Agency);
          onClose();
        } else {
          addToast(response.message || "Agency updated but response shape was unexpected", "error");
        }
      } else {
        addToast(response?.message || "Failed to update agency", "error");
      }
    } catch {
      addToast("Failed to update agency", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Edit Agency
          </DialogTitle>
          <DialogDescription>
            Update agency information.
          </DialogDescription>
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
                onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
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
              <Input
                id="edit-state"
                value={form.state || ""}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
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

          <div className="space-y-2">
            <Label>Assign Branches ({selectedBranches.length} selected)</Label>
            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {branches.length === 0 ? (
                <p className="text-sm text-gray-500">No branches available</p>
              ) : (
                branches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch.id)}
                      onChange={() => toggleBranch(branch.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{branch.name}</span>
                    <span className="text-xs text-gray-400">({branch.code})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Update Agency</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== VIEW AGENCY MODAL ==============
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