"use client";

import * as React from "react";
import { Building, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { branchApi, CreateBranchPayload } from "@/app/services/branch.service";
import { metaApi } from "@/app/services/meta.service";
import { useRouter } from "next/navigation";

export default function NewBranchPage() {
  const router = useRouter();
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
        addToast("Branch created successfully", "success");
        router.push("/branches");
      } else {
        addToast(response?.message || "Failed to create branch", "error");
        setLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to create branch";
      addToast(errorMsg, "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="gap-2 mb-4"
          onClick={() => router.push("/branches")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Branches
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Branch</h1>
        <p className="text-gray-500 mt-1">Create a new branch location for your organization</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-green-600" />
            Branch Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name *</Label>
                <Input id="name" value={form.name} onChange={handleNameChange} placeholder="e.g., Mumbai Branch" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Branch Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })}
                  className="font-mono uppercase"
                  placeholder="MUMBAI_BRANCH"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN *</Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="font-mono uppercase"
                  placeholder="27AABCU9603R1ZM"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stateCode">State Code</Label>
                <Input id="stateCode" value={form.stateCode} readOnly className="bg-gray-50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                placeholder="123 Main Street, Andheri West"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={form.addressLine2 || ""}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Optional address line"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Mumbai"
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
                  placeholder="400058"
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
                  placeholder="mumbai@example.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/branches")}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Branch
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
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
                <h3 className="text-lg font-semibold text-gray-900">Confirm Create Branch</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to create branch <span className="font-semibold text-gray-900">{form.name}</span>?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button onClick={handleConfirmCreate} loading={loading}>
                  Yes, Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}