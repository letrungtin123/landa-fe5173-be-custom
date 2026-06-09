// ═══════════════════════════════════════════════════════════════
// Chatbot API — Minimal: only fetchBotPersonas for chat widget
// ═══════════════════════════════════════════════════════════════

import { apiClient } from "./client";

interface ApiResponse<T> { success: boolean; data: T; }

export interface BotPersona {
  id: string;
  bot_id: string;
  template_id: string;
  template_name: string;
  template_description: string | null;
  template_avatar_url: string | null;
  template_fullbody_url: string | null;
  custom_name: string | null;
  custom_description: string | null;
  custom_prompt: string | null;
}

export async function fetchBotPersonas(botId: string): Promise<BotPersona[]> {
  const { data } = await apiClient.get<ApiResponse<BotPersona[]>>(`/api/ai-chatbot/bots/${botId}/personas`);
  return data.data;
}
