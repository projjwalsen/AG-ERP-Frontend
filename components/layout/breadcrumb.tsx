"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function Breadcrumbs({ items }: { items?: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link href="/dashboard" className="text-gray-400 hover:text-green-600">
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items?.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-gray-300" />
            {item.href ? (
              <Link href={item.href} className="text-gray-500 hover:text-green-600 font-medium">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-5">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className={cn("flex items-start justify-between gap-4", breadcrumbs ? "mt-3" : "")}>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export { Breadcrumbs, PageHeader };