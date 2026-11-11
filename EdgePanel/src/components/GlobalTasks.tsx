import { Modal, Button, message, Space, Tag, Badge, Typography } from "antd";
import { ProTable, ProColumns, ActionType } from "@ant-design/pro-components";
import { useQueryClient } from "@tanstack/react-query";
import { Link, request } from "@umijs/max";
import { useRef, useState } from "react";
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { NodeTask } from "../pb/models/model_node_task_pb";
import type { DNSTask } from "../pb/models/model_dns_task_pb";
import type { Message } from "../pb/models/model_message_pb";
import { shellQueryKeys } from "../queries/keys";
import { EMPTY_GLOBAL_TASK_SUMMARY, type GlobalTaskSummary } from "../services/shell";
import { useDefaultPageSize } from "../runtime/shellQueries";
import TableActionIcon from "./TableActionIcon";
import { decodeMessageParams, getHealthCheckFailures, getMessageParameterID, getMessagePresentation } from "./messagePresentation";
import { getNodeTaskStatus, getNodeTaskTypeLabel } from "./nodeTaskPresentation";
import { getDNSTaskPresentation, getDNSTaskStatus } from "./dnsTaskPresentation";

interface ClusterTask {
  clusterId: string;
  clusterName: string;
  nodeTasks: NodeTask[];
}

type NodeTaskRow = NodeTask & {
  clusterId: string;
  clusterName?: string;
};

function NodeTaskTarget({ record, onNavigate }: { record: NodeTaskRow; onNavigate: () => void }) {
  const nodeId = record.node?.id;
  const hasNode = nodeId !== undefined && nodeId > 0n;
  const hasCluster = Number(record.clusterId) > 0;
  const nodeName = record.node?.name || (hasNode ? `节点 #${nodeId}` : "未知节点");
  const clusterName = record.clusterName || (hasCluster ? `集群 #${record.clusterId}` : "未知集群");

  return (
    <div style={{ display: "grid", gap: 4, overflowWrap: "anywhere" }}>
      {hasNode ? (
        <Link onClick={onNavigate} to={`/clusters/nodes/${nodeId}/details`} title={`节点 ID: ${nodeId}`}>
          {nodeName}
        </Link>
      ) : (
        <span>{nodeName}</span>
      )}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        集群：
        {hasCluster ? (
          <Link onClick={onNavigate} to={`/clusters/${record.clusterId}/dashboard`}>
            {clusterName}
          </Link>
        ) : (
          clusterName
        )}
      </Typography.Text>
    </div>
  );
}

