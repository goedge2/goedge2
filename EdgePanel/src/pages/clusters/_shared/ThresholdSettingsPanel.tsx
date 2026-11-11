import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Spin, Switch, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { Node } from "@/pb/models/model_node_pb";
import type { NodeThresholdItemDefinition, NodeThresholdOperatorDefinition } from "@/pb/service_node_threshold_pb";
import { clusterQueryKeys } from "@/queries/keys";
import {
  createNodeThreshold,
  deleteNodeThreshold,
  getNodeThreshold,
  getNodeThresholdDefinitions,
  listNodeThresholds,
  type NodeThresholdDraft,
  type NodeThresholdRecord,
  type ThresholdListParams,
  updateNodeThreshold,
} from "@/services/clusterSettings";
import { formatErrorMessage } from "@/utils";

import { decodeThresholdValue, encodeThresholdValue } from "../settingsHelpers";

type ThresholdSettingsPanelProps = ThresholdListParams;

type ThresholdTableRecord = NodeThresholdRecord & {
  key: string;
};

type ThresholdFormValues = NodeThresholdDraft;

function stringifyId(value?: bigint | number | string | null) {
  return value == null ? "" : String(value);
}

function findItemDefinition(items: NodeThresholdItemDefinition[], itemCode?: string) {
  return items.find((item) => item.code === itemCode);
}

function findOperatorDefinition(operators: NodeThresholdOperatorDefinition[], operatorCode?: string) {
  return operators.find((operator) => operator.code === operatorCode);
}

