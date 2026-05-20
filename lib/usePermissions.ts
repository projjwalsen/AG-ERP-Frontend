"use client";

import { useAppSelector } from "@/app/store/hooks";

export interface PermissionCheck {
  canView: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canActivate: boolean;
}

export function usePermissions(module: string): PermissionCheck {
  const { permissions } = useAppSelector((state) => state.auth);

  const modulePermissions = permissions.filter(
    (p) => p.module?.toUpperCase() === module.toUpperCase()
  );

  return {
    canView: modulePermissions.some((p) => p.action?.toUpperCase() === "VIEW"),
    canWrite: modulePermissions.some((p) => p.action?.toUpperCase() === "WRITE"),
    canDelete: modulePermissions.some((p) => p.action?.toUpperCase() === "DELETE"),
    canActivate: modulePermissions.some((p) => p.action?.toUpperCase() === "WRITE"),
  };
}

export function hasModulePermission(
  permissions: any[],
  module: string,
  action: string
): boolean {
  return permissions.some(
    (p) => p.module?.toUpperCase() === module.toUpperCase() && p.action?.toUpperCase() === action.toUpperCase()
  );
}