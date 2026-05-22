// Branch Types

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
  phone?: string;
  email?: string;
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
}

export interface BranchesListResponse {
  branches: Branch[];
  pagination?: PaginationMeta;
}

export interface BranchResponse {
  branch: Branch;
}