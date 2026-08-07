// Manufacturing API Service - matches backend AG-ERP-Backend/src/modules/manufacturing/
import { apiFetch } from "./api";
import {
  CreateManufacturePayload,
  CreateRecipePayload,
  ManufacturePreview,
  ManufactureResponse,
  ManufacturesListResponse,
  PreviewRequest,
  ProductManufactureStatus,
  ProductRecipeStatus,
  RecipeResponse,
  RecipesListResponse,
  RejectManufacturePayload,
  RejectRecipePayload,
} from "../types/manufacturing";

export interface ListRecipesParams {
  status?: ProductRecipeStatus;
}

export interface ListManufacturesParams {
  status?: ProductManufactureStatus;
  branchId?: string;
}

/**
 * Backend wire shape for all manufacturing endpoints.
 *  - /recipes        :  data: { recipe }  (POST, PATCH approve, PATCH reject)
 *  - /recipes list   :  data: { recipes }
 *  - /preview        :  data: <flat ManufacturePreview>  (NOT wrapped)
 *  - /manufactures   :  data: { manufacture }
 *  - /manufactures list: data: { manufactures }
 */
export const manufacturingApi = {
  // ----- Recipes -----

  // POST /api/manufacturing/recipes
  async createRecipe(
    payload: CreateRecipePayload
  ): Promise<{ success: boolean; message: string; data?: RecipeResponse }> {
    return apiFetch<RecipeResponse>("api/manufacturing/recipes", {
      method: "POST",
      body: payload,
    });
  },

  // GET /api/manufacturing/recipes?status=DRAFT|APPROVED|LOCKED|REJECTED
  async listRecipes(
    params?: ListRecipesParams
  ): Promise<{ success: boolean; message: string; data?: RecipesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    const query = queryParams.toString();
    const url = query
      ? `api/manufacturing/recipes?${query}`
      : "api/manufacturing/recipes";
    return apiFetch<RecipesListResponse>(url);
  },

  // PATCH /api/manufacturing/recipes/:recipeId/approve
  async approveRecipe(
    recipeId: string
  ): Promise<{ success: boolean; message: string; data?: RecipeResponse }> {
    return apiFetch<RecipeResponse>(
      `api/manufacturing/recipes/${recipeId}/approve`,
      { method: "PATCH" }
    );
  },

  // PATCH /api/manufacturing/recipes/:recipeId/reject
  async rejectRecipe(
    recipeId: string,
    payload: RejectRecipePayload = {}
  ): Promise<{ success: boolean; message: string; data?: RecipeResponse }> {
    return apiFetch<RecipeResponse>(
      `api/manufacturing/recipes/${recipeId}/reject`,
      { method: "PATCH", body: payload }
    );
  },

  // ----- Preview -----

  // POST /api/manufacturing/preview
  // Note: backend returns a FLAT object (no recipe wrapper) under `data`.
  async preview(
    payload: PreviewRequest
  ): Promise<{ success: boolean; message: string; data?: ManufacturePreview }> {
    return apiFetch<ManufacturePreview>("api/manufacturing/preview", {
      method: "POST",
      body: payload,
    });
  },

  // ----- Manufactures -----

  // POST /api/manufacturing/manufactures
  async createManufacture(
    payload: CreateManufacturePayload
  ): Promise<{ success: boolean; message: string; data?: ManufactureResponse }> {
    return apiFetch<ManufactureResponse>("api/manufacturing/manufactures", {
      method: "POST",
      body: payload,
    });
  },

  // GET /api/manufacturing/manufactures?status=...&branchId=...
  async listManufactures(
    params?: ListManufacturesParams
  ): Promise<{ success: boolean; message: string; data?: ManufacturesListResponse }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.branchId) queryParams.append("branchId", params.branchId);
    const query = queryParams.toString();
    const url = query
      ? `api/manufacturing/manufactures?${query}`
      : "api/manufacturing/manufactures";
    return apiFetch<ManufacturesListResponse>(url);
  },

  // PATCH /api/manufacturing/manufactures/:manufactureId/approve
  async approveManufacture(
    manufactureId: string
  ): Promise<{ success: boolean; message: string; data?: ManufactureResponse }> {
    return apiFetch<ManufactureResponse>(
      `api/manufacturing/manufactures/${manufactureId}/approve`,
      { method: "PATCH" }
    );
  },

  // PATCH /api/manufacturing/manufactures/:manufactureId/reject
  async rejectManufacture(
    manufactureId: string,
    payload: RejectManufacturePayload = {}
  ): Promise<{ success: boolean; message: string; data?: ManufactureResponse }> {
    return apiFetch<ManufactureResponse>(
      `api/manufacturing/manufactures/${manufactureId}/reject`,
      { method: "PATCH", body: payload }
    );
  },
};
