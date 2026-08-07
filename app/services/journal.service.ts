// Journal API Service
import { apiFetch } from "./api";
import {
  Journal,
  JournalHead,
  JournalHeadType,
  JournalStatus,
  JournalHeadResponse,
  JournalHeadsListResponse,
  JournalResponse,
  JournalsListResponse,
  PaginationMeta,
  PaymentMode,
  PaymentType,
} from "../types/journal";

export interface GetJournalsParams {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  status?: JournalStatus;
  journalHeadId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateJournalHeadPayload {
  name: string;
  type: JournalHeadType;
}

export interface UpdateJournalHeadPayload {
  name?: string;
  type?: JournalHeadType;
  isActive?: boolean;
}

export interface CreateJournalPayload {
  branchId: string;
  journalHeadId: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentThrough?: PaymentType;
  remarks?: string;
  journalDate?: string;
}

export interface UpdateJournalPayload {
  branchId?: string;
  journalHeadId?: string;
  amount?: number;
  paymentMode?: PaymentMode;
  paymentThrough?: PaymentType;
  remarks?: string;
  journalDate?: string;
}

export const journalHeadApi = {
  async list(params?: { search?: string; type?: JournalHeadType; isActive?: boolean }): Promise<{ success: boolean; message: string; data?: JournalHeadsListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.isActive !== undefined) queryParams.append("isActive", String(params.isActive));

    const query = queryParams.toString();
    const url = query ? `/api/journal/heads?${query}` : "/api/journal/heads";
    return apiFetch<{ journalHeads: JournalHead[] } | JournalHead[]>(url).then((response) => {
      const raw = response.data as any;
      // Normalize wrapped or flat array responses.
      if (Array.isArray(raw)) {
        return { success: response.success, message: response.message, data: { journalHeads: raw } };
      }
      if (raw && Array.isArray(raw.journalHeads)) {
        return { success: response.success, message: response.message, data: { journalHeads: raw.journalHeads } };
      }
      return { success: response.success, message: response.message, data: undefined };
    });
  },

  async getById(journalHeadId: string): Promise<{ success: boolean; message: string; data?: JournalHeadResponse }> {
    return apiFetch<JournalHeadResponse>(`/api/journal/head/${journalHeadId}`);
  },

  async create(payload: CreateJournalHeadPayload): Promise<{ success: boolean; message: string; data?: JournalHeadResponse }> {
    return apiFetch<JournalHeadResponse>("/api/journal/head/create", {
      method: "POST",
      body: payload,
    });
  },

  async update(journalHeadId: string, payload: UpdateJournalHeadPayload): Promise<{ success: boolean; message: string; data?: JournalHeadResponse }> {
    return apiFetch<JournalHeadResponse>(`/api/journal/head/${journalHeadId}`, {
      method: "PUT",
      body: payload,
    });
  },

  async remove(journalHeadId: string): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/journal/head/${journalHeadId}`, {
      method: "DELETE",
    });
  },
};

export const journalApi = {
  async getAll(params?: GetJournalsParams): Promise<{ success: boolean; message: string; data?: JournalsListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.journalHeadId) queryParams.append("journalHeadId", params.journalHeadId);
    if (params?.fromDate) queryParams.append("fromDate", params.fromDate);
    if (params?.toDate) queryParams.append("toDate", params.toDate);

    const query = queryParams.toString();
    const url = query ? `/api/journal/all?${query}` : "/api/journal/all";
    return apiFetch<{ data: Journal[]; meta: PaginationMeta } | Journal[]>(url).then((response) => {
      const raw = response.data as any;
      // Backend may wrap as { data: [...], meta } (current) or return a flat array (legacy).
      // Normalize so the page always sees the wrapped shape.
      if (Array.isArray(raw)) {
        return {
          success: response.success,
          message: response.message,
          data: { journals: raw, meta: undefined, pagination: undefined },
        };
      }
      if (raw && Array.isArray(raw.data)) {
        return {
          success: response.success,
          message: response.message,
          data: {
            journals: raw.data,
            meta: raw.meta,
            pagination: raw.meta,
          },
        };
      }
      return {
        success: response.success,
        message: response.message,
        data: undefined,
      };
    });
  },

  async getById(journalId: string): Promise<{ success: boolean; message: string; data?: JournalResponse }> {
    return apiFetch<JournalResponse>(`/api/journal/${journalId}`);
  },

  async create(payload: CreateJournalPayload): Promise<{ success: boolean; message: string; data?: JournalResponse }> {
    return apiFetch<JournalResponse>("/api/journal/create", {
      method: "POST",
      body: payload,
    });
  },

  async update(journalId: string, payload: UpdateJournalPayload): Promise<{ success: boolean; message: string; data?: JournalResponse }> {
    return apiFetch<JournalResponse>(`/api/journal/${journalId}`, {
      method: "PUT",
      body: payload,
    });
  },

  async approve(journalId: string): Promise<{ success: boolean; message: string; data?: JournalResponse }> {
    return apiFetch<JournalResponse>(`/api/journal/${journalId}/approve`, {
      method: "PATCH",
    });
  },

  async reject(journalId: string, remarks?: string): Promise<{ success: boolean; message: string; data?: JournalResponse }> {
    return apiFetch<JournalResponse>(`/api/journal/${journalId}/reject`, {
      method: "PATCH",
      body: remarks ? { remarks } : {},
    });
  },
};