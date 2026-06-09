// Settings API service — matches AG-ERP-Backend/src/modules/settings
import { apiFetch } from "./api";
import { ApiResponse } from "../types/api";
import {
  SettingsResponse,
  UpdateSettingsPayload,
} from "../types/setting";

export const settingApi = {
  /**
   * GET /api/settings/get-all
   * Returns the singleton settings row. The backend auto-creates the
   * row on first read if it doesn't exist yet.
   */
  async getAll(): Promise<ApiResponse<SettingsResponse>> {
    return apiFetch<SettingsResponse>("api/settings/get-all");
  },

  /**
   * PATCH /api/settings/update
   * Body: { allowNegativeInventory?, allowNegativeTransaction? }
   * Returns the updated settings row.
   */
  async update(
    payload: UpdateSettingsPayload
  ): Promise<ApiResponse<SettingsResponse>> {
    return apiFetch<SettingsResponse>("api/settings/update", {
      method: "PATCH",
      body: payload,
    });
  },
};
