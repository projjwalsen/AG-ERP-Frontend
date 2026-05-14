"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Navbar sidebarCollapsed={sidebarCollapsed} />
      <main
        className="p-6 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? "72px" : "260px" }}
      >
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}

export { AppLayout };