// Agency Types

export interface AgencyBranch {
  branchId: string;
  openingBalance?: number;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface Agency {
  id: string;
  name: string;
  type: "VENDOR" | "CLIENT" | "BOTH";
  gstin?: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pinCode?: string;
  isActive: boolean;
  branches?: AgencyBranch[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AgenciesListResponse {
  agencies: Agency[];
  pagination?: PaginationMeta;
}

export interface AgencyResponse {
  agency: Agency;
}