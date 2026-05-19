"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Edit, Trash2, Mail, Building2, Shield, Clock, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchUserById, updateUserStatus, clearCurrentUser } from "@/app/store/usersSlice";
import { formatDate, cn } from "@/lib/utils";

const statusVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  ACTIVE: "success",
  SUSPENDED: "error",
};

export default function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentUser: user, isLoading, error } = useAppSelector((state) => state.users);

  const [userId, setUserId] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<string>("");

  React.useEffect(() => {
    params.then((p) => setUserId(p.id));
  }, [params]);

  React.useEffect(() => {
    if (userId) {
      dispatch(fetchUserById(userId));
    }
    return () => {
      dispatch(clearCurrentUser());
    };
  }, [userId, dispatch]);

  const handleStatusChange = async () => {
    if (!userId || !newStatus) return;

    try {
      await dispatch(updateUserStatus({ userId, payload: { status: newStatus as "ACTIVE" | "SUSPENDED" } })).unwrap();
      setStatusDialogOpen(false);
      setNewStatus("");
    } catch (err) {
      // Error handled in slice
    }
  };

  const openStatusDialog = (status: string) => {
    setNewStatus(status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
    setStatusDialogOpen(true);
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "User not found"}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push("/users")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Users
            </Button>
            {userId && <Button onClick={() => dispatch(fetchUserById(userId))}>Retry</Button>}
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Details"
        breadcrumbs={[{ label: "Users", href: "/users" }, { label: user.name }]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => openStatusDialog(user.status || "ACTIVE")}
              className={user.status === "ACTIVE" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
            >
              {user.status === "ACTIVE" ? "Suspend" : "Activate"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
            <Link href={`/users/${user.id}/edit`}>
              <Button><Edit className="h-4 w-4 mr-1.5" />Edit</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-5">
              <div className="text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <Mail className="h-3 w-3" />{user.email}
                </p>
                <Badge variant={statusVariant[user.status || "ACTIVE"]} dot className="mt-2 capitalize">
                  {user.status?.toLowerCase() || "active"}
                </Badge>
              </div>
              <div className="mt-5 space-y-2">
                {user.phone && (
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-2.5 bg-gray-50">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Branch Access</p>
                    <p className="text-sm font-medium">{user.branchAccessType || "ALL"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Created</p>
                  <p className="text-sm font-medium mt-0.5">{user.createdAt ? formatDate(user.createdAt) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Last Updated</p>
                  <p className="text-sm font-medium mt-0.5">{user.updatedAt ? formatDate(user.updatedAt) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user.status === "ACTIVE" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    <p className="text-sm font-medium capitalize">{user.status?.toLowerCase() || "active"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">User ID</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newStatus === "SUSPENDED" ? "Suspend User" : "Activate User"}</DialogTitle>
            <DialogDescription>
              {newStatus === "SUSPENDED"
                ? `Are you sure you want to suspend ${user.name}? They will no longer be able to access the system.`
                : `Are you sure you want to activate ${user.name}? They will regain access to the system.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button
              variant={newStatus === "SUSPENDED" ? "destructive" : "default"}
              onClick={handleStatusChange}
              loading={isLoading}
            >
              {newStatus === "SUSPENDED" ? "Suspend" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Delete <span className="font-semibold">{user.name}</span>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setDeleteDialogOpen(false); router.push("/users"); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}