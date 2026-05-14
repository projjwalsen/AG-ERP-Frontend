"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { User, Mail, Shield, Save, RotateCcw, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchUserById, updateUser, clearCurrentUser } from "@/app/store/usersSlice";
import { cn } from "@/lib/utils";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  branchAccessType: z.string().optional(),
  branchId: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentUser: user, isLoading, error } = useAppSelector((state) => state.users);

  const [userId, setUserId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors, isDirty } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      branchAccessType: "ALL",
      branchId: "",
    },
  });

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

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push(`/users/${userId}`);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setSubmitError(message);
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
    <div className="space-y-5">
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

      {submitSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">User updated successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      {...register("name")}
                      error={errors.name?.message}
                      icon={<User className="h-4 w-4" />}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
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
                  <Label className="text-xs">Phone</Label>
                  <Input
                    {...register("phone")}
                    type="tel"
                    placeholder="Enter phone number"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label className="text-xs">Branch Access Type</Label>
                  <Select
                    defaultValue={user.branchAccessType || "ALL"}
                    onValueChange={(v) => setValue("branchAccessType", v)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Branches</SelectItem>
                      <SelectItem value="SELECTED">Selected Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="pt-5">
                <div className="space-y-2">
                  <Button type="submit" className="w-full h-9" loading={isSubmitting} disabled={!isDirty && !submitError}>
                    <Save className="h-4 w-4 mr-2" />Update
                  </Button>
                  <Button type="button" variant="outline" className="w-full h-9" onClick={handleReset} disabled={!isDirty || isSubmitting}>
                    <RotateCcw className="h-4 w-4 mr-2" />Reset
                  </Button>
                  <Link href={`/users/${user.id}`}>
                    <Button type="button" variant="ghost" className="w-full h-9">Cancel</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}