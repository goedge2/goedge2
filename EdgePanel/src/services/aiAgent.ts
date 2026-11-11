import { request } from "@umijs/max";

import { getAccessToken } from "@/runtime/auth";
import type { AIAgentAction, AIAgentConfigInput, AIAgentStoredAction, AIAgentStoredMessage, AIAgentStreamEvent } from "@/components/AIAgent/model";
import { AIAgentSSEDecoder, decodeStoredActions } from "@/components/AIAgent/model";

export type AIAgentConfigResponse = {
  enabled: boolean;
  provider: string;
  apiProtocol: string;
  endpoint: string;
  model: string;
  contextWindowTokens: string;
  maxOutputTokens: string;
  hasApiKey: boolean;
  apiKeyMask: string;
  telegramEnabled: boolean;
  hasTelegramToken: boolean;
  telegramTokenMask: string;
  telegramProxyURL: string;
  telegramBotUsername: string;
};

export type TelegramBinding = {
  bound: boolean;
  telegramUserId: string;
  telegramChatId: string;
  telegramUsername: string;
  sessionId: string;
  boundAt: string;
};

export type AIAgentSession = {
  id: string;
  title: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
};

export type AIAgentConversation = {
  messages: AIAgentStoredMessage[];
  actions: AIAgentAction[];
};

export const aiAgentQueryKeys = {
  config: ["settings", "ai-agent"] as const,
  sessions: ["ai-agent", "sessions"] as const,
  conversation: (sessionId: string) => ["ai-agent", "conversation", sessionId] as const,
  telegramBinding: ["ai-agent", "telegram-binding"] as const,
};

export function readAIAgentConfig() {
  return request<AIAgentConfigResponse>("/api/ai-agent/config");
}

export function updateAIAgentConfig(config: AIAgentConfigInput) {
  return request("/api/ai-agent/config", { method: "PUT", data: { config } });
}

export function testAIAgentConfig(config: AIAgentConfigInput) {
  return request("/api/ai-agent/config/test", { method: "POST", data: { config } });
}

export async function readTelegramBinding() {
  return request<{ binding?: TelegramBinding; botUsername?: string }>("/api/ai-agent/telegram/binding");
}

export async function createTelegramBinding(sessionId: string) {
  return request<{ binding?: TelegramBinding; bindURL: string; expiresAt: string; botUsername: string }>("/api/ai-agent/telegram/binding", {
    method: "POST",
    data: { sessionId, refresh: true },
  });
}

export function deleteTelegramBinding() {
  return request("/api/ai-agent/telegram/binding", { method: "DELETE" });
}

export async function listAIAgentSessions() {
  const response = await request<{ sessions?: AIAgentSession[] }>("/api/ai-agent/sessions", { params: { offset: 0, size: 100 } });
  return response.sessions ?? [];
}

export async function createAIAgentSession(title = "新对话") {
  const response = await request<{ session: AIAgentSession }>("/api/ai-agent/session", { method: "POST", data: { title } });
  return response.session;
}

export function renameAIAgentSession(sessionId: string, title: string) {
  return request(`/api/ai-agent/session/${encodeURIComponent(sessionId)}`, { method: "PUT", data: { sessionId, title } });
}

export function deleteAIAgentSession(sessionId: string) {
  return request(`/api/ai-agent/session/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export function clearAIAgentSession(sessionId: string) {
  return request(`/api/ai-agent/session/${encodeURIComponent(sessionId)}/messages`, { method: "DELETE" });
}

export async function readAIAgentConversation(sessionId: string): Promise<AIAgentConversation> {
  const pageSize = 500;
  const messages: AIAgentStoredMessage[] = [];
  let actions: AIAgentStoredAction[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await request<{ messages?: AIAgentStoredMessage[]; actions?: AIAgentStoredAction[] }>(
      `/api/ai-agent/session/${encodeURIComponent(sessionId)}/messages`,
      { params: { offset, size: pageSize } },
    );
    const page = response.messages ?? [];
    messages.push(...page);
    actions = response.actions ?? actions;
    if (page.length < pageSize) {
      break;
    }
  }
  return {
    messages,
    actions: decodeStoredActions(actions),
  };
}

export function cancelAIAgentAction(sessionId: string, actionId: string) {
  return request(`/api/ai-agent/session/${encodeURIComponent(sessionId)}/action/${encodeURIComponent(actionId)}/cancel`, {
    method: "POST",
    data: { sessionId, actionId },
  });
}

async function* streamAIAgentResponse(url: string, body: Record<string, string>, signal: AbortSignal): AsyncGenerator<AIAgentStreamEvent> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(getAccessToken() ? { Authorization: getAccessToken() as string } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || `请求失败（${response.status}）`);
  }
  const reader = response.body.getReader();
  const textDecoder = new TextDecoder();
  const sseDecoder = new AIAgentSSEDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    for (const event of sseDecoder.push(textDecoder.decode(value, { stream: true }))) {
      if (event.type === "error") {
        throw new Error(event.error || "AI Agent 请求失败");
      }
      yield event;
    }
  }
}

export function streamAIAgentChat(sessionId: string, text: string, signal: AbortSignal) {
  return streamAIAgentResponse(`/api/ai-agent/session/${encodeURIComponent(sessionId)}/chat`, { sessionId, text }, signal);
}

export function confirmAIAgentAction(sessionId: string, actionId: string, signal: AbortSignal) {
  return streamAIAgentResponse(
    `/api/ai-agent/session/${encodeURIComponent(sessionId)}/action/${encodeURIComponent(actionId)}/confirm`,
    { sessionId, actionId },
    signal,
  );
}
