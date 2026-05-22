"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Eye, Edit, Trash2, Mail, Building2, Loader2, Key, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/tables";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllUsers } from "@/app/store/usersSlice";
import { UserService } from "@/app/services/user.service";
import { branchApi } from "@/app/services/branch.service";
import { hasModulePermission } from "@/lib/usePermissions";
import { User } from "@/app/types/api";
import { Branch } from "@/app/types/branch";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const statusVariant: Record<string, { variant: "success" | "warning" | "error" | "default"; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  SUSPENDED: { variant: "error", label: "Suspended" },
};

export default function UsersListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { users, isLoading, error } = useAppSelector((state) => state.users);
  const { permissions } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();

  const canView = hasModulePermission(permissions, "USER", "VIEW");
  const canWrite = hasModulePermission(permissions, "USER", "WRITE");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState("");
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const [userToReset, setUserToReset] = React.useState<User | null>(null);
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetLoading, setResetLoading] = React.useState(false);

  // Fetch branches on mount
  React.useEffect(() => {
    fetchBranches();
  }, []);

  // Fetch users when filters change
  React.useEffect(() => {
    const params: { search?: string; branch?: string } = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedBranch) params.branch = selectedBranch;
    dispatch(fetchAllUsers(Object.keys(params).length > 0 ? params : undefined));
  }, [dispatch, searchTerm, selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await branchApi.getActive();
      const branchesData = Array.isArray(response.data)
        ? response.data
        : response.data?.branches ?? [];
      setBranches(branchesData);
    } catch (err) {
      console.error("Failed to fetch branches", err);
    }
  };

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleResetPassword = async () => {
    if (!userToReset || !resetPassword) return;
    setResetLoading(true);
    try {
      const response = await UserService.resetPassword(userToReset.id, resetPassword);
      if (response.success) {
        addToast("Password reset successfully", "success");
        setResetPasswordOpen(false);
        setResetPassword("");
        setUserToReset(null);
      } else {
        addToast(response.message || "Failed to reset password", "error");
        setResetLoading(false);
        return;
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to reset password";
      addToast(errorMsg, "error");
      setResetLoading(false);
      return;
    }
    setResetLoading(false);
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || <span className="text-gray-400">-</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || "ACTIVE";
        const variant = statusVariant[status]?.variant || "default";
        const label = statusVariant[status]?.label || status;
        return <Badge variant={variant} dot>{label}</Badge>;
      },
    },
    {
      accessorKey: "branchAccessType",
      header: "Branch",
      cell: ({ row }) => {
        const { branchAccessType, branch } = row.original;
        return (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-3.5 w-3.5" />
            {branchAccessType === "ALL" ? (
              <span className="text-gray-500">All Branches</span>
            ) : branch?.name ? (
              <span className="font-medium">{branch.name}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.original.roles || [];
        return roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => row.original.createdAt ? <span className="text-sm text-gray-600">{formatDate(row.original.createdAt)}</span> : <span className="text-gray-400">-</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canView && (
                <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
              )}
              {canWrite && (
                <>
                  <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setUserToReset(user); setResetPasswordOpen(true); }}>
                    <Key className="mr-2 h-4 w-4" />Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="space-y-5 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => dispatch(fetchAllUsers())}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage user accounts and permissions</p>
        </div>
        {canWrite && (
          <Link href="/users/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />Add User
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            {(searchTerm || selectedBranch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedBranch("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-5">
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <DataTable columns={columns} data={users} />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete <span className="font-semibold text-gray-900">{userToDelete?.name}</span>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for <span className="font-semibold text-gray-900">{userToReset?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordOpen(false); setResetPassword(""); }}>Cancel</Button>
            <Button onClick={handleResetPassword} loading={resetLoading}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}