export function ThresholdSettingsPanel(props: ThresholdSettingsPanelProps) {
  const [form] = Form.useForm<ThresholdFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingThresholdId, setEditingThresholdId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const targetId = props.scope === "node" ? props.nodeId : props.clusterId;
  const thresholdsQuery = useQuery({
    queryKey: clusterQueryKeys.thresholds(props.scope, targetId),
    queryFn: () => listNodeThresholds(props),
  });
  const definitionsQuery = useQuery({
    queryKey: clusterQueryKeys.thresholdDefinitions(),
    queryFn: getNodeThresholdDefinitions,
  });
  const thresholdDetailQuery = useQuery({
    queryKey: [...clusterQueryKeys.thresholds(props.scope, targetId), "detail", editingThresholdId],
    queryFn: () => getNodeThreshold(editingThresholdId!),
    enabled: modalOpen && !!editingThresholdId,
  });

  const itemDefinitions = useMemo(() => definitionsQuery.data?.items ?? [], [definitionsQuery.data?.items]);
  const operatorDefinitions = useMemo(() => definitionsQuery.data?.operators ?? [], [definitionsQuery.data?.operators]);
  const currentItemCode = Form.useWatch("item", form);
  const currentParamCode = Form.useWatch("param", form);
  const currentOperatorCode = Form.useWatch("operator", form);
  const currentItem = findItemDefinition(itemDefinitions, currentItemCode);
  const currentParam = currentItem?.params.find((param) => param.code === currentParamCode);
  const currentOperator = findOperatorDefinition(operatorDefinitions, currentOperatorCode);

  useEffect(() => {
    if (!modalOpen || !!editingThresholdId || itemDefinitions.length === 0 || operatorDefinitions.length === 0) {
      return;
    }

    const firstItem = itemDefinitions[0];
    form.setFieldsValue({
      item: firstItem.code,
      param: firstItem.params[0]?.code ?? "",
      operator: operatorDefinitions[0]?.code ?? "",
      value: "",
      duration: 5,
      message: "",
      notifyDuration: 10,
      isOn: true,
    });
  }, [editingThresholdId, form, itemDefinitions, modalOpen, operatorDefinitions]);

  useEffect(() => {
    if (!thresholdDetailQuery.data?.nodeThreshold || !modalOpen || !editingThresholdId) {
      return;
    }

    const threshold = thresholdDetailQuery.data.nodeThreshold;
    form.setFieldsValue({
      item: threshold.item,
      param: threshold.param,
      operator: threshold.operator,
      value: decodeThresholdValue(threshold.valueJSON),
      duration: threshold.duration,
      message: threshold.message,
      notifyDuration: threshold.notifyDuration,
      isOn: threshold.isOn,
    });
  }, [editingThresholdId, form, modalOpen, thresholdDetailQuery.data]);

  const openCreateModal = () => {
    setEditingThresholdId(undefined);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: ThresholdTableRecord) => {
    setEditingThresholdId(stringifyId(record.id));
    form.resetFields();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingThresholdId(undefined);
    form.resetFields();
  };

  const reloadThresholds = async () => {
    await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.thresholds(props.scope, targetId) });
  };

  const handleDelete = async (record: ThresholdTableRecord) => {
    try {
      await deleteNodeThreshold(stringifyId(record.id));
      message.success("阈值已删除");
      await reloadThresholds();
    } catch (error) {
      message.error(formatErrorMessage("删除阈值失败", error));
    }
  };

  const handleSubmit = async (values: ThresholdFormValues) => {
    try {
      setSubmitting(true);
      const valueJSON = encodeThresholdValue(values.value ?? "");
      if (editingThresholdId) {
        await updateNodeThreshold(editingThresholdId, values, valueJSON);
        message.success("阈值已保存");
      } else {
        await createNodeThreshold(props, values, valueJSON);
        message.success("阈值已创建");
      }
      closeModal();
      await reloadThresholds();
    } catch (error) {
      message.error(formatErrorMessage(editingThresholdId ? "保存阈值失败" : "创建阈值失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ThresholdTableRecord> = [
    {
      title: "监控项",
      key: "item",
      render: (_, record) => {
        const item = findItemDefinition(itemDefinitions, record.item);
        const recordNode = record.node as Node | undefined;
        return (
          <Space direction="vertical" size={4}>
            <span>{item?.name || record.item || "-"}</span>
            {props.scope === "cluster" && recordNode?.id ? <Tag color="processing">节点专属: {recordNode.name}</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "参数",
      key: "param",
      render: (_, record) => {
        const item = findItemDefinition(itemDefinitions, record.item);
        return item?.params.find((param) => param.code === record.param)?.name || record.param || "-";
      },
    },
    {
      title: "操作符",
      key: "operator",
      width: 120,
      render: (_, record) => findOperatorDefinition(operatorDefinitions, record.operator)?.name || record.operator || "-",
    },
    {
      title: "对比值",
      key: "value",
      width: 140,
      render: (_, record) => {
        const item = findItemDefinition(itemDefinitions, record.item);
        const param = item?.params.find((candidate) => candidate.code === record.param);
        const value = decodeThresholdValue(record.valueJSON);
        return `${value}${param?.isPercent ? "%" : ""}`;
      },
    },
    {
      title: "统计时间段",
      key: "duration",
      width: 140,
      render: (_, record) => `${record.duration}分钟`,
    },
    {
      title: "状态",
      key: "isOn",
      width: 100,
      render: (_, record) => (record.isOn ? <Tag color="success">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" onClick={() => openEditModal(record)}>
            修改
          </Button>
          <Popconfirm title="确定删除当前阈值吗？" onConfirm={() => handleDelete(record)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tableData = (thresholdsQuery.data?.nodeThresholds ?? []).map((record) => ({
    ...record,
    key: stringifyId(record.id),
  }));

  return (
    <>
      <Card
        title="阈值设置"
        extra={
          <Button type="primary" onClick={openCreateModal}>
            添加阈值
          </Button>
        }
      >
        {thresholdsQuery.isPending || definitionsQuery.isPending ? (
          <Spin />
        ) : tableData.length === 0 ? (
          <Empty description="暂时还没有设置阈值" />
        ) : (
          <Table columns={columns} dataSource={tableData} pagination={false} scroll={{ x: 900 }} />
        )}
      </Card>

      <Modal
        title={editingThresholdId ? "修改阈值" : "添加阈值"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
      >
        {editingThresholdId && thresholdDetailQuery.isPending ? (
          <Spin />
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="item" label="监控项" rules={[{ required: true, message: "请选择监控项" }]}>
              <Select
                options={itemDefinitions.map((item) => ({ label: item.name, value: item.code }))}
                onChange={(value) => {
                  const selectedItem = findItemDefinition(itemDefinitions, value);
                  form.setFieldValue("param", selectedItem?.params[0]?.code ?? "");
                }}
              />
            </Form.Item>
            <Typography.Text type="secondary">{currentItem?.description || "请选择一个监控项。"}</Typography.Text>

            <Form.Item name="param" label="参数" rules={[{ required: true, message: "请选择参数" }]} style={{ marginTop: 16 }}>
              <Select options={(currentItem?.params ?? []).map((param) => ({ label: param.name, value: param.code }))} />
            </Form.Item>
            <Typography.Text type="secondary">{currentParam?.description || "请选择一个参数。"}</Typography.Text>

            <Form.Item name="operator" label="操作符" rules={[{ required: true, message: "请选择操作符" }]} style={{ marginTop: 16 }}>
              <Select options={operatorDefinitions.map((operator) => ({ label: operator.name, value: operator.code }))} />
            </Form.Item>
            {currentOperator ? <Typography.Text type="secondary">当前操作符: {currentOperator.name}</Typography.Text> : null}

            <Form.Item name="value" label="对比值" rules={[{ required: true, message: "请输入对比值" }]} style={{ marginTop: 16 }}>
              <Input addonAfter={currentParam?.isPercent ? "%" : undefined} maxLength={10} />
            </Form.Item>

            <Form.Item name="duration" label="统计时间段" extra="当前仅支持按分钟统计。" rules={[{ required: true, message: "请输入统计时间段" }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="message" label="消息" extra="触发阈值时的消息提示">
              <Input.TextArea rows={2} maxLength={100} />
            </Form.Item>

            <Form.Item
              name="notifyDuration"
              label="消息通知间隔"
              extra="在此间隔内将不会重复发送跟此阈值相关的消息"
              rules={[{ required: true, message: "请输入消息通知间隔" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item name="isOn" label="启用当前阈值" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}
