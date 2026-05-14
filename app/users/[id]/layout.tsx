"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

interface UserDetailLayoutProps {
  children: React.ReactNode;
}

export default function UserDetailLayout({ children }: UserDetailLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 64 : 220;

  return (
    <div className="min-h-screen bg-gray-50">
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-[220px] bg-white">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <div
        className="hidden lg:block sticky top-0 z-30 transition-all duration-200"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Navbar sidebarCollapsed={sidebarCollapsed} onMenuClick={() => setMobileOpen(true)} />
      </div>

      <main
        className="p-6 transition-all duration-200 min-h-screen"
        style={{ marginLeft: sidebarCollapsed ? "64px" : "220px" }}
      >
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}