function TaskStatus({ status }: { status: ReturnType<typeof getNodeTaskStatus> }) {
  return (
    <div style={{ display: "grid", justifyItems: "start", gap: 4 }}>
      <Tag color={status.color}>{status.text}</Tag>
      {status.error && (
        <Typography.Text type="danger" style={{ fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {status.error}
        </Typography.Text>
      )}
    </div>
  );
}

function updateTaskSummaryCache(queryClient: ReturnType<typeof useQueryClient>, updater: (summary: GlobalTaskSummary) => GlobalTaskSummary) {
  queryClient.setQueryData<GlobalTaskSummary>(shellQueryKeys.taskSummary(), (current) => {
    return updater(current ?? EMPTY_GLOBAL_TASK_SUMMARY);
  });
}

export function NodeTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actionRef = useRef<ActionType>(null);
  const defaultPageSize = useDefaultPageSize();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => request(`/api/node-tasks/${id}`, { method: "DELETE" })));
      message.success("删除成功");
      actionRef.current?.reload();
      setSelectedRowKeys([]);
    } catch {
      message.error("删除失败");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await request("/api/node-tasks", { method: "DELETE" });
      message.success("删除成功");
      actionRef.current?.reload();
      updateTaskSummaryCache(queryClient, (summary) => ({
        ...summary,
        hasNodeTasks: false,
        nodeTaskError: false,
      }));
    } catch {
      message.error("删除失败");
    }
  };

  const columns: ProColumns<NodeTaskRow>[] = [
    {
      title: "节点 / 集群",
      dataIndex: ["node", "name"],
      width: 220,
      render: (_, record) => <NodeTaskTarget record={record} onNavigate={onClose} />,
    },
    {
      title: "类型",
      dataIndex: "type",
      width: 140,
      renderText: getNodeTaskTypeLabel,
    },
    {
      title: "状态",
      dataIndex: "isDone",
      render: (_, record) => <TaskStatus status={getNodeTaskStatus(record)} />,
    },
    {
      title: "触发时间",
      dataIndex: "updatedAt",
      width: 120,
      valueType: "fromNow",
      renderText: (text) => (text ? Number(text) * 1000 : 0),
    },
    {
      title: "操作",
      valueType: "option",
      width: 64,
      render: (_, record) => [
        <TableActionIcon key="delete" tooltip="删除" icon={<DeleteOutlined />} danger onClick={() => handleDelete([String(record.id)])} />,
      ],
    },
  ];

  return (
    <Modal
      title="节点同步任务"
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <ProTable<NodeTaskRow>
        headerTitle={
          <Space>
            <Button danger disabled={selectedRowKeys.length === 0} onClick={() => handleDelete(selectedRowKeys.map(String))}>
              批量删除
            </Button>
            <Button danger type="primary" onClick={handleDeleteAll}>
              删除所有
            </Button>
          </Space>
        }
        actionRef={actionRef}
        rowKey="id"
        tableLayout="fixed"
        scroll={{ x: 760 }}
        search={false}
        options={{
          reload: () => actionRef.current?.reload(),
        }}
        pagination={{ pageSize: defaultPageSize }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        request={async () => {
          try {
            const data = await request<{ clusterTasks: ClusterTask[] }>("/api/node-cluster-tasks");
            // Flatten the structure
            const allTasks: NodeTaskRow[] = [];
            data.clusterTasks?.forEach((cluster) => {
              cluster.nodeTasks?.forEach((task) => {
                allTasks.push({ ...task, clusterId: cluster.clusterId, clusterName: cluster.clusterName });
              });
            });
            return {
              data: allTasks,
              success: true,
              total: allTasks.length,
            };
          } catch {
            return { success: false };
          }
        }}
        columns={columns}
      />
    </Modal>
  );
}

function DNSTaskTarget({ record, onNavigate }: { record: DNSTask; onNavigate: () => void }) {
  const presentation = getDNSTaskPresentation(record);
  return (
    <div style={{ display: "grid", gap: 4, overflowWrap: "anywhere" }}>
      {presentation.targetLink ? (
        <Link onClick={onNavigate} to={presentation.targetLink}>
          {presentation.targetName}
        </Link>
      ) : (
        <span>{presentation.targetName}</span>
      )}
      {presentation.action && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {presentation.action}
        </Typography.Text>
      )}
    </div>
  );
}

export function DNSTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actionRef = useRef<ActionType>(null);
  const defaultPageSize = useDefaultPageSize();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => request(`/api/dns-tasks/${id}`, { method: "DELETE" })));
      message.success("删除成功");
      actionRef.current?.reload();
      setSelectedRowKeys([]);
    } catch {
      message.error("删除失败");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await request("/api/dns-tasks", { method: "DELETE" });
      message.success("删除成功");
      actionRef.current?.reload();
      updateTaskSummaryCache(queryClient, (summary) => ({
        ...summary,
        hasDNSTasks: false,
        dnsTaskError: false,
      }));
    } catch {
      message.error("删除失败");
    }
  };

  const columns: ProColumns<DNSTask>[] = [
    {
      title: "对象",
      key: "target",
      width: 260,
      render: (_, record) => <DNSTaskTarget record={record} onNavigate={onClose} />,
    },
    {
      title: "类型",
      dataIndex: "type",
      width: 100,
      render: (_, record) => getDNSTaskPresentation(record).typeLabel,
    },
    {
      title: "状态",
      dataIndex: "isDone",
      render: (_, record) => <TaskStatus status={getDNSTaskStatus(record)} />,
    },
    {
      title: "触发时间",
      dataIndex: "updatedAt",
      width: 120,
      valueType: "fromNow",
      renderText: (text) => (text ? Number(text) * 1000 : 0),
    },
    {
      title: "操作",
      valueType: "option",
      width: 64,
      render: (_, record) => [
        <TableActionIcon key="delete" tooltip="删除" icon={<DeleteOutlined />} danger onClick={() => handleDelete([String(record.id)])} />,
      ],
    },
  ];

  return (
    <Modal
      title="DNS同步任务"
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <ProTable<DNSTask>
        headerTitle={
          <Space>
            <Button danger disabled={selectedRowKeys.length === 0} onClick={() => handleDelete(selectedRowKeys.map(String))}>
              批量删除
            </Button>
            <Button danger type="primary" onClick={handleDeleteAll}>
              删除所有
            </Button>
          </Space>
        }
        actionRef={actionRef}
        rowKey="id"
        tableLayout="fixed"
        scroll={{ x: 760 }}
        search={false}
        options={{
          reload: () => actionRef.current?.reload(),
        }}
        pagination={{ pageSize: defaultPageSize }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        request={async () => {
          try {
            const data = await request<{ dnsTasks: DNSTask[] }>("/api/dns-tasks/doing");
            return {
              data: data.dnsTasks,
              success: true,
              total: data.dnsTasks?.length || 0,
            };
          } catch {
            return { success: false };
          }
        }}
        columns={columns}
      />
    </Modal>
  );
}

