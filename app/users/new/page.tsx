"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock, Shield, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { createUser, clearUsersError } from "@/app/store/usersSlice";
import { cn } from "@/lib/utils";

const userSchema = z.object({
  name: z.string().min(2, "Min 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  branchAccessType: z.string().optional(),
  branchId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type UserFormData = z.infer<typeof userSchema>;

export default function CreateUserPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.users);

  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      branchAccessType: "ALL",
      branchId: "",
    },
  });

  React.useEffect(() => {
    return () => {
      dispatch(clearUsersError());
    };
  }, [dispatch]);

  const onSubmit = async (data: UserFormData) => {
    setFormError(null);

    try {
      await dispatch(createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        branchAccessType: data.branchAccessType as "ALL" | "SELECTED" | undefined,
        branchId: data.branchId || undefined,
      })).unwrap();

      setSuccess(true);
      setTimeout(() => {
        router.push("/users");
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      setFormError(message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Create User"
        description="Add a new user account"
        breadcrumbs={[{ label: "Users", href: "/users" }, { label: "Create User" }]}
      />

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{formError}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">User created successfully!</p>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label className="text-xs">Branch Access Type</Label>
                  <Select
                    defaultValue="ALL"
                    onValueChange={(v) => setValue("branchAccessType", v)}
                    disabled={isLoading}
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

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Password</Label>
                    <div className="mt-1 relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        error={errors.password?.message}
                        icon={<Lock className="h-4 w-4" />}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Confirm Password</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      {...register("confirmPassword")}
                      error={errors.confirmPassword?.message}
                      icon={<Lock className="h-4 w-4" />}
                      className="mt-1"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent className="pt-5">
                <div className="space-y-2">
                  <Button type="submit" className="w-full h-9" loading={isLoading}>
                    <Save className="h-4 w-4 mr-2" />Create User
                  </Button>
                  <Link href="/users">
                    <Button type="button" variant="outline" className="w-full h-9" disabled={isLoading}>Cancel</Button>
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