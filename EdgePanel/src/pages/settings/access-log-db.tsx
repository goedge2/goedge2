import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Select, Button, Modal, Form, Input, InputNumber, Switch, Space, Tag, Popconfirm, message } from "antd";
import { PageContainer, ProTable, type ProColumns } from "@ant-design/pro-components";
import { request, useLocation, useNavigate } from "@umijs/max";
import { settingQueryKeys } from "@/queries/keys";
import {
  listAccessLogDBNodes,
  readAccessLogStorage,
  saveAccessLogStorage,
  type AccessLogEngine,
  type AccessLogStorageInput,
} from "@/services/settings";
import type { ReadAccessLogStorageResponse } from "@/pb/service_sys_setting_pb";
import { BleveStorageFields, SearchStorageFields, searchStorageFormValues, type SearchStorageFormValues } from "./_shared/access-log-storage-forms";
import { ClickHouseStorageFields, clickHouseStorageFormValues, type ClickHouseStorageFormValues } from "./_shared/clickhouse-storage-form";
import { FormOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { advSettingTabList } from "./_shared/advSettingTabList";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
import PasswordInput from "@/components/PasswordInput";

interface DBNodeStatus {
  isOk?: boolean;
  error?: string;
  version?: string;
  size?: number; // bytes
}

interface DBNode {
  id: number;
  name: string;
  description: string;
  isOn: boolean;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset: string;
  status?: DBNodeStatus;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface DBNodeFormValues {
  name: string;
  description?: string;
  isOn: boolean;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  charset?: string;
}

interface DBNodeFormModalProps {
  open: boolean;
  node?: DBNode;
  onCancel: () => void;
  onOk: () => void;
}

const DBNodeFormModal = ({ open, node, onCancel, onOk }: DBNodeFormModalProps) => {
  const [form] = Form.useForm<DBNodeFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!node;

  const onFinish = async (values: DBNodeFormValues) => {
    try {
      setSubmitting(true);
      if (isEdit && node) {
        await request(`/api/db-nodes/${node.id}`, {
          method: "PUT",
          data: { ...values, dbNodeId: node.id },
        });
        message.success("修改成功");
      } else {
        await request("/api/db-nodes", {
          method: "POST",
          data: values,
        });
        message.success("创建成功");
      }
      onOk();
    } catch (error) {
      console.error(isEdit ? "修改日志数据库失败:" : "创建日志数据库失败:", error);
      message.error(formatErrorMessage(isEdit ? "修改失败" : "创建失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "修改日志数据库" : "创建日志数据库"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={{ xs: "90%", sm: "80%", md: "70%", lg: "60%", xl: "50%", xxl: "40%" }}
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue({
            name: node?.name ?? "",
            description: node?.description ?? "",
            isOn: node ? node.isOn : true,
            host: node?.host ?? "",
            port: node?.port ?? 3306,
            database: node?.database ?? "",
            username: node?.username ?? "",
            password: "",
            charset: node?.charset ?? "utf8mb4",
          });
        } else {
          form.resetFields();
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          isOn: true,
          port: 3306,
          charset: "utf8mb4",
        }}
      >
        <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
          <Input placeholder="请输入名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="请输入描述" />
        </Form.Item>

        <Form.Item name="isOn" label="启用" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        <Form.Item name="host" label="主机地址" rules={[{ required: true, message: "请输入主机地址" }]}>
          <Input placeholder="127.0.0.1" />
        </Form.Item>

        <Form.Item name="port" label="端口" rules={[{ required: true, message: "请输入端口" }]}>
          <InputNumber min={1} max={65535} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="database" label="数据库名" rules={[{ required: true, message: "请输入数据库名" }]}>
          <Input placeholder="请输入数据库名" />
        </Form.Item>

        <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item name="password" label="密码" rules={isEdit ? [] : [{ required: true, message: "请输入密码" }]}>
          <PasswordInput placeholder={isEdit ? "不修改请留空" : "请输入密码"} />
        </Form.Item>

        <Form.Item name="charset" label="字符集">
          <Input placeholder="utf8mb4" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

function MySQLStorageTable({ hasPrimaryMySQL }: { hasPrimaryMySQL: boolean }) {
  const query = useQuery<{ dbNodes: DBNode[]; total: number }>({
    queryKey: settingQueryKeys.accessLogDB(),
    queryFn: () => listAccessLogDBNodes(),
  });
  const { dbNodes } = query.data ?? { dbNodes: [], total: 0 };
  const loading = query.isPending || query.isFetching;

  const [modalOpen, setModalOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState<DBNode | undefined>(undefined);

  const handleDelete = async (nodeId: number) => {
    try {
      await request(`/api/db-nodes/${nodeId}`, { method: "DELETE" });
      message.success("删除成功");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("删除失败", error));
    }
  };

  const columns: ProColumns<DBNode>[] = [
    {
      title: "名称",
      dataIndex: "name",
    },
    {
      title: "连接地址",
      key: "hostPort",
      render: (_, record) => `${record.host}:${record.port}`,
    },
    {
      title: "数据库名",
      dataIndex: "database",
    },
    {
      title: "版本",
      key: "version",
      render: (_, record) => record.status?.version || "-",
    },
    {
      title: "用量",
      key: "size",
      render: (_, record) => (record.status?.size != null ? formatBytes(record.status.size) : "-"),
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => (record.status?.isOk ? <Tag color="green">正常</Tag> : <Tag color="red">异常</Tag>),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<FormOutlined />}
            size="small"
            onClick={() => {
              setCurrentNode(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {query.isError && <Alert type="error" title="读取日志数据库失败" description={formatErrorMessage("读取失败", query.error)} showIcon />}
      <ProTable<DBNode>
        headerTitle="MySQL 日志数据库"
        columns={columns}
        dataSource={dbNodes}
        rowKey="id"
        search={false}
        pagination={false}
        loading={loading}
        options={{
          reload: () => {
            void query.refetch();
          },
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCurrentNode(undefined);
              setModalOpen(true);
            }}
          >
            创建日志数据库
          </Button>,
        ]}
      />
      {!loading && dbNodes.length === 0 && (
        <Alert
          showIcon
          type={hasPrimaryMySQL ? "info" : "warning"}
          title={
            hasPrimaryMySQL ? "未配置日志节点时，使用当前主 MySQL 数据库。" : "当前主数据库不是 MySQL，请添加 MySQL 日志节点或选择其他存储引擎。"
          }
        />
      )}

      <DBNodeFormModal
        open={modalOpen}
        node={currentNode}
        onCancel={() => setModalOpen(false)}
        onOk={() => {
          setModalOpen(false);
          void query.refetch();
        }}
      />
    </>
  );
}

const engineOptions = [
  { label: "MySQL", value: "mysql" },
  { label: "Bleve", value: "bleve" },
  { label: "Elasticsearch", value: "elasticsearch" },
  { label: "OpenSearch", value: "opensearch" },
  { label: "ClickHouse", value: "clickhouse" },
];

function StorageSettingsForm({
  engine,
  config,
  onSaved,
}: {
  engine: AccessLogEngine;
  config: ReadAccessLogStorageResponse;
  onSaved: () => Promise<unknown>;
}) {
  const [form] = Form.useForm<SearchStorageFormValues & ClickHouseStorageFormValues & { bleveDirectory: string }>();
  const [submitting, setSubmitting] = useState<"test" | "save" | undefined>();
  const settings = engine === "elasticsearch" ? config.elasticsearch : engine === "opensearch" ? config.opensearch : undefined;
  const submit = async (test: boolean) => {
    try {
      const values = await form.validateFields();
      setSubmitting(test ? "test" : "save");
      const input: AccessLogStorageInput = { engine };
      if (engine === "bleve") input.bleveDirectory = values.bleveDirectory;
      if (engine === "clickhouse") {
        input.clickhouse = {
          endpoint: values.endpoint,
          database: values.database,
          table: values.table,
          username: values.username,
          password: values.password,
          timeoutSeconds: values.timeoutSeconds,
          caPEM: values.caPEM,
          clearPassword: values.clearPassword,
        };
      }
      if (engine === "elasticsearch" || engine === "opensearch") {
        input[engine] = {
          endpoints: values.endpointsText.split(/\s+/).filter(Boolean),
          indexPrefix: values.indexPrefix,
          timeoutSeconds: values.timeoutSeconds,
          authType: values.authType,
          username: values.username,
          password: values.password,
          apiKey: values.apiKey,
          clearPassword: values.clearPassword,
          clearApiKey: values.clearApiKey,
          caPEM: values.caPEM,
        };
      }
      await saveAccessLogStorage(input, test);
      if (test) message.success("连接测试成功");
      else {
        await onSaved();
        form.setFieldsValue({ password: "", apiKey: "", clearPassword: false, clearApiKey: false });
        message.success("保存成功，存储引擎已启用");
      }
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) return;
      message.error(formatErrorMessage(test ? "测试失败" : "保存失败", error));
    } finally {
      setSubmitting(undefined);
    }
  };
  return (
    <Card title={`${engineOptions.find((option) => option.value === engine)?.label} 存储设置`} style={{ marginTop: 16 }}>
      {engine === "mysql" && <MySQLStorageTable hasPrimaryMySQL={config.hasPrimaryMySQL} />}
      {engine === "bleve" && (
        <Alert
          type="warning"
          showIcon
          title={`仅由主 API ${config.primaryApiNodeName || "节点"} 读写本地索引`}
          description={
            <>
              <p>
                建议仅用于小型系统。建议每天 HTTP 访问日志少于 100 万条，主 API 至少配置 4 核 CPU、8 GB 内存和本地 SSD，日志保留 7 天以内。
                此为保守选型建议，实际容量取决于日志大小、写入峰值和查询负载；大量请求体或频繁并发查询时，建议选择其他存储引擎。
              </p>
              <p style={{ marginBottom: 0 }}>其他 API 自动转发日志请求。更换主 API 机器后将使用新主节点的本地目录，历史数据不会自动迁移。</p>
            </>
          }
          style={{ marginBottom: 24 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...(engine === "clickhouse" ? clickHouseStorageFormValues(config.clickhouse) : searchStorageFormValues(settings)),
          bleveDirectory: config.bleveDirectory,
        }}
        style={{ maxWidth: engine === "mysql" ? undefined : 720 }}
      >
        {engine === "bleve" && <BleveStorageFields />}
        {engine === "clickhouse" && <ClickHouseStorageFields settings={config.clickhouse} />}
        {(engine === "elasticsearch" || engine === "opensearch") && <SearchStorageFields settings={settings} />}
        <Space style={{ marginTop: 16 }}>
          <Button disabled={!!submitting} loading={submitting === "test"} onClick={() => void submit(true)}>
            测试连接
          </Button>
          <Button type="primary" disabled={!!submitting} loading={submitting === "save"} onClick={() => void submit(false)}>
            保存并启用
          </Button>
        </Space>
      </Form>
    </Card>
  );
}

export default function AccessLogDB() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: settingQueryKeys.accessLogStorage(), queryFn: readAccessLogStorage });
  const [selectedEngine, setSelectedEngine] = useState<AccessLogEngine>();
  const config = query.data;
  const engine = selectedEngine ?? (config?.engine as AccessLogEngine | undefined) ?? "mysql";
  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: location.pathname, tabList: advSettingTabList })}
      header={{ title: "高级设置" }}
      tabList={advSettingTabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
      loading={query.isPending}
    >
      {query.isError && (
        <Alert
          showIcon
          type="error"
          title="读取存储设置失败"
          description={formatErrorMessage("读取失败", query.error)}
          action={<Button onClick={() => void query.refetch()}>重试</Button>}
        />
      )}
      {config && (
        <>
          <Card>
            <Space wrap>
              <span>
                当前存储引擎：<Tag>{engineOptions.find((option) => option.value === config.engine)?.label ?? config.engine}</Tag>
              </span>
              <Select aria-label="存储引擎" value={engine} options={engineOptions} style={{ width: 180 }} onChange={setSelectedEngine} />
            </Space>
            <Alert
              style={{ marginTop: 16 }}
              type="info"
              showIcon
              title="选择引擎后点击“保存并启用”生效。切换后仅查询当前引擎，旧配置与历史数据保留，可切回查看。"
            />
            {!config.isAvailable && <Alert style={{ marginTop: 16 }} type="warning" showIcon title="当前存储不可用" description={config.error} />}
          </Card>
          <StorageSettingsForm
            key={engine}
            engine={engine}
            config={config}
            onSaved={async () => {
              await query.refetch({ throwOnError: true });
            }}
          />
        </>
      )}
    </PageContainer>
  );
}
