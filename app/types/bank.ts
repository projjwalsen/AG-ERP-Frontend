// Bank Account Types — mirrors AG-ERP-Backend/src/modules/bank
//
// The backend returns bank accounts with an embedded
// `{ branch: { id, name, code } }` from the prisma `include`. The
// frontend never mutates these — they're render-only data.
//
// The shared `BankAccount` interface lives in `bank.service.ts` so the
// service, page, and form can all share a single declaration. This
// file exposes only list-shaped wrappers used by the branches page.

export interface BankAccountBranchRef {
  id: string;
  name: string;
  code: string;
}

export interface BankAccountListResponse {
  accounts: import("../services/bank.service").BankAccount[];
  meta: {
    total: number;
  };
}