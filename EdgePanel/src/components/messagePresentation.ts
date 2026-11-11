export type MessageLevelStatus = "error" | "warning" | "success" | "info";

export type MessagePresentation = {
  title: string;
  typeLabel: string;
  levelLabel: string;
  levelStatus: MessageLevelStatus;
};

export type HealthCheckFailure = {
  nodeId: string;
  nodeName: string;
  nodeAddr: string;
  error: string;
};

const messageTypes: Record<string, { title: string; typeLabel: string }> = {
  HealthCheckFailed: { title: "健康检查失败", typeLabel: "健康检查" },
  HealthCheckNodeUp: { title: "健康检查节点恢复", typeLabel: "健康检查" },
  HealthCheckNodeDown: { title: "健康检查节点下线", typeLabel: "健康检查" },
  NodeInactive: { title: "节点离线", typeLabel: "节点状态" },
  NodeActive: { title: "节点恢复在线", typeLabel: "节点状态" },
  ClusterDNSSyncFailed: { title: "集群 DNS 同步失败", typeLabel: "DNS 同步" },
  SSLCertExpiring: { title: "SSL 证书即将过期", typeLabel: "SSL 证书" },
  SSLCertACMETaskFailed: { title: "SSL 证书续期失败", typeLabel: "SSL 证书" },
  SSLCertACMETaskSuccess: { title: "SSL 证书续期成功", typeLabel: "SSL 证书" },
  LogCapacityOverflow: { title: "日志容量超限", typeLabel: "系统日志" },
  ServerNamesAuditingSuccess: { title: "网站域名审核通过", typeLabel: "域名审核" },
  ServerNamesAuditingFailed: { title: "网站域名审核失败", typeLabel: "域名审核" },
  serverNamesRequireAuditing: { title: "网站域名等待审核", typeLabel: "域名审核" },
  ThresholdSatisfied: { title: "节点阈值触发", typeLabel: "节点阈值" },
  FirewallEvent: { title: "防火墙事件", typeLabel: "安全事件" },
  IPAddrUp: { title: "节点 IP 恢复", typeLabel: "节点 IP" },
  IPAddrDown: { title: "节点 IP 异常", typeLabel: "节点 IP" },
  NSNodeInactive: { title: "DNS 节点离线", typeLabel: "DNS 节点" },
  NSNodeActive: { title: "DNS 节点恢复在线", typeLabel: "DNS 节点" },
  ReportNodeInactive: { title: "监控节点离线", typeLabel: "区域监控" },
  ReportNodeActive: { title: "监控节点恢复在线", typeLabel: "区域监控" },
  Connectivity: { title: "节点连通性异常", typeLabel: "节点连通性" },
  NodeSchedule: { title: "节点调度状态变更", typeLabel: "节点调度" },
  NodeOfflineDay: { title: "节点租期已结束", typeLabel: "节点租期" },
};

const levels: Record<string, Pick<MessagePresentation, "levelLabel" | "levelStatus">> = {
  error: { levelLabel: "错误", levelStatus: "error" },
  warning: { levelLabel: "警告", levelStatus: "warning" },
  success: { levelLabel: "成功", levelStatus: "success" },
  info: { levelLabel: "信息", levelStatus: "info" },
};

export function getMessagePresentation(type: string, level: string, body: string): MessagePresentation {
  const messageType = messageTypes[type];
  const messageLevel = levels[level] ?? levels.info;
  const fallbackTitle = body.split(/\r?\n/, 1)[0]?.trim() || "系统消息";

  return {
    title: messageType?.title ?? (type || fallbackTitle),
    typeLabel: messageType?.typeLabel ?? (type || "系统消息"),
    ...messageLevel,
  };
}

export function decodeMessageParams(value?: string | Uint8Array): unknown {
  if (!value) {
    return undefined;
  }

  try {
    const raw = typeof value === "string" ? decodeMessageParamsString(value) : new TextDecoder().decode(value);
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function getHealthCheckFailures(params: unknown): HealthCheckFailure[] {
  if (!Array.isArray(params)) {
    return [];
  }

  return params.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.node)) {
      return [];
    }

    const nodeId = String(item.node.id ?? "");
    const nodeName = stringValue(item.node.name);
    if (!isPositiveID(nodeId) || nodeName === "") {
      return [];
    }

    return [
      {
        nodeId,
        nodeName,
        nodeAddr: stringValue(item.nodeAddr),
        error: stringValue(item.error),
      },
    ];
  });
}

export function getMessageParameterID(params: unknown, key: string): string | undefined {
  if (!isRecord(params)) {
    return undefined;
  }

  const value = String(params[key] ?? "");
  return isPositiveID(value) ? value : undefined;
}

function decodeMessageParamsString(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(trimmed);
  }
  return Buffer.from(trimmed, "base64").toString("utf-8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isPositiveID(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}
