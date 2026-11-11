import type { ThreadMessageLike } from "@assistant-ui/react";

export type AIAgentProvider = "openaiCompatible" | "claude" | "gemini" | "ark" | "qwen";
export type AIAgentAPIProtocol = "chatCompletions" | "responses";

export type AIAgentConfigForm = {
  enabled: boolean;
  provider: AIAgentProvider;
  apiProtocol: AIAgentAPIProtocol;
  endpoint: string;
  apiKey: string;
  model: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  telegramEnabled: boolean;
  telegramToken: string;
  telegramProxyURL: string;
};

export type AIAgentConfigInput = Omit<AIAgentConfigForm, "contextWindowTokens" | "maxOutputTokens"> & {
  contextWindowTokens: string;
  maxOutputTokens: string;
  clearApiKey: boolean;
  telegramEnabled: boolean;
  telegramToken: string;
  telegramProxyURL: string;
  clearTelegramToken: boolean;
};

export const defaultContextWindowTokens = 200_000;

const sensitiveAIAgentArgumentKeys = new Set(["apikey", "certdata", "keydata", "ocsp", "passphrase", "password", "privatekey", "secret", "token"]);

export function formatAIAgentActionArguments(_toolName: string, argumentsJSON: Record<string, unknown> | undefined) {
  if (!argumentsJSON) {
    return {};
  }
  return redactAIAgentActionArgument(argumentsJSON) as Record<string, unknown>;
}

function redactAIAgentActionArgument(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactAIAgentActionArgument);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = sensitiveAIAgentArgumentKeys.has(key.toLowerCase()) ? "••••••••" : redactAIAgentActionArgument(item);
  }
  return result;
}

export function shouldShowAIAgentLauncher(config: Pick<AIAgentConfigForm, "enabled"> & { hasApiKey?: boolean }) {
  return config.enabled;
}

export function getAIAgentMessageDisplayMode(text: string, isRunning: boolean): "thinking" | "content" | "empty" {
  if (text.trim()) {
    return "content";
  }
  return isRunning ? "thinking" : "empty";
}

export function shouldShowAIAgentStreamingIndicator(text: string, isRunning: boolean) {
  return isRunning && text.trim().length > 0;
}

export type AIAgentStoredMessage = {
  id: string;
  role: string;
  contentJSON: string;
  status: string;
  error?: string;
};

export type AIAgentAction = {
  id: string;
  messageId: string;
  toolName: string;
  argumentsJSON?: Record<string, unknown>;
  resultJSON?: Record<string, unknown>;
  status: string;
  error?: string;
};

export type AIAgentStoredAction = Omit<AIAgentAction, "argumentsJSON" | "resultJSON"> & {
  argumentsJSON?: string;
  resultJSON?: string;
};

export type AIAgentStreamEvent = {
  type: string;
  text?: string;
  messageId?: string;
  actionId?: string;
  toolName?: string;
  argumentsJSON?: Record<string, unknown>;
  resultJSON?: Record<string, unknown>;
  status?: string;
  error?: string;
};

export type AIAgentGeometry = {
  version: 1;
  width: number;
  height: number;
  x: number;
  y: number;
};

export const geometryStorageKey = "edge-ai-agent-geometry-v1";
export const legacyGeometryStorageKey = "edge-ai-assistant-geometry-v1";

type GeometryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function migrateAIAgentGeometryStorage(storage: GeometryStorage) {
  const geometry = storage.getItem(geometryStorageKey);
  if (geometry) {
    return geometry;
  }
  const legacyGeometry = storage.getItem(legacyGeometryStorageKey);
  if (!legacyGeometry) {
    return null;
  }
  storage.setItem(geometryStorageKey, legacyGeometry);
  storage.removeItem(legacyGeometryStorageKey);
  return legacyGeometry;
}

