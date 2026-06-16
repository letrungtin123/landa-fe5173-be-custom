import axios from "axios";
import { config } from "@/config/env";
import type { ApiResponse, LoginResponse } from "@/api/types";

export type SsoProvider = "google" | "keycloak" | "microsoft365";

export interface PublicSsoProvider {
  provider: SsoProvider;
  label: string;
  client_id: string;
  authorization_url: string;
  scopes: string[];
  callback_path: string;
}

export interface PublicSsoConfig {
  tenant_id: string | null;
  tenant_name: string | null;
  providers: PublicSsoProvider[];
}

export async function fetchPublicSsoConfigByDomain(domain: string): Promise<PublicSsoConfig> {
  const baseURL = config.apiBaseUrl || "";
  const { data } = await axios.get<ApiResponse<PublicSsoConfig>>(
    `${baseURL}/api/sso/public/by-domain/${encodeURIComponent(domain)}`,
    { timeout: 10_000 },
  );
  return data.data;
}

export async function exchangeSsoCode(
  provider: SsoProvider,
  payload: { tenant_id: string; code: string; redirect_uri: string; code_verifier: string; client_app?: "admin" | "learner" },
): Promise<LoginResponse> {
  const baseURL = config.apiBaseUrl || "";
  const { data } = await axios.post<ApiResponse<LoginResponse>>(
    `${baseURL}/api/sso/exchange/${provider}`,
    payload,
    { headers: { "Content-Type": "application/json" }, timeout: 20_000 },
  );
  return data.data;
}
