"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Fuel } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { login, clearError } from "@/app/store/authSlice";

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
      setLocalError(error);
      const timer = setTimeout(() => {
        dispatch(clearError());
        setLocalError(null);
      }, 5000);
      return () => clearTimeout(timer);
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
      await dispatch(login({ email, password })).unwrap();
      router.push("/dashboard");
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center bg-green-600">
              <Fuel className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PetroChem</h1>
              <p className="text-xs text-gray-500">ERP Suite</p>
            </div>
          </div>

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

      {/* Right Panel - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80"
          alt="Team working together in modern office"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-900/40" />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Top Content */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center bg-green-600">
              <Fuel className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PetroChem</h1>
              <p className="text-sm text-gray-300">ERP Suite</p>
            </div>
          </div>

          {/* Center Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-md"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Empowering Teams to Achieve More
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Streamline your petrochemical operations with our comprehensive enterprise resource planning solution.
            </p>
          </motion.div>

          {/* Bottom Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-3 gap-8"
          >
            {[
              { value: "500+", label: "Active Users" },
              { value: "$2.8M", label: "Daily Transactions" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;