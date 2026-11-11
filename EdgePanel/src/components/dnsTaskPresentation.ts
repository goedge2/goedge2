import type { DNSTask } from "../pb/models/model_dns_task_pb";

type DNSTaskObject = {
  id?: bigint | string | number;
  name?: string;
};

type DNSTaskTargetInput = {
  type: string;
  nodeCluster?: DNSTaskObject | null;
  node?: DNSTaskObject | null;
  server?: DNSTaskObject | null;
  dnsDomain?: DNSTaskObject | null;
};

type DNSTaskType = {
  label: string;
  action: string;
  target: "nodeCluster" | "node" | "server" | "dnsDomain";
  path?: (id: string) => string;
};

const clusterPath = (id: string) => `/clusters/${id}/dashboard`;
const dnsTaskTypes = new Map<string, DNSTaskType>([
  ["clusterChange", { label: "集群", action: "同步集群 DNS 配置", target: "nodeCluster", path: clusterPath }],
  ["clusterNodesChange", { label: "集群", action: "同步集群节点记录", target: "nodeCluster", path: clusterPath }],
  ["clusterRemoveDomain", { label: "集群", action: "移除集群域名记录", target: "nodeCluster", path: clusterPath }],
  ["nodeChange", { label: "节点", action: "同步节点 DNS 记录", target: "node", path: (id) => `/clusters/nodes/${id}/details` }],
  ["serverChange", { label: "网站", action: "同步网站 DNS 记录", target: "server", path: (id) => `/servers/${id}/settings` }],
  ["domainChange", { label: "域名", action: "同步域名 DNS 记录", target: "dnsDomain" }],
]);

export function getDNSTaskPresentation(task: DNSTaskTargetInput): {
  typeLabel: string;
  action?: string;
  targetName: string;
  targetLink?: string;
} {
  const taskType = dnsTaskTypes.get(task.type);
  if (!taskType) {
    return { typeLabel: task.type || "未知任务", targetName: "未知对象" };
  }

  const target = task[taskType.target];
  const id = String(target?.id ?? "");
  const hasID = /^[1-9]\d*$/.test(id);
  return {
    typeLabel: taskType.label,
    action: taskType.action,
    targetName: target?.name?.trim() || (hasID ? `${taskType.label} #${id}` : `未知${taskType.label}`),
    targetLink: hasID ? taskType.path?.(id) : undefined,
  };
}

export function getDNSTaskStatus(task: Pick<DNSTask, "isDone" | "isOk" | "error">): {
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
