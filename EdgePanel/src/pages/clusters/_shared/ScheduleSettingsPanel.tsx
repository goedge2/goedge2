import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@umijs/max";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { TimeDuration } from "@/pb/models/model_config_shared_pb";
import type { NodeAction } from "@/pb/models/model_node_action_pb";
import type { FindAllNodeScheduleInfoWithNodeClusterIdResponse_ScheduleInfo } from "@/pb/service_node_pb";
import { DragHandle, DragRow } from "@/components/DnDHelper";
import { clusterQueryKeys } from "@/queries/keys";
import {
  copyNodeScheduleActionsToCluster,
  copyNodeScheduleActionsToGroup,
  createNodeScheduleAction,
  deleteNodeScheduleAction,
  getNodeSchedule,
  getNodeScheduleAction,
  joinBackupIPs,
  listClusterScheduleNodes,
  listNodeScheduleActions,
  reorderNodeScheduleActions,
  resetNodeScheduleActionStatus,
  updateNodeSchedule,
  updateNodeScheduleAction,
  type NodeScheduleFormValues,
} from "@/services/clusterSchedule";
import { formatErrorMessage } from "@/utils";

import { decodeScheduleDate, decodeScheduleJSON, encodeScheduleJSON } from "../settingsHelpers";

type ScheduleSettingsPanelProps =
  | {
      scope: "cluster";
      clusterId: string;
    }
  | {
      scope: "node";
      clusterId: string;
      nodeId: string;
    };

type ActionDefinition = {
  code: string;
  name: string;
  description: string;
};

type ActionParamDefinition = {
  code: string;
  name: string;
  description: string;
  valueName?: string;
  valueType?: string;
  hasDuration?: boolean;
  operators?: string[];
};

type ActionOperatorDefinition = {
  code: string;
  name: string;
};

type ActionStatus = {
  actionId?: number;
  conds?: { conds?: Array<{ param?: string; operator?: string; value?: unknown }>; connector?: string };
  action?: { code?: string; params?: { url?: string } };
  expiresAt?: number;
};

type ActionRecord = NodeAction & {
  key: string;
  condsConfig?: { conds?: Array<{ param?: string; operator?: string; value?: unknown }>; connector?: string };
  actionConfig?: { code?: string; params?: { url?: string } };
  durationConfig?: TimeDuration;
};

type ActionFormValues = {
  param: string;
  operator: string;
  value: string;
  valueUnit?: string;
  connector: string;
  actionCode: string;
  webhookURL?: string;
  durationCount: number;
  durationUnit: string;
  isOn: boolean;
};

type ScheduleBaseInfo = {
  offlineDay: string;
  isBackupForCluster: boolean;
  isBackupForGroup: boolean;
  backupIPs: string[];
  nodeClusterName?: string;
  nodeGroupName?: string;
  actionStatusJSON?: Uint8Array;
};

function isActionRecord(record: ActionRecord | ActionStatus): record is ActionRecord {
  return "condsConfig" in record;
}

const actionDefinitions: ActionDefinition[] = [
  { code: "up", name: "上线当前节点", description: "将当前节点状态设置为在线。" },
  { code: "down", name: "下线当前节点", description: "将当前节点状态设置为离线。" },
  { code: "switchToBackupNodesInCluster", name: "切换到集群备用节点", description: "下线当前节点并启用节点所在集群备用节点。" },
  { code: "switchToBackupNodesInGroup", name: "切换到分组备用节点", description: "下线当前节点并启用节点所在分组备用节点。" },
  { code: "switchToBackupIP", name: "切换到备用IP", description: "将当前节点的IP切换到当前节点配置的备用IP。" },
  { code: "enableBackupNodesInCluster", name: "启用集群备用节点", description: "保持当前节点并启用节点所在集群备用节点。" },
  { code: "enableBackupNodesInGroup", name: "启用分组备用节点", description: "保持当前节点并启用节点所在分组备用节点。" },
  { code: "enableBackupIP", name: "启用备用IP", description: "保持当前节点的IP并启用当前节点配置的备用IP。" },
  { code: "webHook", name: "WebHook", description: "通过WebHook发送通知到URL。" },
];

