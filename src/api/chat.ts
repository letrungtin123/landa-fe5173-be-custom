// ═══════════════════════════════════════════════════════════════
// Chat API — Conversations, Messages, SSE Stream (Learner)
// target = 'learner' for all bot resolution
// ═══════════════════════════════════════════════════════════════

import { apiClient } from "./client";
import { config } from "@/config/env";
import { useAuthStore } from "@/stores/useAuthStore";

interface ApiResponse<T> { success: boolean; data: T; }

// ── Types ──

export interface ActiveBot {
  id: string;
  tenant_id: string;
  target: string;
  bot_id: string;
  bot_name: string;
  bot_avatar_url: string | null;
  bot_kb_id: string | null;
}

export interface ChatConversation {
  id: string;
  tenant_id: string;
  bot_id: string;
  persona_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  persona_name?: string;
  persona_avatar_url?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedMessages {
  messages: ChatMessage[];
  has_more: boolean;
  next_cursor: string | null;
}

// ── Active Bot (target = learner) ──

export async function fetchActiveBot(): Promise<ActiveBot | null> {
  const { data } = await apiClient.get<ApiResponse<ActiveBot | null>>(
    "/api/ai-chatbot/chat/active-bot",
    { params: { target: 'learner' } },
  );
  return data.data;
}

// ── Conversations ──

export async function fetchConversations(): Promise<ChatConversation[]> {
  const { data } = await apiClient.get<ApiResponse<ChatConversation[]>>(
    "/api/ai-chatbot/chat/conversations",
    { params: { target: 'learner' } },
  );
  return data.data;
}

export async function createConversation(personaId: string): Promise<ChatConversation> {
  const { data } = await apiClient.post<ApiResponse<ChatConversation>>(
    "/api/ai-chatbot/chat/conversations",
    { persona_id: personaId },
    { params: { target: 'learner' } },
  );
  return data.data;
}

export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/api/ai-chatbot/chat/conversations/${id}`);
}

// ── Messages (cursor-based pagination) ──

export async function fetchMessages(conversationId: string, cursor?: string): Promise<PaginatedMessages> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<ApiResponse<PaginatedMessages>>(
    `/api/ai-chatbot/chat/conversations/${conversationId}/messages`,
    { params },
  );
  return data.data;
}

/**
 * Send message and stream SSE response.
 * Returns an AbortController so caller can cancel.
 */
export function sendMessageStream(
  conversationId: string,
  content: string,
  courseId: string | undefined,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (message: string) => void,
): AbortController {
  const controller = new AbortController();

  const { accessToken, user } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
  if (user?.role === 'superadmin' && user?.tenantId) {
    headers['X-Tenant-Id'] = user.tenantId;
  }

  const url = `${config.apiBaseUrl}/api/ai-chatbot/chat/conversations/${conversationId}/messages`;

  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, ...(courseId ? { courseId } : {}) }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        onError('Không thể kết nối đến server');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;
      let receivedError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'chunk') onChunk(event.text);
            else if (event.type === 'done') { receivedDone = true; onDone(); }
            else if (event.type === 'error') { receivedError = true; onError(event.message || 'Lỗi không xác định'); }
          } catch { /* skip malformed line */ }
        }
      }

      if (!receivedDone && !receivedError) onDone();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Lỗi kết nối');
      }
    }
  })();

  return controller;
}
