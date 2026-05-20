"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { login, clearError, fetchUserAccess } from "@/app/store/authSlice";

function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [focused, setFocused] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (error) {
      // Filter out technical/authentication errors from UI
      const filteredError = error
        .replace(/authentication token missing.*/gi, "")
        .replace(/cookie.*expired.*/gi, "")
        .replace(/unauthorized.*/gi, "")
        .trim();

      if (filteredError) {
        setLocalError(filteredError);
        const timer = setTimeout(() => {
          dispatch(clearError());
          setLocalError(null);
        }, 5000);
        return () => clearTimeout(timer);
      } else {
        dispatch(clearError());
      }
    }
  }, [error, dispatch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Please enter both email and password");
      return;
    }

    try {
      const result = await dispatch(login({ email, password })).unwrap();
      // Fetch user access permissions after successful login
      dispatch(fetchUserAccess(result.user.id));
      router.push("/dashboard");
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
          

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500">Enter your credentials to access your account</p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{displayError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                className={`mt-1.5 ${focused === "email" ? "border-green-500 ring-1 ring-green-500" : ""}`}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-gray-700">Password</Label>
              <div className="mt-1.5 relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  className={`pr-10 ${focused === "password" ? "border-green-500 ring-1 ring-green-500" : ""}`}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(c) => setRememberMe(c === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">Remember me</Label>
              </div>
              <button type="button" className="text-sm text-green-600 hover:text-green-700 font-medium">Forgot password?</button>
            </div>

            <Button type="submit" className="w-full h-11 bg-green-600 hover:bg-green-700" loading={isLoading}>
              {isLoading ? "Signing in..." : <>Sign in<ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Protected by enterprise-grade security
          </p>
        </motion.div>
      </div>
  );
}

export default LoginPage;