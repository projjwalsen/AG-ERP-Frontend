"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Building2, Briefcase, Package,
  ShoppingCart, FileText, History, Settings, ChevronLeft, Shield,
  Search, Bell, ChevronDown, LogOut, User, Moon, Sun, Menu, CreditCard,
  ChevronRight, BookOpen, Wallet, BarChart3, AlertTriangle, Receipt,
  Calculator, Factory, ClipboardList, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockNotifications } from "@/data/mockData";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { getProfile, logout, fetchUserAccess } from "@/app/store/authSlice";

// Permission check helper
const hasPermission = (permissions: any[], module: string, action: string): boolean => {
  return permissions.some(
    (p) => p.module?.toUpperCase() === module.toUpperCase() && p.action?.toUpperCase() === action.toUpperCase()
  );
};

// Check if user has any permission for a module (for sidebar visibility)
const hasModuleAccess = (permissions: any[], module: string): boolean => {
  return permissions.some((p) => p.module?.toUpperCase() === module.toUpperCase());
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Pages that should NOT show the sidebar
const noSidebarPaths = ["/login", "/"];

type SidebarChild = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: { count: number; tone: "amber" | "blue" | "rose" };
};

type SidebarItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  module: string | null;
  children?: SidebarChild[];
};

// Wrapper component that manages sidebar state
export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, permissions } = useAppSelector((state) => state.auth);

  // Fetch profile and user access on mount, but only after the user has
  // successfully logged in. Skipping the call when there is no user keeps
  // the auth slice's `isLoading` flag at false, so the login form's
  // "Sign in" button is not disabled by a stale profile fetch on first paint.
  React.useEffect(() => {
    if (noSidebarPaths.includes(pathname)) return;
    if (user) {
      if (permissions.length === 0 && user.id) {
        dispatch(fetchUserAccess(user.id));
      }
    }
  }, [dispatch, pathname, user, permissions.length]);

  // On a hard refresh the Redux store is wiped, so `user` is null. The
  // login page already gates the form on `isLoading`, so we only want to
  // hydrate the session when we're not on the login page. This restores
  // permissions for users who refresh while logged in.
  React.useEffect(() => {
    if (noSidebarPaths.includes(pathname)) return;
    if (user) return;
    dispatch(getProfile()).then((action) => {
      if (getProfile.fulfilled.match(action) && action.payload.profile?.id) {
        dispatch(fetchUserAccess(action.payload.profile.id));
      }
    });
  }, [dispatch, pathname, user]);

  // Don't show sidebar on login and home pages
  if (noSidebarPaths.includes(pathname)) {
    return <>{children}</>;
  }

  const unreadCount = mockNotifications.filter((n) => !n.isRead).length;

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = async () => {
    await dispatch(logout());
    router.push("/login");
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((s) => !s)} />
      <div className={cn("flex-1 flex flex-col transition-all duration-200", collapsed ? "ml-16" : "ml-55")}>
        {/* Navbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">

          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-gray-500">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-500">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] font-medium text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && <Badge variant="success">{unreadCount} new</Badge>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  {mockNotifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                      <div className="flex w-full items-start justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{notification.title}</span>
                        {!notification.isRead && <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 mt-1" />}
                      </div>
                      <span className="text-xs text-gray-500 line-clamp-2">{notification.message}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center text-green-600 justify-center font-medium text-sm py-2 cursor-pointer">
                  View all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900">{user?.name || "User"}</span>
                    <span className="text-xs text-gray-500">{user?.status || "Active"}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-gray-400 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-500">{user?.email || ""}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 bg-gray-50 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

const buildSidebarItems = (): SidebarItem[] => [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: null },
  { title: "Branch Management", href: "/branches", icon: Building2, module: "BRANCH" },
  { title: "User Management", href: "/users", icon: Users, module: "USER" },
  { title: "Access Control", href: "/access-control", icon: Shield, module: "ROLE" },
  { title: "Agency Management", href: "/agencies", icon: Briefcase, module: "AGENCY" },
  { title: "Product Management", href: "/inventory", icon: Package, module: "PRODUCT" },
  {
    title: "Manufacturing",
    href: "/manufacturing/manufactures",
    icon: Factory,
    module: "PRODUCT",
    
    
  },
  { title: "Purchase & Sales", href: "/purchase-sales", icon: ShoppingCart, module: "PURCHASE" },
  
  {
    title: "Transactions",
    href: "/transactions",
    icon: CreditCard,
    module: "PAYMENT",
  },
  { title: "Inventory Management", href: "/inventory-management", icon: Package, module: "PRODUCT" },
  {
    title: "Ledger",
    href: "/ledger",
    icon: BookOpen,
    module: "LEDGER",
    children: [
      { title: "Product Ledger", href: "/ledger", icon: BookOpen },
      { title: "Financial Ledger", href: "/ledger/financial", icon: Wallet },
    ],
  },
  { title: "Journal", href: "/journal", icon: FileText, module: null },
  // { title: "Audit Logs", href: "/audit-logs", icon: History, module: "AUDIT" },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    module: "REPORT",
    children: [
      { title: "AP/AR report", href: "/reports/outstanding", icon: FileText },
      { title: "Branch Day Book", href: "/reports/day-book", icon: BookOpen },
      { title: "GSTR-1 Report", href: "/reports/gstr1", icon: Receipt },
      { title: "GST Suspense Log", href: "/reports/gst-suspense", icon: AlertTriangle },
      { title: "GST Ledger", href: "/reports/gst-ledger", icon: Calculator },
      { title: "Inventory Report", href: "/reports/inventory", icon: Package },
    ],
  },
  { title: "Settings", href: "/settings", icon: Settings, module: null },
];

function NavItem({
  item,
  pathname,
  collapsed,
}: {
  item: SidebarItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isExactActive = pathname === item.href;
  const isDescendantActive =
    pathname.startsWith(`${item.href}/`) && item.href !== "/dashboard";
  const isActive = isExactActive || isDescendantActive;
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;

  // Reports: open the submenu by default whenever the user is on the
  // reports landing or any descendant, so all 5 submenus stay visible.
  const initiallyOpen =
    item.href === "/reports"
      ? pathname === "/reports" || isDescendantActive
      : isDescendantActive;

  const [open, setOpen] = React.useState<boolean>(initiallyOpen);

  React.useEffect(() => {
    if (isDescendantActive || isExactActive) setOpen(true);
  }, [isDescendantActive, isExactActive]);

  const linkContent = (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        isActive && !hasChildren
          ? "bg-green-50 text-green-700 border-l-2 border-green-600"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.title}</span>
          {hasChildren && (
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-gray-400 transition-transform",
                open && "rotate-90"
              )}
            />
          )}
        </>
      )}
    </div>
  );

  // When collapsed show only icon as link
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href}>{linkContent}</Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <div
        onClick={() => {
          if (hasChildren) {
            setOpen((s) => !s);
          } else {
            window.location.href = item.href;
          }
        }}
      >
        {hasChildren ? (
          linkContent
        ) : (
          <Link href={item.href}>{linkContent}</Link>
        )}
      </div>

      {hasChildren && open && (
        <div className="mt-0.5 ml-3 space-y-0.5 border-l border-gray-100 pl-1">
          {item.children!.map((child) => {
            const childActive = pathname === child.href;
            const ChildIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  childActive
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">{child.title}</span>
                {child.badge && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-1.5 min-w-5 h-4 text-[10px] font-semibold rounded-full",
                      child.badge.tone === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : child.badge.tone === "rose"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {child.badge.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { permissions } = useAppSelector((state) => state.auth);

  const sidebarItems = React.useMemo(() => buildSidebarItems(), []);

  // If the auth backend has not yet returned any permissions (UI-only mode,
  // empty session, or a logged-out user landing on a non-public page),
  // fall back to showing every module so the navigation is not blank.
  const showAllWhenNoPermissions = permissions.length === 0;

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

                <div className="flex items-center gap-3">

                  <div>
                    <h1 className="text-sm font-bold text-gray-900">ASHTAVINAYAKA</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">ERP Suite</p>
                  </div>
                </div>

          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-3">
            <nav className="space-y-0.5">
              {sidebarItems.map((item) => {
                // Transactions, Ledger, and Reports are always shown
                // (UI-only build — permission check still happens inside
                // the page itself).
                const isAlwaysVisibleEntry =
                  item.href === "/transactions" ||
                  item.href === "/ledger" ||
                  item.href === "/reports";

                // Skip items that require module permission and user doesn't have access.
                if (
                  item.module &&
                  !isAlwaysVisibleEntry &&
                  !showAllWhenNoPermissions &&
                  !hasModuleAccess(permissions, item.module)
                ) {
                  return null;
                }
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                  />
                );
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
