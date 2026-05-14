"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <Card>
          <CardContent className="pt-10 pb-8 px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-50">
                <ShieldX className="h-12 w-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-sm text-gray-500 mb-6">You don&apos;t have permission to view this page.</p>

            <div className="flex items-center justify-center gap-2 mb-8 px-3 py-2 bg-gray-100">
              <span className="text-xs font-medium text-gray-600">Error Code: 403</span>
            </div>

            <div className="space-y-2">
              <Link href="/dashboard">
                <Button className="w-full h-10"><Home className="h-4 w-4 mr-2" />Dashboard</Button>
              </Link>
              <Button variant="outline" className="w-full h-10" onClick={() => history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}