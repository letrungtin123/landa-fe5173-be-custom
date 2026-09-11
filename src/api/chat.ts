// ═══════════════════════════════════════════════════════════════
// Chat API — Conversations, Messages, SSE Stream (Learner)
// target = 'learner' for all bot resolution
// ═══════════════════════════════════════════════════════════════

import { apiClient } from "./client";
import { config } from "@/config/env";
import i18n from "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocaleStore } from "@/stores/useLocaleStore";

interface ApiResponse<T> { success: boolean; data: T; }
const AI_TOKEN_LIMIT_REACHED_CODE = "AI_TOKEN_LIMIT_REACHED";

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
  await apiClient.delete(`/api/ai-chatbot/chat/conversations/${id}`, {
    params: { target: 'learner' },
  });
}

// ── Messages (cursor-based pagination) ──

export async function fetchMessages(conversationId: string, cursor?: string): Promise<PaginatedMessages> {
  const params: Record<string, string> = { target: 'learner' };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<ApiResponse<PaginatedMessages>>(
    `/api/ai-chatbot/chat/conversations/${conversationId}/messages`,
    { params },
  );
  return data.data;
}

function streamText(key: string): string {
  return i18n.t(key, { lng: useLocaleStore.getState().locale });
}

function normalizeStreamErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err || "");
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
    return streamText("chat.connectionFailed");
  }
  return message || streamText("chat.connectionError");
}

function normalizeStreamErrorPayload(payload: unknown, fallbackKey: string): string {
  const data = payload as { code?: unknown; message?: unknown; error?: unknown };
  if (data?.code === AI_TOKEN_LIMIT_REACHED_CODE) return streamText("chat.aiTokenLimitReached");
  const rawMessage = data?.message ?? data?.error;
  if (useLocaleStore.getState().locale === "vi" && typeof rawMessage === "string" && rawMessage.trim()) {
    return rawMessage;
  }
  return streamText(fallbackKey);
}

/**
 * Send message and stream SSE response.
 * Returns an AbortController so caller can cancel.
 */
export function sendMessageStream(
  conversationId: string,
  content: string,
  courseId: string | undefined,
  inputMode: 'text' | 'voice',
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
        body: JSON.stringify({ content, target: 'learner', input_mode: inputMode, ...(courseId ? { courseId } : {}) }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = streamText('chat.serverConnectionFailed');
        try {
          const payload = await response.json();
          message = normalizeStreamErrorPayload(payload, 'chat.serverConnectionFailed');
        } catch {
          // Keep fallback message.
        }
        onError(message);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;
      let receivedError = false;
      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'chunk' && typeof event.text === 'string') onChunk(event.text);
          else if (event.type === 'done' && !receivedDone) { receivedDone = true; onDone(); }
          else if (event.type === 'error' && !receivedError) {
            receivedError = true;
            onError(normalizeStreamErrorPayload(event, 'chat.unknownError'));
          }
        } catch {
          // Skip malformed SSE lines.
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) processLine(line.trimEnd());
      }

      if (!receivedDone && !receivedError) onDone();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(normalizeStreamErrorMessage(err));
      }
    }
  })();

  return controller;
}
