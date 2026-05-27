// Branch Types - matches backend API contract

export interface Branch {
  id: string;
  name: string;
  code: string;
  gstin: string;
  stateCode: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pinCode: string;
  phnNumber?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { users: number };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// Backend returns: { data: { branches: Branch[], meta: PaginationMeta } }
export interface BranchesListResponse {
  branches: Branch[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta; // Alias for compatibility
}

export interface BranchResponse {
  branch?: Branch;
  [key: string]: Branch | undefined;
}