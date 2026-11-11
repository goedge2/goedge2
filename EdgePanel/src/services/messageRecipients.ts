import { request } from "@umijs/max";

import type { FindAllMessageMediasResponse } from "../pb/service_message_media_pb";
import type { FindAllEnabledMessageRecipientGroupsResponse } from "../pb/service_message_recipient_group_pb";
import type { ListEnabledMessageMediaInstancesResponse, TestMessageMediaInstanceRequest } from "../pb/service_message_media_instance_pb";
import type { ListEnabledMessageRecipientsResponse, TestMessageRecipientRequest } from "../pb/service_message_recipient_pb";
import type { DeleteMessageReceiverRequest, FindAllEnabledMessageReceiversWithMessageRecipientIdResponse } from "../pb/service_message_receiver_pb";
import type { ListMessageTaskLogsResponse } from "../pb/service_message_task_log_pb";
import type { ListMessageTasksWithStatusResponse, SendMessageTaskRequest } from "../pb/service_message_task_pb";
import { getOffset, getPage, getSize, searchParamsToObject, withoutKeys } from "./searchParams";

export async function listMessageRecipients(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);

  return request<ListEnabledMessageRecipientsResponse>("/api/message-recipients", {
    params: {
      ...searchParamsToObject(searchParams),
      offset,
      size,
    },
  });
}

export async function createMessageRecipient(data: Record<string, unknown>) {
  return request("/api/message-recipient", {
    method: "POST",
    data,
  });
}

export async function updateMessageRecipient(data: Record<string, unknown>) {
  return request("/api/message-recipient", {
    method: "PUT",
    data,
  });
}

export async function deleteMessageRecipient(messageRecipientId: string | number | bigint) {
  return request("/api/message-recipient", {
    method: "DELETE",
    params: { messageRecipientId: String(messageRecipientId) },
  });
}

export async function testMessageRecipient(data: TestMessageRecipientRequest | Record<string, unknown>) {
  return request("/api/message-recipient/test", {
    method: "POST",
    data,
  });
}

export async function listMessageRecipientReceivers(messageRecipientId: string | number | bigint) {
  return request<FindAllEnabledMessageReceiversWithMessageRecipientIdResponse>(`/api/message-recipient/${String(messageRecipientId)}/receivers`);
}

export async function deleteMessageReceiver(data: DeleteMessageReceiverRequest | Record<string, unknown>) {
  return request("/api/message-receiver", {
    method: "DELETE",
    params: data,
  });
}

export async function listMessageRecipientGroups() {
  return request<FindAllEnabledMessageRecipientGroupsResponse>("/api/message-recipient-groups");
}

export async function createMessageRecipientGroup(data: Record<string, unknown>) {
  return request("/api/message-recipient-group", {
    method: "POST",
    data,
  });
}

export async function updateMessageRecipientGroup(data: Record<string, unknown>) {
  return request("/api/message-recipient-group", {
    method: "PUT",
    data,
  });
}

export async function deleteMessageRecipientGroup(messageRecipientGroupId: string | number | bigint) {
  return request("/api/message-recipient-group", {
    method: "DELETE",
    params: { messageRecipientGroupId: String(messageRecipientGroupId) },
  });
}

export async function listMessageMedias() {
  return request<FindAllMessageMediasResponse>("/api/message-medias");
}

export async function listMessageMediaInstances(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);

  return request<ListEnabledMessageMediaInstancesResponse>("/api/message-media-instances", {
    params: {
      ...searchParamsToObject(searchParams),
      offset,
      size,
    },
  });
}

export async function createMessageMediaInstance(data: Record<string, unknown>) {
  return request("/api/message-media-instance", {
    method: "POST",
    data,
  });
}

export async function updateMessageMediaInstance(data: Record<string, unknown>) {
  return request("/api/message-media-instance", {
    method: "PUT",
    data,
  });
}

export async function deleteMessageMediaInstance(messageMediaInstanceId: string | number | bigint) {
  return request("/api/message-media-instance", {
    method: "DELETE",
    params: { messageMediaInstanceId: String(messageMediaInstanceId) },
  });
}

export async function testMessageMediaInstance(data: TestMessageMediaInstanceRequest | Record<string, unknown>) {
  return request("/api/message-media-instance/test", {
    method: "POST",
    data,
  });
}

export async function listMessageTaskLogs(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);

  return request<ListMessageTaskLogsResponse>("/api/message-task-logs", {
    params: {
      ...searchParamsToObject(searchParams),
      offset,
      size,
    },
  });
}

export async function listMessageTasks(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);
  const params = withoutKeys(searchParamsToObject(searchParams), ["page", "size"]);

  return request<ListMessageTasksWithStatusResponse>("/api/message-tasks", {
    params: {
      ...params,
      offset,
      size,
    },
  });
}

export async function deleteMessageTask(messageTaskId: string | number | bigint) {
  return request("/api/message-task", {
    method: "DELETE",
    params: { messageTaskId: String(messageTaskId) },
  });
}

export async function sendMessageTask(data: SendMessageTaskRequest | Record<string, unknown>) {
  return request("/api/message-task/send", {
    method: "POST",
    data,
  });
}