const providerPresets: Record<AIAgentProvider, { endpoint: string; model: string; contextWindowTokens: number }> = {
  openaiCompatible: { endpoint: "https://api.openai.com/v1", model: "gpt-5.6", contextWindowTokens: 1050000 },
  claude: { endpoint: "https://api.anthropic.com", model: "claude-sonnet-5", contextWindowTokens: 1000000 },
  gemini: { endpoint: "https://generativelanguage.googleapis.com", model: "gemini-3.6-flash", contextWindowTokens: 1048576 },
  ark: { endpoint: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-seed-evolving", contextWindowTokens: 1024000 },
  qwen: { endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.8-max", contextWindowTokens: 1000000 },
};

export function getProviderPreset(provider: AIAgentProvider) {
  return providerPresets[provider];
}

export function buildConfigInput(
  values: AIAgentConfigForm,
  hasApiKey: boolean,
  clearApiKey: boolean,
  hasTelegramToken = false,
  clearTelegramToken = false,
): AIAgentConfigInput {
  return {
    ...values,
    apiKey: clearApiKey || !values.apiKey.trim() ? "" : values.apiKey.trim(),
    contextWindowTokens: String(values.contextWindowTokens),
    maxOutputTokens: String(values.maxOutputTokens),
    clearApiKey: clearApiKey && hasApiKey,
    telegramEnabled: Boolean(values.telegramEnabled),
    telegramToken: clearTelegramToken || !(values.telegramToken ?? "").trim() ? "" : values.telegramToken.trim(),
    telegramProxyURL: (values.telegramProxyURL ?? "").trim(),
    clearTelegramToken: clearTelegramToken && hasTelegramToken,
  };
}

function decodeBase64JSON(value: string): Record<string, unknown> {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

export function decodeStoredMessages(messages: AIAgentStoredMessage[]): ThreadMessageLike[] {
  const result: ThreadMessageLike[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }
    let content = "";
    let displayReasoning = "";
    try {
      const decoded = decodeBase64JSON(message.contentJSON);
      const messageContent = typeof decoded.content === "string" ? decoded.content : "";
      const displayContent = typeof decoded.displayContent === "string" ? decoded.displayContent : "";
      content = message.role === "assistant" && displayContent ? displayContent : messageContent;
      displayReasoning = message.role === "assistant" && typeof decoded.displayReasoning === "string" ? decoded.displayReasoning : "";
    } catch {
      content = "";
    }
    if (message.role === "user") {
      result.push({ id: message.id, role: "user", content: [{ type: "text", text: content }] });
      continue;
    }
    result.push({
      id: message.id,
      role: "assistant",
      content: [...(displayReasoning ? [{ type: "reasoning" as const, text: displayReasoning }] : []), { type: "text" as const, text: content }],
      status:
        message.status === "failed"
          ? { type: "incomplete", reason: "error", error: message.error || "生成失败" }
          : { type: "complete", reason: "stop" },
    });
  }
  return result;
}

export function decodeStoredActions(actions: AIAgentStoredAction[]): AIAgentAction[] {
  return actions.map(({ argumentsJSON, resultJSON, ...action }) => ({
    ...action,
    argumentsJSON: argumentsJSON ? decodeBase64JSON(argumentsJSON) : undefined,
    resultJSON: resultJSON ? decodeBase64JSON(resultJSON) : undefined,
  }));
}

function toAIAgentToolCallPart(action: AIAgentAction) {
  const args = action.argumentsJSON ?? {};
  const part: {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    argsText: string;
    result?: Record<string, unknown>;
    isError?: boolean;
  } = {
    type: "tool-call",
    toolCallId: action.id,
    toolName: action.toolName,
    args,
    argsText: JSON.stringify(args),
  };
  if (action.status === "cancelled") {
    part.result = { cancelled: true };
  } else if (action.status === "succeeded" || action.status === "failed") {
    part.result = action.resultJSON ?? (action.error ? { error: action.error } : {});
    if (action.status === "failed") {
      part.isError = true;
    }
  }
  return part;
}

export function attachAIAgentActionsToMessages(messages: ThreadMessageLike[], actions: AIAgentAction[]): ThreadMessageLike[] {
  const actionsByMessageID = new Map<string, AIAgentAction[]>();
  for (const action of actions) {
    const existing = actionsByMessageID.get(action.messageId) ?? [];
    existing.push(action);
    actionsByMessageID.set(action.messageId, existing);
  }
  return messages.map((message) => {
    if (message.role !== "assistant" || !message.id || !Array.isArray(message.content)) {
      return message;
    }
    const messageActions = actionsByMessageID.get(message.id);
    if (!messageActions?.length) {
      return message;
    }
    const status = messageActions.some((action) => action.status === "pending")
      ? { type: "requires-action" as const, reason: "tool-calls" as const }
      : messageActions.some((action) => action.status === "running")
        ? { type: "running" as const }
        : message.status;
    return {
      ...message,
      content: [...message.content, ...messageActions.map(toAIAgentToolCallPart)],
      status,
    };
  });
}

function normalizeEventPayload(type: string, payload: Record<string, unknown>): AIAgentStreamEvent {
  const event: AIAgentStreamEvent = { type };
  for (const key of ["text", "toolName", "status", "error"] as const) {
    if (typeof payload[key] === "string") {
      event[key] = payload[key];
    }
  }
  for (const [source, target] of [
    ["messageId", "messageId"],
    ["actionId", "actionId"],
  ] as const) {
    const value = payload[source];
    if (typeof value === "string" || typeof value === "number") {
      event[target] = String(value);
    }
  }
  if (typeof payload.argumentsJSON === "object" && payload.argumentsJSON !== null) {
    event.argumentsJSON = payload.argumentsJSON as Record<string, unknown>;
  }
  if (typeof payload.resultJSON === "object" && payload.resultJSON !== null) {
    event.resultJSON = payload.resultJSON as Record<string, unknown>;
  }
  return event;
}

export class AIAgentSSEDecoder {
  private buffer = "";

  push(chunk: string): AIAgentStreamEvent[] {
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const frames = this.buffer.split("\n\n");
    this.buffer = frames.pop() ?? "";
    const events: AIAgentStreamEvent[] = [];
    for (const frame of frames) {
      let eventType = "message";
      const data: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).trimStart());
        }
      }
      if (data.length === 0) {
        continue;
      }
      const payload = JSON.parse(data.join("\n")) as Record<string, unknown>;
      events.push(normalizeEventPayload(eventType, payload));
    }
    return events;
  }
}

