// Settings types — matches AG-ERP-Backend/src/modules/settings
//
// All endpoints sit behind authMiddleware. The list endpoint returns
// { data: Settings } (single object — settings is a singleton row).
// The update endpoint accepts a partial of the mutable flags and
// returns { data: Settings }.

export interface Settings {
  id: string;
  allowNegativeInventory: boolean;
  allowNegativeTransaction: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** PATCH body for /api/settings/update. Both fields are optional so
 *  the form can save one at a time. */
export interface UpdateSettingsPayload {
  allowNegativeInventory?: boolean;
  allowNegativeTransaction?: boolean;
}

export interface SettingsResponse {
  data: Settings;
}
