import { request } from "@umijs/max";

import type { ReadUIConfigResponse } from "../pb/service_sys_setting_pb";

export { EMPTY_GLOBAL_TASK_SUMMARY, mergeGlobalTaskSummaryEvent, EVENTS_URL, subscribeEvents } from "./events";
export type {
  GlobalTaskSummary,
  DNSTasksEventPayload,
  MessagesEventPayload,
  NodeTasksEventPayload,
  PingEventPayload,
  StreamError,
  SummaryEvent,
  SubscribeEventsOptions,
} from "./events";

export async function readShellUIConfig(): Promise<ReadUIConfigResponse> {
  return request<ReadUIConfigResponse>("/api/settings/ui", {
    skipErrorHandler: true,
  });
}

export async function readAdminProfile() {
  return request("/api/admin/profile", {
    skipErrorHandler: true,
  });
}
