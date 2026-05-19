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
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { users: number };
}

export interface BranchesListResponse {
  branches: Branch[];
}

export interface BranchResponse {
  branch: Branch;
}