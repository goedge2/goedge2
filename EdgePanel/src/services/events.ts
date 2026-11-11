import { createEventSource, type EventSourceClient, type EventSourceMessage, type EventSourceOptions } from "eventsource-client";

import { getAuthorizationHeaders } from "../runtime/auth.ts";

export type GlobalTaskSummary = {
  hasNodeTasks: boolean;
  nodeTaskError: boolean;
  hasDNSTasks: boolean;
  dnsTaskError: boolean;
  unreadMessageCount: number;
};

export const EMPTY_GLOBAL_TASK_SUMMARY: GlobalTaskSummary = {
  hasNodeTasks: false,
  nodeTaskError: false,
  hasDNSTasks: false,
  dnsTaskError: false,
  unreadMessageCount: 0,
};

export type NodeTasksEventPayload = {
  hasTasks: boolean;
  hasError: boolean;
};

export type DNSTasksEventPayload = {
  hasTasks: boolean;
  hasError: boolean;
};

export type MessagesEventPayload = {
  unreadCount: number;
};

export type PingEventPayload = Record<string, never>;

export type SummaryEvent =
  | { type: "nodeTasks"; payload: NodeTasksEventPayload }
  | { type: "dnsTasks"; payload: DNSTasksEventPayload }
  | { type: "messages"; payload: MessagesEventPayload }
  | { type: "ping"; payload: PingEventPayload };

export type StreamError = {
  code?: number;
  message?: string;
  details?: unknown[];
};

type EventEnvelope = SummaryEvent | { type: "error"; payload: StreamError };
type CreateEventSource = (options: EventSourceOptions) => EventSourceClient;

export type SubscribeEventsOptions = {
  token: string | null | undefined;
  onEvent: (event: SummaryEvent) => void;
  onError?: (error: StreamError) => void;
  createEventSourceImpl?: CreateEventSource;
};

export const EVENTS_URL = "/api/events";

export function subscribeEvents({
  token,
  onEvent,
  onError,
  createEventSourceImpl = createEventSource,
}: SubscribeEventsOptions): EventSourceClient | null {
  if (!token) {
    return null;
  }

  return createEventSourceImpl({
    url: EVENTS_URL,
    method: "GET",
    headers: {
      ...getAuthorizationHeaders(token),
      Accept: "text/event-stream",
    },
    onMessage(message) {
      try {
        const event = parseEventMessage(message);
        if (!event) {
          return;
        }

        if (event.type === "error") {
          onError?.(event.payload);
          return;
        }

        onEvent(event);
      } catch (error) {
        onError?.(normalizeStreamError(error));
      }
    },
  });
}

export function mergeGlobalTaskSummaryEvent(summary: GlobalTaskSummary, event: SummaryEvent): GlobalTaskSummary {
  switch (event.type) {
    case "nodeTasks": {
      const nextHasNodeTasks = event.payload.hasTasks;
      const nextNodeTaskError = event.payload.hasError;

      if (summary.hasNodeTasks === nextHasNodeTasks && summary.nodeTaskError === nextNodeTaskError) {
        return summary;
      }

      return {
        ...summary,
        hasNodeTasks: nextHasNodeTasks,
        nodeTaskError: nextNodeTaskError,
      };
    }
    case "dnsTasks": {
      const nextHasDNSTasks = event.payload.hasTasks;
      const nextDNSTaskError = event.payload.hasError;

      if (summary.hasDNSTasks === nextHasDNSTasks && summary.dnsTaskError === nextDNSTaskError) {
        return summary;
      }

      return {
        ...summary,
        hasDNSTasks: nextHasDNSTasks,
        dnsTaskError: nextDNSTaskError,
      };
    }
    case "messages": {
      const nextUnreadMessageCount = event.payload.unreadCount;

      if (summary.unreadMessageCount === nextUnreadMessageCount) {
        return summary;
      }

      return {
        ...summary,
        unreadMessageCount: nextUnreadMessageCount,
      };
    }
    case "ping":
      return summary;
  }
}

function parseEventMessage(message: Pick<EventSourceMessage, "event" | "data">): EventEnvelope | undefined {
  if (!message.event) {
    return undefined;
  }

  const payload = parseEventPayload(message.data);

  switch (message.event) {
    case "nodeTasks":
      return {
        type: "nodeTasks",
        payload: {
          hasTasks: toBoolean(payload.hasTasks),
          hasError: toBoolean(payload.hasError),
        },
      };
    case "dnsTasks":
      return {
        type: "dnsTasks",
        payload: {
          hasTasks: toBoolean(payload.hasTasks),
          hasError: toBoolean(payload.hasError),
        },
      };
    case "messages":
      return {
        type: "messages",
        payload: {
          unreadCount: toNumber(payload.unreadCount),
        },
      };
    case "ping":
      return {
        type: "ping",
        payload: {},
      };
    case "error":
      return {
        type: "error",
        payload: normalizeStreamError(payload),
      };
    default:
      return undefined;
  }
}

function parseEventPayload(data: string): Record<string, unknown> {
  if (!data.trim()) {
    return {};
  }

  const value = JSON.parse(data) as unknown;
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeStreamError(error: unknown): StreamError {
  if (typeof error === "object" && error !== null) {
    const maybeRecord = error as Record<string, unknown>;

    return {
      code: typeof maybeRecord.code === "number" ? maybeRecord.code : undefined,
      message: typeof maybeRecord.message === "string" ? maybeRecord.message : undefined,
      details: Array.isArray(maybeRecord.details) ? maybeRecord.details : undefined,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return {};
}

function toBoolean(value: unknown): boolean {
  if (value === true || value === false) {
    return value;
  }
  if (value === "true" || value === "1" || value === 1) {
    return true;
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
