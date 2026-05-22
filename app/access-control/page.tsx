"use client";

import * as React from "react";
import {
  Shield, Key, Users, Plus, Search, Edit,
  AlertTriangle, UserCog, Check
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { useAppSelector } from "@/app/store/hooks";
import { rbacApi } from "@/app/services/rbac.service";
import { UserService } from "@/app/services/user.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { Role, Permission } from "@/app/types/rbac";

// User type for assignment
interface UserBasic {
  id: string;
  name: string;
  email: string;
  roles?: { id: string; name: string; code: string }[];
}

export default function AccessControlPage() {
  const [activeTab, setActiveTab] = React.useState<"roles" | "users">("roles");

  return (
    <div className=" min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
        <p className="text-gray-500 mt-1">
          Manage roles, permissions, and user access levels
        </p>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "roles" ? "default" : "outline"}
          onClick={() => setActiveTab("roles")}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          Roles & Permissions
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
          className="gap-2"
        >
          <UserCog className="h-4 w-4" />
          Assign Users to Roles
        </Button>
      </div>

      {activeTab === "roles" ? <RolesAndPermissionsTab /> : <UserRolesTab />}
      <ToastContainer />
    </div>
  );
}

// ============== ROLES & PERMISSIONS TAB ==============
function RolesAndPermissionsTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [rawRolesResponse, setRawRolesResponse] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [upsertModalOpen, setUpsertModalOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [assignPermissionsOpen, setAssignPermissionsOpen] = React.useState(false);
  const [viewRoleModalOpen, setViewRoleModalOpen] = React.useState(false);
  const { permissions: userPermissions } = useAppSelector((state) => state.auth);

  const canView = hasModulePermission(userPermissions, "ROLE", "VIEW");
  const canWrite = hasModulePermission(userPermissions, "ROLE", "WRITE");

  React.useEffect(() => {
    if (canView) {
      fetchData();
    }
  }, [canView]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch roles and permissions separately to avoid one failing the other
    let rolesData: any[] = [];
    let permsData: any[] = [];

    try {
      const rolesResponse = await rbacApi.getRoles();
      setRawRolesResponse(rolesResponse);
      const rolesResp = rolesResponse as any;
      rolesData = rolesResp?.data?.roles ?? [];
    } catch (e) {
      console.error("Failed to fetch roles:", e);
    }

    try {
      const permissionsResponse = await rbacApi.getPermissions();
      const permsResp = permissionsResponse as any;
      permsData = permsResp?.data?.permissions ?? [];
    } catch (e) {
      console.error("Failed to fetch permissions:", e);
    }

    console.log("Extracted rolesData:", rolesData);
    console.log("Extracted permsData:", permsData);
    addToast(`Found ${rolesData.length} roles, ${permsData.length} permissions`, "success");

    setRoles(rolesData);
    setPermissions(permsData);
    setLoading(false);
  };

  const filteredRoles = React.useMemo(() => {
    return roles.filter((role) => {
      const name = role.name || "";
      const code = role.code || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             code.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [roles, searchTerm]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setUpsertModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setUpsertModalOpen(true);
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setAssignPermissionsOpen(true);
  };

  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setViewRoleModalOpen(true);
  };

  const handleRoleUpsertSuccess = (role: Role) => {
    if (selectedRole) {
      setRoles((prev) => prev.map((r) => (r.id === role.id ? role : r)));
    } else {
      setRoles((prev) => [...prev, role]);
    }
    setUpsertModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
          <p className="text-sm text-gray-500">Create roles and assign permissions</p>
        </div>
        {canWrite && (
          <Button onClick={handleCreateRole} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    </tr>
                  ))
                ) : filteredRoles.length > 0 ? (
                  filteredRoles.map((role) => (
                    <React.Fragment key={role.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <button onClick={() => handleViewRole(role)} className="font-medium text-gray-900 text-left hover:text-green-600">
                              {role.name}
                            </button>
                          </div>
                        </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{role.code}</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={role.isDefault ? "secondary" : "outline"}>
                          {role.isDefault ? "Default" : "Custom"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={role.isActive ? "default" : "secondary"} className={role.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{role.permissions?.length || 0} permissions</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canWrite && !role.isDefault && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRole(role)}
                                className="h-8 px-2"
                                title="Edit Role"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleManagePermissions(role)}
                                className="h-8 px-2"
                                title="Manage Permissions"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                    <>
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No roles found
                        </td>
                      </tr>

                      {rawRolesResponse && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-gray-50">
                            <div className="text-xs text-gray-600">
                              <div className="font-medium mb-2">Debug: /api/rbac/roles/all response</div>
                              <pre className="whitespace-pre-wrap max-h-48 overflow-auto">{JSON.stringify(rawRolesResponse, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Upsert Modal */}
      <RoleUpsertModal
        open={upsertModalOpen}
        onClose={() => setUpsertModalOpen(false)}
        onSuccess={handleRoleUpsertSuccess}
        role={selectedRole}
      />

      {/* Assign Permissions Modal */}
      {selectedRole && (
        <AssignPermissionsModal
          open={assignPermissionsOpen}
          onClose={() => setAssignPermissionsOpen(false)}
          onSuccess={fetchData}
          role={selectedRole}
          allPermissions={permissions}
        />
      )}

      {/* View Role Modal */}
      {selectedRole && (
        <ViewRoleModal
          open={viewRoleModalOpen}
          onClose={() => setViewRoleModalOpen(false)}
          role={selectedRole}
        />
      )}
    </div>
  );
}

// ============== ROLE UPSERT MODAL ==============
function RoleUpsertModal({
  open,
  onClose,
  onSuccess,
  role,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (role: Role) => void;
  role: Role | null;
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", code: "", description: "", isActive: true });

  React.useEffect(() => {
    if (role) {
      setForm({ name: role.name, code: role.code, description: role.description || "", isActive: role.isActive });
    } else {
      setForm({ name: "", code: "", description: "", isActive: true });
    }
  }, [role, open]);

  const normalizeCode = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!role) {
      setForm({ ...form, name, code: normalizeCode(name) });
    } else {
      setForm({ ...form, name });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      addToast("Name and code are required", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await rbacApi.upsertRole({
        ...(role?.id && { id: role.id }),
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        isActive: form.isActive,
      });
      if (response.success && response.data) {
        addToast(response.message || (role ? "Role updated" : "Role created"), "success");
        onSuccess(response.data);
        onClose();
      } else {
        addToast(response.message || "Failed to save role", "error");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to save role";
      addToast(errorMsg, "error");
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            {role ? "Edit Role" : "Add New Role"}
          </DialogTitle>
          <DialogDescription>
            Create a new role and then assign permissions to it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name</Label>
            <Input id="name" placeholder="Branch Manager" value={form.name} onChange={handleNameChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Role Code</Label>
            <Input id="code" placeholder="BRANCH_MANAGER" value={form.code} onChange={(e) => setForm({ ...form, code: normalizeCode(e.target.value) })} className="font-mono uppercase" required />
            <p className="text-xs text-gray-500">Role code is used internally for access control.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Manages branch operations" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="isActive" className="cursor-pointer">Active Status</Label>
              <p className="text-xs text-gray-500">Inactive roles cannot be assigned</p>
            </div>
            <Switch id="isActive" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{role ? "Update Role" : "Add Role"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== ASSIGN PERMISSIONS MODAL (Matrix Layout) ==============
function AssignPermissionsModal({
  open,
  onClose,
  onSuccess,
  role,
  allPermissions,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: Role;
  allPermissions: Permission[];
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Get current permission IDs from role
  React.useEffect(() => {
    if (role.permissions && role.permissions.length > 0) {
      setSelectedIds(new Set(role.permissions.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [role, open]);

  // Group permissions by module
  const groupedPermissions = React.useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    allPermissions.forEach((perm) => {
      if (!groups[perm.module]) groups[perm.module] = [];
      groups[perm.module].push(perm);
    });
    return groups;
  }, [allPermissions]);

  // Get unique actions across all permissions
  const uniqueActions = React.useMemo(() => {
    const actions = new Set<string>();
    allPermissions.forEach((p) => actions.add(p.action));
    return Array.from(actions).sort();
  }, [allPermissions]);

  // Get unique modules
  const modules = React.useMemo(() => {
    return Object.keys(groupedPermissions).sort();
  }, [groupedPermissions]);

  const togglePermission = (permissionId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(permissionId) ? newSet.delete(permissionId) : newSet.add(permissionId);
      return newSet;
    });
  };

  const toggleModuleAction = (module: string, action: string) => {
    const perm = allPermissions.find((p) => p.module === module && p.action === action);
    if (perm) {
      togglePermission(perm.id);
    }
  };

  const isModuleActionSelected = (module: string, action: string) => {
    const perm = allPermissions.find((p) => p.module === module && p.action === action);
    return perm ? selectedIds.has(perm.id) : false;
  };

  const selectAllInModule = (module: string) => {
    const modulePermissions = groupedPermissions[module] || [];
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      modulePermissions.forEach((p) => newSet.add(p.id));
      return newSet;
    });
  };

  const clearModule = (module: string) => {
    const modulePermissions = groupedPermissions[module] || [];
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      modulePermissions.forEach((p) => newSet.delete(p.id));
      return newSet;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await rbacApi.assignPermissionsToRole(role.id, Array.from(selectedIds));
      if (response.success) {
        addToast("Permissions assigned successfully", "success");
        onSuccess();
        onClose();
      } else {
        addToast(response.message || "Failed to assign permissions", "error");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to assign permissions";
      addToast(errorMsg, "error");
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-green-600" />
            Assign Permissions
          </DialogTitle>
          <DialogDescription>
            Select permissions for role: <span className="font-medium text-gray-900">{role.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">{selectedIds.size} selected</Badge>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            allPermissions.forEach((p) => setSelectedIds((prev) => new Set(prev).add(p.id)));
          }}>
            Select All
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1">
            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase border border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                      Module
                    </th>
                    {uniqueActions.map((action) => (
                      <th key={action} className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase border border-gray-200 min-w-[100px]">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border border-gray-200 sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{module} Management</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => selectAllInModule(module)}
                            >
                              All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => clearModule(module)}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      </td>
                      {uniqueActions.map((action) => (
                        <td key={action} className="text-center px-4 py-3 border border-gray-200">
                          <Checkbox
                            checked={isModuleActionSelected(module, action)}
                            onCheckedChange={() => toggleModuleAction(module, action)}
                            className="mx-auto"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {modules.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No permissions available. Create permissions first.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4 shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Save Permissions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== VIEW ROLE MODAL ==============
function ViewRoleModal({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Role Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Role Name</p>
              <p className="font-medium text-gray-900">{role.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Code</p>
              <p className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded inline-block">{role.code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Type</p>
              <Badge variant={role.isDefault ? "secondary" : "outline"}>
                {role.isDefault ? "Default" : "Custom"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Status</p>
              <Badge variant={role.isActive ? "default" : "secondary"} className={role.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
                {role.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {role.description && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Description</p>
              <p className="text-sm text-gray-700">{role.description}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Assigned Permissions ({role.permissions?.length || 0})</p>
            {role.permissions && role.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {role.permissions.map((p) => (
                  <Badge key={p.id} variant="secondary" className="px-2 py-1 text-sm">
                    {p.key || `${p.module} Management - ${p.action}`}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-500">No permissions assigned</span>
              </div>
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

// ============== USER ROLES TAB ==============
function UserRolesTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState<UserBasic[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<string>("");
  const [selectedUserName, setSelectedUserName] = React.useState("");
  const [userRoles, setUserRoles] = React.useState<string[]>([]);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        UserService.getAllUsers(),
        rbacApi.getRoles(),
      ]);

      if (usersResponse.success && usersResponse.data?.users) {
        setUsers(usersResponse.data.users);
      }
      if (rolesResponse.success && rolesResponse.data?.roles) {
        setRoles(rolesResponse.data.roles);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load data";
      addToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: UserBasic) => {
    setSelectedUser(user.id);
    setSelectedUserName(user.name);
    // Use roles from the initial user data
    setUserRoles((user.roles || []).map(r => r.id));
  };

  const handleAssignRoles = () => {
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    // Refresh the users data to get updated roles
    fetchData();
    setAssignModalOpen(false);
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter(
      (u) => (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const getUserRolesList = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.roles && user.roles.length > 0) {
      return user.roles.map(r => roles.find(role => role.id === r.id)).filter(Boolean) as Role[];
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Assign Users to Roles</h2>
        <p className="text-sm text-gray-500">Select a user and assign them to specific roles</p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Roles</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser === user.id;
                    const assignedRoles = getUserRolesList(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50 cursor-pointer ${isSelected ? "bg-green-50" : ""}`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center bg-gray-100 rounded-full">
                              <Users className="h-5 w-5 text-gray-500" />
                            </div>
                            <span className="font-medium text-gray-900">{user.name}</span>
                            {isSelected && (
                              <div className="flex h-5 w-5 items-center justify-center bg-green-500 rounded-full">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{user.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {assignedRoles.length > 0 ? (
                              assignedRoles.map((role) => (
                                <Badge key={role.id} variant="secondary" className="text-xs">
                                  {role.name}
                                </Badge>
                              ))
                            ) : isSelected ? (
                              <span className="text-sm text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                No roles
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserSelect(user);
                              handleAssignRoles();
                            }}
                            className="h-7 gap-1"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Assign
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Role Display */}
      {selectedUser && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-gray-900">{selectedUserName}</h3>
                <p className="text-sm text-gray-500">Assigned roles</p>
              </div>
              <Button onClick={handleAssignRoles} className="gap-2">
                <Edit className="h-4 w-4" />
                Assign Roles
              </Button>
            </div>

            {userRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {userRoles.map((roleId) => {
                  const role = roles.find((r) => r.id === roleId);
                  return role ? (
                    <Badge key={role.id} variant="secondary" className="px-3 py-1 text-sm">
                      {role.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">This user has no roles assigned</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign Roles Modal */}
      <AssignUserRolesModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={handleAssignSuccess}
        userId={selectedUser}
        userName={selectedUserName}
        allRoles={roles}
        currentRoleIds={userRoles}
      />
    </div>
  );
}

// ============== ASSIGN USER ROLES MODAL ==============
function AssignUserRolesModal({
  open,
  onClose,
  onSuccess,
  userId,
  userName,
  allRoles,
  currentRoleIds,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userName: string;
  allRoles: Role[];
  currentRoleIds: string[];
}) {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set(currentRoleIds));

  React.useEffect(() => {
    setSelectedIds(new Set(currentRoleIds));
  }, [currentRoleIds, open]);

  const toggleRole = (roleId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(roleId) ? newSet.delete(roleId) : newSet.add(roleId);
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await rbacApi.assignRolesToUser(userId, Array.from(selectedIds));
      if (response.success) {
        addToast("Roles assigned successfully", "success");
        onSuccess();
      } else {
        addToast(response.message || "Failed to assign roles", "error");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to assign roles";
      addToast(errorMsg, "error");
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const hasChanges = Array.from(selectedIds).sort().join(",") !== currentRoleIds.sort().join(",");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-green-600" />
            Assign Roles
          </DialogTitle>
          <DialogDescription>
            Select roles for user: <span className="font-medium text-gray-900">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        {selectedIds.size === 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">This user will not have access to any modules.</p>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {allRoles.map((role) => (
            <label
              key={role.id}
              className={`flex items-center gap-3 p-3 cursor-pointer ${
                selectedIds.has(role.id) ? "bg-green-50" : "hover:bg-gray-50"
              }`}
            >
              <Checkbox
                checked={selectedIds.has(role.id)}
                onCheckedChange={() => toggleRole(role.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{role.name}</span>
                  {role.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                  {!role.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
                {role.description && <p className="text-sm text-gray-500">{role.description}</p>}
              </div>
            </label>
          ))}
          {allRoles.length === 0 && (
            <div className="p-4 text-center text-gray-500">No roles available</div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!hasChanges}>Save Roles</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}