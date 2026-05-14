"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Eye, Edit, Trash2, Mail, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout";
import { DataTable } from "@/components/tables";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchAllUsers } from "@/app/store/usersSlice";
import { User } from "@/app/types/api";
import { formatDate, cn } from "@/lib/utils";

const statusVariant: Record<string, { variant: "success" | "warning" | "error" | "default"; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  SUSPENDED: { variant: "error", label: "Suspended" },
};

export default function UsersListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { users, isLoading, error } = useAppSelector((state) => state.users);

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);

  React.useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
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
      header: "Branch Access",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-3.5 w-3.5" />
          {row.original.branchAccessType || "ALL"}
          {row.original.branchId && row.original.branchAccessType === "SELECTED" && ` (${row.original.branchId.slice(0, 8)}...)`}
        </div>
      ),
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="User Management"
          description="Manage user accounts and permissions"
          actions={<Link href="/users/new"><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add User</Button></Link>}
        />
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
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        description="Manage user accounts and permissions"
        actions={<Link href="/users/new"><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add User</Button></Link>}
      />

      <Card>
        <CardContent className="p-5">
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <DataTable columns={columns} data={users} searchKey="name" searchPlaceholder="Search users..." />
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}