const actionOperatorDefinitions: ActionOperatorDefinition[] = [
  { code: "gt", name: "大于(＞)" },
  { code: "gte", name: "大于等于(≥)" },
  { code: "lt", name: "小于(＜)" },
  { code: "lte", name: "小于等于(≤)" },
  { code: "eq", name: "等于(=)" },
];

const actionParamDefinitions: ActionParamDefinition[] = [
  {
    code: "bandwidthOut",
    name: "节点出口带宽",
    description: "当前节点当前时间点的出口发送平均带宽（从节点发送到客户端）。",
    valueName: "对比带宽",
    valueType: "bandwidth",
    hasDuration: true,
  },
  {
    code: "bandwidthIn",
    name: "节点入口带宽",
    description: "当前节点当前时间点的入口接收平均带宽（从客户端发送到节点）。",
    valueName: "对比带宽",
    valueType: "bandwidth",
    hasDuration: true,
  },
  {
    code: "monthlyTrafficOut",
    name: "节点当月流量",
    description: "当前节点在当月的出口发送流量。",
    valueName: "对比流量",
    valueType: "traffic",
    hasDuration: false,
  },
  {
    code: "dailyTrafficOut",
    name: "节点当日流量",
    description: "当前节点在当天的出口发送流量。",
    valueName: "对比流量",
    valueType: "traffic",
    hasDuration: false,
  },
  {
    code: "cpuUsage",
    name: "节点CPU利用率",
    description: "节点当前CPU利用率，取值范围为0-100。",
    valueName: "CPU利用率",
    valueType: "cpu",
    hasDuration: true,
  },
  {
    code: "memoryUsage",
    name: "节点内存利用率",
    description: "节点当前内存利用率，取值范围为0-100。",
    valueName: "内存利用率",
    valueType: "memory",
    hasDuration: true,
  },
  {
    code: "load",
    name: "节点负载",
    description: "节点当前负载，取值范围为0-∞，通常超过10表示系统负载较重。",
    valueName: "系统负载",
    valueType: "load",
    hasDuration: true,
  },
  {
    code: "heathCheckFailure",
    name: "节点健康检查失败",
    description: "当前节点任一IP健康检查失败，此功能需要当前集群开启健康检查。",
    hasDuration: true,
  },
  {
    code: "udpDPSOut",
    name: "节点UDP数据报发送速率",
    description: "当前节点当前时间点的UDP数据报发送速率。",
    valueName: "对比速率",
    valueType: "rate",
    hasDuration: true,
  },
  {
    code: "udpDPSIn",
    name: "节点UDP数据报接收速率",
    description: "当前节点当前时间点的UDP数据报接收速率。",
    valueName: "对比速率",
    valueType: "rate",
    hasDuration: true,
  },
];

const cardStyles = {
  header: { borderBottom: 0 },
};

function stringifyId(value?: bigint | number | string | null) {
  return value == null ? "" : String(value);
}

function parseActionRecord(action: NodeAction): ActionRecord {
  return {
    ...action,
    key: stringifyId(action.id),
    condsConfig: decodeScheduleJSON<{ conds?: Array<{ param?: string; operator?: string; value?: unknown }>; connector?: string }>(action.condsJSON),
    actionConfig: decodeScheduleJSON<{ code?: string; params?: { url?: string } }>(action.actionJSON),
    durationConfig: decodeScheduleJSON<TimeDuration>(action.durationJSON),
  };
}

function parseActionStatus(schedule?: ScheduleBaseInfo): ActionStatus | undefined {
  return decodeScheduleJSON<ActionStatus>(schedule?.actionStatusJSON);
}

