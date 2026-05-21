// Meta API Service - States and Cities
import { apiFetch } from "./api";

interface State {
  name: string;
  isoCode: string;
  stateCode: string;
}

interface City {
  name: string;
}

export interface StatesResponse {
  states: State[];
}

export interface CitiesResponse {
  cities: City[];
}

export const metaApi = {
  async getStates(): Promise<{ success: boolean; message: string; data?: StatesResponse }> {
    return apiFetch<StatesResponse>("api/meta/states");
  },

  async getCities(isoCode: string): Promise<{ success: boolean; message: string; data?: CitiesResponse }> {
    return apiFetch<CitiesResponse>(`api/meta/cities/${isoCode}`);
  },
};