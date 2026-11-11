import { request } from "@umijs/max";

import type { MessageReceiver } from "../pb/models/model_message_receiver_pb";
import type { NodeThreshold } from "../pb/models/model_node_threshold_pb";
import type { FindAllEnabledMessageReceiversResponse } from "../pb/service_message_receiver_pb";
import type {
  CreateNodeThresholdResponse,
  FindAllEnabledNodeThresholdsResponse,
  FindEnabledNodeThresholdResponse,
  FindNodeThresholdDefinitionsResponse,
} from "../pb/service_node_threshold_pb";

export type ThresholdScope = "cluster" | "node";

export type ThresholdListParams = {
  scope: ThresholdScope;
  clusterId: string;
  nodeId?: string;
};

export type NodeThresholdDraft = {
  item: string;
  param: string;
  operator: string;
  value: string;
  duration: number;
  message: string;
  notifyDuration: number;
  isOn: boolean;
};

type ThresholdTargetParams = {
  role: string;
  nodeClusterId: number;
  nodeId: number;
};

function buildThresholdTargetParams(params: ThresholdListParams): ThresholdTargetParams {
  return {
    role: "node",
    nodeClusterId: Number(params.clusterId),
    nodeId: params.scope === "node" ? Number(params.nodeId ?? "0") : 0,
  };
}

export async function listNodeThresholds(params: ThresholdListParams) {
  return request<FindAllEnabledNodeThresholdsResponse>("/api/node-thresholds", {
    params: buildThresholdTargetParams(params),
  });
}

export async function getNodeThreshold(nodeThresholdId: string) {
  return request<FindEnabledNodeThresholdResponse>(`/api/node-threshold/${nodeThresholdId}`);
}

export async function getNodeThresholdDefinitions() {
  return request<FindNodeThresholdDefinitionsResponse>("/api/node-threshold-definitions");
}

export async function createNodeThreshold(params: ThresholdListParams, payload: NodeThresholdDraft, valueJSON: string) {
  return request<CreateNodeThresholdResponse>("/api/node-threshold", {
    method: "POST",
    data: {
      ...buildThresholdTargetParams(params),
      item: payload.item,
      param: payload.param,
      operator: payload.operator,
      valueJSON,
      message: payload.message,
      duration: payload.duration,
      durationUnit: "minute",
      sumMethod: "avg",
      notifyDuration: payload.notifyDuration,
    },
  });
}

export async function updateNodeThreshold(nodeThresholdId: string, payload: NodeThresholdDraft, valueJSON: string) {
  return request(`/api/node-threshold/${nodeThresholdId}`, {
    method: "PUT",
    data: {
      nodeThresholdId: Number(nodeThresholdId),
      item: payload.item,
      param: payload.param,
      operator: payload.operator,
      valueJSON,
      message: payload.message,
      duration: payload.duration,
      durationUnit: "minute",
      sumMethod: "avg",
      notifyDuration: payload.notifyDuration,
      isOn: payload.isOn,
    },
  });
}

export async function deleteNodeThreshold(nodeThresholdId: string) {
  return request(`/api/node-threshold/${nodeThresholdId}`, {
    method: "DELETE",
  });
}

export async function listClusterMessageReceivers(clusterId: string) {
  return request<FindAllEnabledMessageReceiversResponse>("/api/message-receivers", {
    params: {
      role: "node",
      nodeClusterId: Number(clusterId),
      nodeId: 0,
      serverId: 0,
    },
  });
}

export async function updateClusterMessageReceivers(payload: Record<string, unknown>) {
  return request("/api/message-receivers", {
    method: "PUT",
    data: payload,
  });
}

export type NodeThresholdRecord = NodeThreshold;
export type MessageReceiverRecord = MessageReceiver;