function formatActionName(actionCode?: string) {
  return actionDefinitions.find((item) => item.code === actionCode)?.name || actionCode || "未触发";
}

function formatParamName(paramCode?: string) {
  return actionParamDefinitions.find((item) => item.code === paramCode)?.name || paramCode || "-";
}

function formatOperatorName(operatorCode?: string) {
  return actionOperatorDefinitions.find((item) => item.code === operatorCode)?.name || operatorCode || "-";
}

function formatActionCondition(record?: ActionRecord | ActionStatus) {
  let conds: Array<{ param?: string; operator?: string; value?: unknown }> | undefined;
  if (record) {
    if (isActionRecord(record)) {
      conds = record.condsConfig?.conds;
    } else {
      conds = record.conds?.conds;
    }
  }
  if (!conds || conds.length === 0) {
    return "无条件";
  }

  return conds
    .map((cond: { param?: string; operator?: string; value?: unknown }) => {
      return `${formatParamName(cond.param)} ${formatOperatorName(cond.operator)} ${formatCondValue(cond.param, cond.value)}`;
    })
    .join(" 且 ");
}

function formatCondValue(paramCode: string | undefined, value: unknown) {
  const param = actionParamDefinitions.find((item) => item.code === paramCode);
  if (value && typeof value === "object" && "count" in (value as Record<string, unknown>)) {
    const count = String((value as { count?: string }).count ?? "");
    const unit = String((value as { unit?: string }).unit ?? "");
    return `${count}${unit}`;
  }
  if (param?.valueType === "cpu" || param?.valueType === "memory") {
    return `${String(value ?? "")}%`;
  }
  return String(value ?? "");
}

function formatDurationLabel(duration?: TimeDuration) {
  if (!duration?.count) {
    return "-";
  }
  const unitMap: Record<string, string> = {
    minute: "分钟",
    hour: "小时",
    day: "天",
  };
  return `${duration.count}${unitMap[duration.unit] ?? duration.unit}`;
}

function formatActionStatusTag(status?: ActionStatus) {
  if (status?.actionId && status.actionId > 0) {
    return <Tag color="error">已触发</Tag>;
  }
  return <Tag>未触发</Tag>;
}

function formatActionExpiresAt(status?: ActionStatus) {
  if (!status?.expiresAt) {
    return "";
  }

  return new Date(status.expiresAt * 1000).toLocaleString("zh-CN", { hour12: false });
}

function buildActionDraftPayload(values: ActionFormValues): Record<string, unknown> {
  const paramDef = actionParamDefinitions.find((item) => item.code === values.param);
  const condValue =
    paramDef?.valueType === "bandwidth" || paramDef?.valueType === "traffic"
      ? {
          count: values.value,
          unit: values.valueUnit || "mb",
        }
      : values.value;

  const conds = {
    connector: values.connector,
    conds: [
      {
        param: values.param,
        operator: values.operator,
        value: condValue,
      },
    ],
  };

  const action = {
    code: values.actionCode,
    params: values.actionCode === "webHook" ? { url: values.webhookURL || "" } : null,
  };

  const duration = {
    count: String(values.durationCount),
    unit: values.durationUnit,
  };

  return {
    condsJSON: encodeScheduleJSON(conds),
    actionJSON: encodeScheduleJSON(action),
    durationJSON: encodeScheduleJSON(duration),
    isOn: values.isOn,
  };
}

function buildActionInitialValues(action?: ActionRecord): ActionFormValues {
  const cond = action?.condsConfig?.conds?.[0];
  const value = cond?.value;
  const structuredValue =
    value && typeof value === "object" && "count" in (value as Record<string, unknown>) ? (value as { count?: string; unit?: string }) : undefined;

  return {
    param: cond?.param || actionParamDefinitions[0].code,
    operator: cond?.operator || "gt",
    value: structuredValue?.count || String(value ?? ""),
    valueUnit: structuredValue?.unit || "mb",
    connector: action?.condsConfig?.connector || "and",
    actionCode: action?.actionConfig?.code || actionDefinitions[0].code,
    webhookURL: action?.actionConfig?.params?.url || "",
    durationCount: Number(action?.durationConfig?.count || "5"),
    durationUnit: action?.durationConfig?.unit || "minute",
    isOn: action?.isOn ?? true,
  };
}