export function applyActionEvent(actions: AIAgentAction[], event: AIAgentStreamEvent): AIAgentAction[] {
  if (!event.actionId || !event.toolName || !event.type.startsWith("action")) {
    return actions;
  }
  const existing = actions.find((action) => action.id === event.actionId);
  const next: AIAgentAction = {
    id: event.actionId,
    messageId: event.messageId ?? existing?.messageId ?? "0",
    toolName: event.toolName,
    argumentsJSON: event.argumentsJSON ?? existing?.argumentsJSON,
    resultJSON: event.resultJSON ?? existing?.resultJSON,
    status: event.status ?? existing?.status ?? "pending",
  };
  const error = event.error ?? existing?.error;
  if (error) {
    next.error = error;
  }
  return existing ? actions.map((action) => (action.id === next.id ? next : action)) : [...actions, next];
}

export function shouldReloadConversationAfterRun(events: readonly Pick<AIAgentStreamEvent, "type">[], isConfirmationRun = false) {
  return isConfirmationRun || events.some((event) => event.type === "actionPending");
}

export function getAIAgentConfirmationParentID(actionMessageID: string, fallbackMessageID: string | undefined) {
  return actionMessageID || fallbackMessageID || null;
}

export function shouldShowPostActionReplyIndicator(replyingActionId: string, actionId: string) {
  return Boolean(replyingActionId) && replyingActionId === actionId;
}

export type ActionResourceLink = {
  type: "server" | "certificate";
  id: string;
};

export function collectActionResourceLinks(result?: Record<string, unknown>): ActionResourceLink[] {
  if (!result) {
    return [];
  }
  const links: ActionResourceLink[] = [];
  const values = Array.isArray(result.sites)
    ? result.sites
    : Array.isArray(result.items)
      ? result.items
      : Array.isArray(result.results)
        ? result.results
        : [result];
  for (const value of values) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const item = value as Record<string, unknown>;
    if (typeof item.serverId === "number" || typeof item.serverId === "string") {
      links.push({ type: "server", id: String(item.serverId) });
    }
    if (!Array.isArray(item.sslCertIds)) {
      continue;
    }
    for (const certificateId of item.sslCertIds) {
      if (typeof certificateId === "number" || typeof certificateId === "string") {
        links.push({ type: "certificate", id: String(certificateId) });
      }
    }
  }
  return links;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function restoreAIAgentGeometry(raw: string | null, viewportWidth: number, viewportHeight: number): AIAgentGeometry {
  const defaultWidth = 440;
  const defaultHeight = 640;
  const defaults: AIAgentGeometry = {
    version: 1,
    width: Math.min(defaultWidth, viewportWidth - 32),
    height: Math.min(defaultHeight, viewportHeight - 40),
    x: Math.max(16, viewportWidth - defaultWidth - 24),
    y: Math.max(16, viewportHeight - defaultHeight - 24),
  };
  if (!raw) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AIAgentGeometry>;
    if (parsed.version !== 1) {
      return defaults;
    }
    const widthLimit = viewportWidth - 32;
    const heightLimit = viewportHeight - 40;
    const widthValue = typeof parsed.width === "number" ? parsed.width : Number.NaN;
    const heightValue = typeof parsed.height === "number" ? parsed.height : Number.NaN;
    const width = clamp(Number.isFinite(widthValue) ? widthValue : defaults.width, 360, widthLimit);
    const height = clamp(Number.isFinite(heightValue) ? heightValue : defaults.height, 480, heightLimit);
    const xValue = typeof parsed.x === "number" ? parsed.x : Number.NaN;
    const yValue = typeof parsed.y === "number" ? parsed.y : Number.NaN;
    return {
      version: 1,
      width,
      height,
      x: clamp(Number.isFinite(xValue) ? xValue : viewportWidth - width - 24, 16, viewportWidth - width - 24),
      y: clamp(Number.isFinite(yValue) ? yValue : viewportHeight - height - 24, 16, viewportHeight - height - 24),
    };
  } catch {
    return defaults;
  }
}
