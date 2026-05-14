"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Building2, Briefcase, Package, Warehouse,
  ShoppingCart, DollarSign, FileText, History, Settings, ChevronLeft, Fuel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const sidebarItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "User Management", href: "/users", icon: Users },
  { title: "Branch Management", href: "/branches", icon: Building2 },
  { title: "Agency Management", href: "/agencies", icon: Briefcase },
  { title: "Product Management", href: "/products", icon: Package },
  { title: "Inventory", href: "/inventory", icon: Warehouse },
  { title: "Purchases", href: "/purchases", icon: ShoppingCart },
  { title: "Sales", href: "/sales", icon: DollarSign },
  { title: "Payments", href: "/payments", icon: DollarSign },
  { title: "Reports", href: "/reports", icon: FileText },
  { title: "Audit Logs", href: "/audit-logs", icon: History },
  { title: "Settings", href: "/settings", icon: Settings },
];

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-200",
          collapsed ? "w-[64px]" : "w-[220px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn("flex h-14 items-center border-b border-gray-100 px-4", collapsed ? "justify-center" : "justify-between")}>
            {collapsed ? (
              <div className="flex h-9 w-9 items-center justify-center bg-green-600">
                <Fuel className="h-5 w-5 text-white" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center bg-green-600">
                    <Fuel className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-gray-900">PetroChem</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">ERP Suite</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-3">
            <nav className="space-y-0.5">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-green-50 text-green-700 border-l-2 border-green-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.href}>{linkContent}</div>;
              })}
            </nav>
          </ScrollArea>

          {/* Collapse Toggle */}
          <div className="border-t border-gray-100 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={cn(
                "w-full justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                !collapsed && "justify-start"
              )}
            >
              <ChevronLeft className={cn("h-4 w-4", collapsed && "rotate-180")} />
              {!collapsed && <span className="ml-2">Collapse</span>}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export { Sidebar };