import { request } from "@umijs/max";

import type { TimeDuration } from "../pb/models/model_config_shared_pb";
import type { NodeAction } from "../pb/models/model_node_action_pb";
import type { CreateNodeActionResponse, FindAllNodeActionsResponse, FindNodeActionResponse } from "../pb/service_node_action_pb";
import type { FindAllNodeScheduleInfoWithNodeClusterIdResponse, FindNodeScheduleInfoResponse } from "../pb/service_node_pb";

export type ScheduleScope = "cluster" | "node";

export type NodeScheduleFormValues = {
  offlineDay?: string;
  isBackupForCluster?: boolean;
  isBackupForGroup?: boolean;
  backupIPsText?: string;
};

export type ScheduleActionCondValue =
  | string
  | number
  | {
      count: string;
      unit: string;
    };

export type ScheduleActionCondDraft = {
  param: string;
  operator: string;
  value: ScheduleActionCondValue;
};

export type ScheduleActionDraft = {
  conds: ScheduleActionCondDraft[];
  connector: string;
  actionCode: string;
  webhookURL?: string;
  durationCount: number;
  durationUnit: string;
  isOn: boolean;
};

export async function getNodeSchedule(nodeId: string) {
  return request<FindNodeScheduleInfoResponse>(`/api/node/${nodeId}/schedule`);
}

export async function updateNodeSchedule(nodeId: string, payload: NodeScheduleFormValues) {
  return request(`/api/node/${nodeId}/schedule`, {
    method: "PUT",
    data: {
      nodeId: Number(nodeId),
      offlineDay: payload.offlineDay || "",
      isBackupForCluster: payload.isBackupForCluster === true,
      isBackupForGroup: payload.isBackupForGroup === true,
      backupIPs: splitBackupIPs(payload.backupIPsText),
    },
  });
}

export async function listClusterScheduleNodes(clusterId: string) {
  return request<FindAllNodeScheduleInfoWithNodeClusterIdResponse>(`/api/cluster/${clusterId}/schedule/nodes`);
}

export async function resetNodeScheduleActionStatus(nodeId: string) {
  return request(`/api/node/${nodeId}/schedule/reset-action-status`, {
    method: "POST",
    data: {
      nodeId: Number(nodeId),
    },
  });
}

export async function copyNodeScheduleActionsToGroup(nodeId: string) {
  return request(`/api/node/${nodeId}/schedule/actions/copy-to-group`, {
    method: "POST",
    data: {
      nodeId: Number(nodeId),
    },
  });
}

export async function copyNodeScheduleActionsToCluster(nodeId: string) {
  return request(`/api/node/${nodeId}/schedule/actions/copy-to-cluster`, {
    method: "POST",
    data: {
      nodeId: Number(nodeId),
    },
  });
}

export async function listNodeScheduleActions(nodeId: string) {
  return request<FindAllNodeActionsResponse>(`/api/node/${nodeId}/schedule/actions`, {
    params: {
      nodeId: Number(nodeId),
      role: "node",
    },
  });
}

export async function getNodeScheduleAction(nodeActionId: string) {
  return request<FindNodeActionResponse>(`/api/node/schedule/actions/${nodeActionId}`);
}

export async function createNodeScheduleAction(nodeId: string, payload: Record<string, unknown>) {
  return request<CreateNodeActionResponse>(`/api/node/${nodeId}/schedule/actions`, {
    method: "POST",
    data: {
      nodeId: Number(nodeId),
      role: "node",
      ...payload,
    },
  });
}

export async function updateNodeScheduleAction(nodeActionId: string, payload: Record<string, unknown>) {
  return request(`/api/node/schedule/actions/${nodeActionId}`, {
    method: "PUT",
    data: {
      nodeActionId: Number(nodeActionId),
      ...payload,
    },
  });
}

export async function deleteNodeScheduleAction(nodeActionId: string) {
  return request(`/api/node/schedule/actions/${nodeActionId}`, {
    method: "DELETE",
  });
}

export async function reorderNodeScheduleActions(nodeActionIds: string[]) {
  return request("/api/node/schedule/actions/reorder", {
    method: "POST",
    data: {
      nodeActionIds: nodeActionIds.map((id) => Number(id)),
    },
  });
}

export function splitBackupIPs(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function joinBackupIPs(values?: string[]) {
  return (values ?? []).join("\n");
}

export type NodeScheduleActionRecord = NodeAction;
export type ScheduleDuration = TimeDuration;