function MessageLevelIcon({ level }: { level: "error" | "warning" | "success" | "info" }) {
  const iconStyle = { fontSize: 16 };
  switch (level) {
    case "error":
      return <CloseCircleOutlined style={{ ...iconStyle, color: "#ff4d4f" }} />;
    case "warning":
      return <ExclamationCircleOutlined style={{ ...iconStyle, color: "#faad14" }} />;
    case "success":
      return <CheckCircleOutlined style={{ ...iconStyle, color: "#52c41a" }} />;
    default:
      return <InfoCircleOutlined style={{ ...iconStyle, color: "#1677ff" }} />;
  }
}

function messageLevelBadgeStatus(level: "error" | "warning" | "success" | "info") {
  return level === "info" ? "processing" : level;
}

function messageLevelTagColor(level: "error" | "warning" | "success" | "info") {
  return level === "info" ? "blue" : level;
}

function messageTime(createdAt: bigint) {
  const timestamp = Number(createdAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "未知时间";
  }
  return new Date(timestamp * 1000).toLocaleString("zh-CN", { hour12: false });
}

function MessageRow({ record, onNavigate }: { record: Message; onNavigate: () => void }) {
  const presentation = getMessagePresentation(record.type, record.level, record.body);
  const params = decodeMessageParams(record.paramsJSON as Uint8Array | string | undefined);
  const healthCheckFailures = record.type === "HealthCheckFailed" ? getHealthCheckFailures(params) : [];
  const clusterID = record.nodeCluster?.id;
  const nodeID = record.node?.id;
  const clusterLink = clusterID && clusterID > 0n ? `/clusters/${clusterID}/dashboard` : undefined;
  const nodeLink = nodeID && nodeID > 0n ? `/clusters/nodes/${nodeID}/details` : undefined;
  const serverID = getMessageParameterID(params, "serverId");
  const isCertificateMessage = ["SSLCertExpiring", "SSLCertACMETaskFailed", "SSLCertACMETaskSuccess"].includes(record.type);

  return (
    <div style={{ display: "grid", gap: 10, padding: "4px 0" }}>
      <Space wrap size={[8, 4]}>
        <MessageLevelIcon level={presentation.levelStatus} />
        <strong>{presentation.title}</strong>
        <Tag color={messageLevelTagColor(presentation.levelStatus)}>{presentation.typeLabel}</Tag>
        <Badge status={messageLevelBadgeStatus(presentation.levelStatus)} text={presentation.levelLabel} />
        <span style={{ color: "#8c8c8c" }}>{messageTime(record.createdAt)}</span>
        {record.isRead ? <Tag>已读</Tag> : <Tag color="processing">未读</Tag>}
      </Space>

      {(clusterLink || nodeLink) && (
        <Space wrap size={[12, 4]}>
          {clusterLink && <Link onClick={onNavigate} to={clusterLink}>{`集群：${record.nodeCluster?.name}`}</Link>}
          {nodeLink && <Link onClick={onNavigate} to={nodeLink}>{`节点：${record.node?.name}`}</Link>}
        </Space>
      )}

      {record.body.trim() !== presentation.title && (
        <div style={{ color: "#595959", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{record.body || "无详细内容"}</div>
      )}

      {healthCheckFailures.length > 0 && (
        <Space orientation="vertical" size={4} style={{ alignItems: "flex-start" }}>
          {healthCheckFailures.map((failure) => (
            <Link key={`${failure.nodeId}-${failure.nodeAddr}`} onClick={onNavigate} to={`/clusters/nodes/${failure.nodeId}/details`}>
              {`${failure.nodeName}${failure.nodeAddr ? ` · ${failure.nodeAddr}` : ""}${failure.error ? ` · ${failure.error}` : ""}`}
            </Link>
          ))}
        </Space>
      )}

      <Space wrap size={[12, 4]}>
        {record.type === "ClusterDNSSyncFailed" && clusterLink && (
          <Link onClick={onNavigate} to={`/clusters/${clusterID}/settings`}>
            检查集群 DNS 设置
          </Link>
        )}
        {isCertificateMessage && (
          <Link onClick={onNavigate} to="/servers/certs">
            查看 SSL 证书
          </Link>
        )}
        {record.type === "serverNamesRequireAuditing" && serverID && (
          <Link onClick={onNavigate} to={`/servers/${serverID}/settings`}>
            查看网站设置
          </Link>
        )}
      </Space>
    </div>
  );
}

export function MessageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actionRef = useRef<ActionType>(null);
  const defaultPageSize = useDefaultPageSize();
  const queryClient = useQueryClient();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleRead = async (ids: string[]) => {
    try {
      await request("/api/messages/read/batch", {
        method: "POST",
        data: {
          messageIds: ids.map(Number),
          isRead: true,
        },
      });
      message.success("标记已读成功");
      actionRef.current?.reload();
      setSelectedRowKeys([]);
    } catch {
      message.error("操作失败");
    }
  };

  const handleReadAll = async () => {
    try {
      await request("/api/messages/read/all", { method: "POST" });
      message.success("全部已读成功");
      actionRef.current?.reload();
      updateTaskSummaryCache(queryClient, (summary) => ({
        ...summary,
        unreadMessageCount: 0,
      }));
    } catch {
      message.error("操作失败");
    }
  };

  const columns: ProColumns<Message>[] = [
    {
      title: "消息",
      dataIndex: "body",
      render: (_, record) => <MessageRow record={record} onNavigate={onClose} />,
    },
    {
      title: "操作",
      valueType: "option",
      width: 90,
      render: (_, record) => [
        record.isRead ? (
          <TableActionIcon key="read" tooltip="已读" icon={<CheckOutlined />} disabled />
        ) : (
          <TableActionIcon key="read" tooltip="标记已读" icon={<CheckOutlined />} onClick={() => handleRead([String(record.id)])} />
        ),
      ],
    },
  ];

  return (
    <Modal
      title="站内消息"
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <ProTable<Message>
        headerTitle={
          <Space>
            <Button disabled={selectedRowKeys.length === 0} onClick={() => handleRead(selectedRowKeys.map(String))}>
              批量已读
            </Button>
            <Button type="primary" onClick={handleReadAll}>
              全部已读
            </Button>
          </Space>
        }
        actionRef={actionRef}
        rowKey="id"
        search={false}
        options={{
          reload: () => actionRef.current?.reload(),
        }}
        pagination={{ pageSize: defaultPageSize }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        request={async (params) => {
          try {
            const { current = 1, pageSize = defaultPageSize } = params;
            const offset = (current - 1) * pageSize;
            const data = await request<{
              messages: Message[];
              total: string;
            }>("/api/messages/unread", {
              params: { offset, size: pageSize },
            });
            return {
              data: data.messages,
              success: true,
              total: Number(data.total),
            };
          } catch {
            return { success: false };
          }
        }}
        columns={columns}
      />
    </Modal>
  );
}
