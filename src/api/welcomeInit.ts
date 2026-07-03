import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export interface WelcomeInitState {
  should_show: boolean;
  has_seen: boolean;
  is_demo_account: boolean;
  shown_at: string | null;
  setup_required?: boolean;
}

export async function getWelcomeInitStateApi(): Promise<WelcomeInitState> {
  const { data } = await apiClient.get<ApiResponse<WelcomeInitState>>(
    "/api/welcome-init/state"
  );
  return data.data;
}

export async function markWelcomeInitSeenApi(): Promise<WelcomeInitState> {
  const { data } = await apiClient.post<ApiResponse<WelcomeInitState>>(
    "/api/welcome-init/seen"
  );
  return data.data;
}
