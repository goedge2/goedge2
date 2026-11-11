import type { NodeTask } from "../pb/models/model_node_task_pb";

const nodeTaskTypes = new Map(
  Object.entries({
    configChanged: "同步配置",
    globalServerConfigChanged: "同步配置",
    ipItemChanged: "同步IP名单",
    scriptsChanged: "同步脚本",
    nodeLevelChanged: "同步L2节点",
    ddosProtectionChanged: "DDoS配置",
    userServersStateChanged: "用户网站状态",
    nodeVersionChanged: "同步节点版本",
    uamPolicyChanged: "UAM策略",
    httpPagesPolicyChanged: "自定义页面",
    httpCCPolicyChanged: "CC防护策略",
    http3PolicyChanged: "HTTP/3配置",
    networkSecurityPolicyChanged: "网络安全策略",
    webPPolicyChanged: "WebP配置",
    updatingServers: "更新网站",
    plusChanged: "同步扩展配置",
    toaChanged: "TOA配置",
  }),
);

export function getNodeTaskTypeLabel(type: string): string {
  if (type.startsWith("ipListDeleted")) {
    return "删除IP名单";
  }
  return nodeTaskTypes.get(type) ?? (type || "未知任务");
}

export function getNodeTaskStatus(task: Pick<NodeTask, "isDone" | "isOk" | "error">): {
  text: string;
  color: "success" | "error" | "processing";
  error?: string;
} {
  if (task.isDone && task.isOk) {
    return { text: "成功", color: "success" };
  }
  const error = task.error?.trim();
  if (task.isDone || error) {
    return { text: "失败", color: "error", error: error || "同步失败，未返回错误信息" };
  }
  return { text: "同步中", color: "processing" };
}
