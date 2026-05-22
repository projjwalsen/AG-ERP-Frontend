"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Save, RotateCcw, Loader2, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchUserById, updateUser, clearCurrentUser } from "@/app/store/usersSlice";
import { branchApi } from "@/app/services/branch.service";
import { Branch } from "@/app/types/branch";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

const userSchema = z.object({
  name: z.string().min(2, "Min 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  branchAccessType: z.string().optional(),
  branchId: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentUser: user, isLoading, error } = useAppSelector((state) => state.users);
  const { addToast } = useToast();

  const [userId, setUserId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(true);

  const { register, handleSubmit, setValue, reset, watch, formState: { errors, isDirty } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      branchAccessType: "ALL",
      branchId: "",
    },
  });

  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const response = await branchApi.getAll();
      const branchesData = Array.isArray(response.data)
        ? response.data
        : response.data?.branches ?? [];
      setBranches(branchesData);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load branches";
      addToast(errorMsg, "error");
    } finally {
      setLoadingBranches(false);
    }
  };

  React.useEffect(() => {
    fetchBranches();
  }, []);

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

  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        branchAccessType: user.branchAccessType || "ALL",
        branchId: user.branchId || "",
      });
    }
  }, [user, reset]);

  // Refresh branches if they are changed elsewhere (e.g., new branch created)
  React.useEffect(() => {
    const handler = () => fetchBranches();
    try {
      window.addEventListener("branches:changed", handler as EventListener);
    } catch (e) {
      // ignore in SSR
    }
    return () => {
      try {
        window.removeEventListener("branches:changed", handler as EventListener);
      } catch (e) {}
    };
  }, []);

  const onSubmit = async (data: UserFormData) => {
    if (!userId) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await dispatch(updateUser({
        userId,
        payload: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          branchAccessType: data.branchAccessType as "ALL" | "SELECTED" | undefined,
          branchId: data.branchId || undefined,
        },
      })).unwrap();

      addToast("User updated successfully", "success");
      setTimeout(() => {
        router.push(`/users/${userId}`);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setSubmitError(message);
      addToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        branchAccessType: user.branchAccessType || "ALL",
        branchId: user.branchId || "",
      });
    }
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

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Edit User"
        description={`Update ${user.name}`}
        breadcrumbs={[{ label: "Users", href: "/users" }, { label: user.name, href: `/users/${user.id}` }, { label: "Edit" }]}
      />

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Full Name *</Label>
                    <Input
                      {...register("name")}
                      error={errors.name?.message}
                      icon={<User className="h-4 w-4" />}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input
                      {...register("email")}
                      type="email"
                      error={errors.email?.message}
                      icon={<Mail className="h-4 w-4" />}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Phone (Optional)</Label>
                  <Input
                    {...register("phone")}
                    type="tel"
                    placeholder="Enter phone number"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Branch Access *</Label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={watch("branchId") || ""}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setValue("branchId", "");
                        setValue("branchAccessType", "ALL");
                      } else {
                        setValue("branchId", e.target.value);
                        setValue("branchAccessType", "SELECTED");
                      }
                    }}
                    disabled={isSubmitting || loadingBranches}
                  >
                    <option value="">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="pt-5">
                <div className="w-full flex gap-5">
                  <Button type="submit" className="w-full h-9" loading={isSubmitting}>
                    <Save className="h-4 w-4 mr-2" />Update
                  </Button>
                  <Link href={`/users/${user.id}`} className="w-full h-9">
                    <Button type="button" variant="outline" className="w-full h-9" disabled={isSubmitting}>Cancel</Button>
                  </Link>
                </div>
                {isDirty && (
                  <Button type="button" variant="ghost" className="w-full h-9 mt-2" onClick={handleReset} disabled={!isDirty || isSubmitting}>
                    <RotateCcw className="h-4 w-4 mr-2" />Reset Changes
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
      <ToastContainer />
    </div>
  );
}