function ScheduleBaseSettings({
  initialValues,
  onSubmit,
  submitting,
  loading,
  nodeClusterName,
  nodeGroupName,
}: {
  initialValues: NodeScheduleFormValues;
  onSubmit: (values: NodeScheduleFormValues) => Promise<boolean>;
  submitting: boolean;
  loading: boolean;
  nodeClusterName?: string;
  nodeGroupName?: string;
}) {
  const [form] = Form.useForm<NodeScheduleFormValues>();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Card
        title="基础设置"
        variant="borderless"
        size="small"
        styles={cardStyles}
        loading={loading}
        extra={
          <Button
            onClick={() => {
              form.setFieldsValue(initialValues);
              setEditing(true);
            }}
            disabled={loading}
          >
            修改
          </Button>
        }
      >
        <Descriptions
          column={1}
          items={[
            { key: "offlineDay", label: "租期结束日期", children: initialValues.offlineDay || "没有设置" },
            { key: "isBackupForCluster", label: "集群备用节点", children: initialValues.isBackupForCluster ? "是" : "否" },
            { key: "isBackupForGroup", label: "分组备用节点", children: initialValues.isBackupForGroup ? "是" : "否" },
            {
              key: "backupIPs",
              label: "备用IP",
              children: initialValues.backupIPsText ? (
                <Typography.Text style={{ whiteSpace: "pre-line" }}>{initialValues.backupIPsText}</Typography.Text>
              ) : (
                "没有设置"
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="修改节点基础调度设置"
        open={editing}
        onCancel={() => setEditing(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
        width={680}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (await onSubmit(values)) setEditing(false);
          }}
        >
          <Form.Item
            label="当前节点租期结束日期"
            name="offlineDay"
            help="当前节点租期结束日期到此日期后当前节点将会被自动下线，如果为空则表示永远不下线。"
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            label="当前节点为集群备用节点"
            name="isBackupForCluster"
            valuePropName="checked"
            help={`选中后标识当前节点为所在集群${nodeClusterName ? `（${nodeClusterName}）` : ""}的备用节点，同集群的其他节点可以通过调度动作切换到此节点；备用节点未被调度触发时不会加入DNS域名解析。`}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="当前节点为分组备用节点"
            name="isBackupForGroup"
            valuePropName="checked"
            help={`选中后标识当前节点为所在分组${nodeGroupName ? `（${nodeGroupName}）` : ""}的备用节点，同分组的其他节点可以通过调度动作切换到此节点；备用节点未被调度触发时不会加入DNS域名解析。`}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="当前节点备用IP" name="backupIPsText" help="可以通过调度动作切换到这些备用IP，每行一个。">
            <Input.TextArea rows={4} placeholder="每行一个 IP" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function NodeActionEditor({
  nodeId,
  open,
  actionId,
  onClose,
  onSuccess,
}: {
  nodeId: string;
  open: boolean;
  actionId?: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [form] = Form.useForm<ActionFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const detailQuery = useQuery({
    queryKey: [...clusterQueryKeys.nodeScheduleActions(nodeId), "detail", actionId],
    queryFn: async () => {
      const result = await getNodeScheduleAction(actionId!);
      return result.nodeAction ? parseActionRecord(result.nodeAction) : undefined;
    },
    enabled: open && !!actionId,
  });
  const selectedParam = Form.useWatch("param", form);
  const selectedActionCode = Form.useWatch("actionCode", form);
  const currentParam = actionParamDefinitions.find((item) => item.code === selectedParam) || actionParamDefinitions[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    if (actionId) {
      if (detailQuery.data) {
        form.setFieldsValue(buildActionInitialValues(detailQuery.data));
      }
      return;
    }

    form.setFieldsValue(buildActionInitialValues());
  }, [actionId, detailQuery.data, form, open]);

  const handleSubmit = async (values: ActionFormValues) => {
    try {
      setSubmitting(true);
      const payload = buildActionDraftPayload(values);
      if (actionId) {
        await updateNodeScheduleAction(actionId, payload);
        message.success("调度动作已保存");
      } else {
        await createNodeScheduleAction(nodeId, payload);
        message.success("调度动作已创建");
      }
      await onSuccess();
      onClose();
    } catch (error) {
      message.error(formatErrorMessage(actionId ? "保存调度动作失败" : "创建调度动作失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={actionId ? "修改调度动作" : "添加调度动作"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={720}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="条件参数" name="param" rules={[{ required: true, message: "请选择条件参数" }]}>
          <Select
            options={actionParamDefinitions.map((item) => ({
              label: item.name,
              value: item.code,
            }))}
          />
        </Form.Item>
        <Form.Item label="操作符" name="operator" rules={[{ required: true, message: "请选择操作符" }]}>
          <Select
            options={actionOperatorDefinitions.map((item) => ({
              label: item.name,
              value: item.code,
            }))}
          />
        </Form.Item>
        <Form.Item
          label={currentParam.valueName || "对比值"}
          name="value"
          rules={currentParam.code === "heathCheckFailure" ? [] : [{ required: true, message: "请输入对比值" }]}
        >
          <Input disabled={currentParam.code === "heathCheckFailure"} />
        </Form.Item>
        {currentParam.valueType === "bandwidth" || currentParam.valueType === "traffic" ? (
          <Form.Item label="单位" name="valueUnit" rules={[{ required: true, message: "请选择单位" }]}>
            <Select
              options={[
                { label: "KB", value: "kb" },
                { label: "MB", value: "mb" },
                { label: "GB", value: "gb" },
                { label: "TB", value: "tb" },
              ]}
            />
          </Form.Item>
        ) : null}
        <Form.Item label="条件关系" name="connector">
          <Select
            options={[
              { label: "且(AND)", value: "and" },
              { label: "或(OR)", value: "or" },
            ]}
          />
        </Form.Item>
        <Divider />
        <Form.Item label="调度动作" name="actionCode" rules={[{ required: true, message: "请选择调度动作" }]}>
          <Select
            options={actionDefinitions.map((item) => ({
              label: item.name,
              value: item.code,
            }))}
          />
        </Form.Item>
        {selectedActionCode === "webHook" ? (
          <Form.Item label="WebHook URL" name="webhookURL" rules={[{ required: true, message: "请输入 WebHook URL" }]}>
            <Input placeholder="https://..." />
          </Form.Item>
        ) : null}
        <Form.Item label="持续时间" required style={{ marginBottom: 0 }}>
          <Space.Compact block>
            <Form.Item name="durationCount" noStyle rules={[{ required: true, message: "请输入持续时间" }]}>
              <InputNumber min={1} style={{ width: "40%" }} />
            </Form.Item>
            <Form.Item name="durationUnit" noStyle rules={[{ required: true, message: "请选择单位" }]}>
              <Select
                style={{ width: "60%" }}
                options={[
                  { label: "分钟", value: "minute" },
                  { label: "小时", value: "hour" },
                  { label: "天", value: "day" },
                ]}
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.Item label="启用" name="isOn" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function NodeActionManager({ nodeId }: { nodeId: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string>();
  const queryClient = useQueryClient();
  const actionsQuery = useQuery({
    queryKey: clusterQueryKeys.nodeScheduleActions(nodeId),
    queryFn: async () => {
      const response = await listNodeScheduleActions(nodeId);
      return response.nodeActions.map(parseActionRecord);
    },
  });

  const reloadActions = async () => {
    await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeScheduleActions(nodeId) });
    await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeSchedule(nodeId) });
  };

  const handleDelete = async (nodeActionId: string) => {
    try {
      await deleteNodeScheduleAction(nodeActionId);
      message.success("调度动作已删除");
      await reloadActions();
    } catch (error) {
      message.error(formatErrorMessage("删除调度动作失败", error));
    }
  };

  const handleToggle = async (record: ActionRecord) => {
    try {
      const payload = buildActionDraftPayload({
        ...buildActionInitialValues(record),
        isOn: !record.isOn,
      });
      await updateNodeScheduleAction(stringifyId(record.id), payload);
      message.success(record.isOn ? "调度动作已停用" : "调度动作已启用");
      await reloadActions();
    } catch (error) {
      message.error(formatErrorMessage("更新调度动作状态失败", error));
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !actionsQuery.data) {
      return;
    }

    const current = actionsQuery.data;
    const activeIndex = current.findIndex((item) => item.key === active.id);
    const overIndex = current.findIndex((item) => item.key === over.id);
    if (activeIndex < 0 || overIndex < 0) {
      return;
    }

    const sorted = arrayMove(current, activeIndex, overIndex);
    try {
      await reorderNodeScheduleActions(sorted.map((item) => stringifyId(item.id)));
      message.success("调度动作顺序已更新");
      await reloadActions();
    } catch (error) {
      message.error(formatErrorMessage("更新调度动作顺序失败", error));
    }
  };

  const handleResetStatus = async () => {
    try {
      await resetNodeScheduleActionStatus(nodeId);
      message.success("当前触发状态已重置");
      await reloadActions();
    } catch (error) {
      message.error(formatErrorMessage("重置当前触发状态失败", error));
    }
  };

  const handleCopyToGroup = async () => {
    try {
      await copyNodeScheduleActionsToGroup(nodeId);
      message.success("调度动作已复制到所在分组");
    } catch (error) {
      message.error(formatErrorMessage("复制到分组失败", error));
    }
  };

  const handleCopyToCluster = async () => {
    try {
      await copyNodeScheduleActionsToCluster(nodeId);
      message.success("调度动作已复制到所在集群");
    } catch (error) {
      message.error(formatErrorMessage("复制到集群失败", error));
    }
  };

  const columns: ColumnsType<ActionRecord> = [
    {
      key: "sort",
      width: 56,
      align: "center",
      render: () => <DragHandle />,
    },
    {
      title: "条件",
      key: "conds",
      render: (_, record) => formatActionCondition(record),
    },
    {
      title: "动作",
      key: "action",
      width: 200,
      render: (_, record) => formatActionName(record.actionConfig?.code),
    },
    {
      title: "持续时间",
      key: "duration",
      width: 120,
      render: (_, record) => formatDurationLabel(record.durationConfig),
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: (_, record) => (record.isOn ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: "操作",
      key: "actionButtons",
      width: 240,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            onClick={() => {
              setEditingActionId(stringifyId(record.id));
              setModalOpen(true);
            }}
          >
            修改
          </Button>
          <Button type="link" onClick={() => void handleToggle(record)}>
            {record.isOn ? "停用" : "启用"}
          </Button>
          <Popconfirm title="确定删除当前调度动作吗？" onConfirm={() => void handleDelete(stringifyId(record.id))}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="调度动作"
      extra={
        <Space wrap>
          <Button onClick={() => void handleCopyToGroup()}>复制到分组</Button>
          <Button onClick={() => void handleCopyToCluster()}>复制到集群</Button>
          <Button onClick={() => void handleResetStatus()}>重置当前触发状态</Button>
          <Button
            type="primary"
            onClick={() => {
              setEditingActionId(undefined);
              setModalOpen(true);
            }}
          >
            添加
          </Button>
        </Space>
      }
    >
      {actionsQuery.isPending ? (
        <Spin />
      ) : (
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={(event) => void handleDragEnd(event)}>
          <SortableContext items={(actionsQuery.data ?? []).map((item) => item.key)} strategy={verticalListSortingStrategy}>
            <Table<ActionRecord>
              size="small"
              rowKey="key"
              pagination={false}
              columns={columns}
              dataSource={actionsQuery.data ?? []}
              components={{ body: { row: DragRow } }}
            />
          </SortableContext>
        </DndContext>
      )}
      <NodeActionEditor
        nodeId={nodeId}
        open={modalOpen}
        actionId={editingActionId}
        onClose={() => {
          setModalOpen(false);
          setEditingActionId(undefined);
        }}
        onSuccess={reloadActions}
      />
    </Card>
  );
}

function NodeSchedulePanel({ nodeId }: { nodeId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const scheduleQuery = useQuery({
    queryKey: clusterQueryKeys.nodeSchedule(nodeId),
    queryFn: () => getNodeSchedule(nodeId),
  });
  const queryClient = useQueryClient();

  const schedule = scheduleQuery.data?.scheduleInfo;
  const status = parseActionStatus(schedule as ScheduleBaseInfo | undefined);
  const initialValues = useMemo<NodeScheduleFormValues>(
    () => ({
      offlineDay: decodeScheduleDate(schedule?.offlineDay),
      isBackupForCluster: schedule?.isBackupForCluster,
      isBackupForGroup: schedule?.isBackupForGroup,
      backupIPsText: joinBackupIPs(schedule?.backupIPs),
    }),
    [schedule],
  );

  const handleSubmit = async (values: NodeScheduleFormValues) => {
    try {
      setSubmitting(true);
      await updateNodeSchedule(nodeId, values);
      message.success("基础调度设置已保存");
      await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeSchedule(nodeId) });
      await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeSettings(nodeId) });
      return true;
    } catch (error) {
      message.error(formatErrorMessage("保存基础调度设置失败", error));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card title="当前触发动作状态">
        {scheduleQuery.isPending ? (
          <Spin />
        ) : (
          <Space direction="vertical" size={8}>
            <Typography.Text>当前状态：{formatActionStatusTag(status)}</Typography.Text>
            <Typography.Text>当前动作：{formatActionName(status?.action?.code)}</Typography.Text>
            <Typography.Text>触发条件：{formatActionCondition(status)}</Typography.Text>
            {status?.expiresAt ? <Typography.Text>有效期至：{formatActionExpiresAt(status)}</Typography.Text> : null}
          </Space>
        )}
      </Card>
      <ScheduleBaseSettings
        loading={scheduleQuery.isPending}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        nodeClusterName={schedule?.nodeClusterName}
        nodeGroupName={schedule?.nodeGroupName}
      />
      <NodeActionManager nodeId={nodeId} />
    </Space>
  );
}

function ClusterSchedulePanel({ clusterId }: { clusterId: string }) {
  const [editingRecord, setEditingRecord] = useState<FindAllNodeScheduleInfoWithNodeClusterIdResponse_ScheduleInfo>();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<NodeScheduleFormValues>();

  const scheduleQuery = useQuery({
    queryKey: clusterQueryKeys.schedule(clusterId),
    queryFn: () => listClusterScheduleNodes(clusterId),
  });

  useEffect(() => {
    if (!editingRecord) {
      return;
    }

    form.setFieldsValue({
      offlineDay: decodeScheduleDate(editingRecord.offlineDay),
      isBackupForCluster: editingRecord.isBackupForCluster,
      isBackupForGroup: editingRecord.isBackupForGroup,
      backupIPsText: joinBackupIPs(editingRecord.backupIPs),
    });
  }, [editingRecord, form]);

  const reloadClusterSchedule = async () => {
    await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.schedule(clusterId) });
  };

  const handleSave = async (values: NodeScheduleFormValues) => {
    if (!editingRecord?.nodeId) {
      return;
    }

    try {
      setSubmitting(true);
      await updateNodeSchedule(stringifyId(editingRecord.nodeId), values);
      message.success("节点基础调度设置已保存");
      setEditingRecord(undefined);
      form.resetFields();
      await reloadClusterSchedule();
    } catch (error) {
      message.error(formatErrorMessage("保存节点基础调度设置失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<FindAllNodeScheduleInfoWithNodeClusterIdResponse_ScheduleInfo> = [
    {
      title: "节点",
      key: "nodeName",
      render: (_, record) => record.nodeName || `节点 ${record.nodeId}`,
    },
    {
      title: "租期结束日期",
      key: "offlineDay",
      render: (_, record) => {
        if (!record.offlineDay) {
          return <Typography.Text type="secondary">没有设置</Typography.Text>;
        }

        return decodeScheduleDate(record.offlineDay);
      },
    },
    {
      title: "所属分组",
      key: "nodeGroupName",
      render: (_, record) => record.nodeGroupName || <Typography.Text type="secondary">没有设置</Typography.Text>,
    },
    {
      title: "集群备用节点",
      key: "isBackupForCluster",
      render: (_, record) => (record.isBackupForCluster ? <Tag color="success">备用</Tag> : <Tag>否</Tag>),
    },
    {
      title: "分组备用节点",
      key: "isBackupForGroup",
      render: (_, record) => (record.isBackupForGroup ? <Tag color="success">备用</Tag> : <Tag>否</Tag>),
    },
    {
      title: "当前状态",
      key: "actionStatus",
      render: (_, record) => formatActionStatusTag(parseActionStatus(record as ScheduleBaseInfo)),
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" onClick={() => setEditingRecord(record)}>
            快捷编辑
          </Button>
          <Button
            type="link"
            onClick={() => {
              navigate(`/clusters/nodes/${stringifyId(record.nodeId)}/settings?tab=schedule`);
            }}
          >
            调度动作
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="节点调度概览">
        {scheduleQuery.isPending ? (
          <Spin />
        ) : (
          <Table
            rowKey={(record) => stringifyId(record.nodeId)}
            size="small"
            pagination={false}
            columns={columns}
            dataSource={scheduleQuery.data?.nodes ?? []}
          />
        )}
      </Card>
      <Modal
        title="快捷编辑节点基础调度"
        open={!!editingRecord}
        onCancel={() => setEditingRecord(undefined)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="当前节点租期结束日期"
            name="offlineDay"
            help="当前节点租期结束日期到此日期后当前节点将会被自动下线，如果为空则表示永远不下线。"
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            label="当前节点为集群备用节点"
            name="isBackupForCluster"
            valuePropName="checked"
            help="选中后标识当前节点为所在集群的备用节点，同集群的其他节点可以通过调度动作切换到此节点；备用节点未被调度触发时不会加入DNS域名解析。"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="当前节点为分组备用节点"
            name="isBackupForGroup"
            valuePropName="checked"
            help="选中后标识当前节点为所在分组的备用节点，同分组的其他节点可以通过调度动作切换到此节点；备用节点未被调度触发时不会加入DNS域名解析。"
          >
            <Switch />
          </Form.Item>
          <Form.Item label="当前节点备用IP" name="backupIPsText" help="可以通过调度动作切换到这些备用IP，每行一个。">
            <Input.TextArea rows={4} placeholder="每行一个 IP" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function ScheduleSettingsPanel(props: ScheduleSettingsPanelProps) {
  if (props.scope === "cluster") {
    return <ClusterSchedulePanel clusterId={props.clusterId} />;
  }

  return <NodeSchedulePanel nodeId={props.nodeId} />;
}
