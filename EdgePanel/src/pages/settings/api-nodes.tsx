import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Button, Modal, Form, Input, Switch, Space, Tag, Popconfirm, message, Progress, Card, Alert, Typography, Flex, theme } from "antd";
import { ColumnsType } from "antd/es/table";
import { PageContainer } from "@ant-design/pro-components";
import { request, useLocation, useNavigate } from "@umijs/max";
import { settingQueryKeys } from "@/queries/keys";
import { findApiNode, listApiNodes } from "@/services/settings";
import { FormOutlined, DeleteOutlined, PlusOutlined, CopyOutlined } from "@ant-design/icons";
import { advSettingTabList } from "./_shared/advSettingTabList";
import { MultiListenPortInput } from "@/components/MultiListenPortInput";
import { AccessAddrsInput } from "@/components/AccessAddrsInput";
import LazySyntaxHighlighter, { SyntaxThemeName } from "@/components/LazySyntaxHighlighter";
import type { NetworkAddress } from "@/pb/models/model_network_address_pb";
import useThemeStore from "@/stores/themeStore";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const { Paragraph, Text } = Typography;

interface APINodeStatus {
  buildVersion?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  isActive?: boolean;
}

interface APINode {
  id: number;
  name: string;
  description: string;
  isOn: boolean;
  isPrimary: boolean;
  accessAddrs: string[];
  status?: APINodeStatus;
  http?: { isOn: boolean; listen: NetworkAddress[] };
  https?: { isOn: boolean; listen: NetworkAddress[] };
  typedAccessAddrs?: NetworkAddress[];
}

interface ApiNodeFormValues {
  name: string;
  description?: string;
  isOn: boolean;
  isPrimary?: boolean;
  http: { isOn: boolean; listen: NetworkAddress[] };
  typedAccessAddrs: NetworkAddress[];
}

interface ApiNodeFormModalProps {
  open: boolean;
  node?: APINode;
  onCancel: () => void;
  onOk: () => void;
}

const ApiNodeFormModal = ({ open, node, onCancel, onOk }: ApiNodeFormModalProps) => {
  const [form] = Form.useForm<ApiNodeFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const { token } = theme.useToken();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const isEdit = !!node;
  const detailQuery = useQuery({
    queryKey: settingQueryKeys.apiNode(node?.id),
    queryFn: ({ signal }) => {
      if (!node) {
        throw new Error("未选择 API 节点");
      }
      return findApiNode(node.id, signal);
    },
    enabled: open && isEdit,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const detailNode = detailQuery.data?.apiNode;
  const detailLoading = isEdit && detailQuery.isPending;
  const detailUnavailable = isEdit && !detailNode;
  const hasApiCredentials = Boolean(detailNode?.uniqueId?.trim() && detailNode?.secret?.trim());
  const apiYaml = hasApiCredentials ? (detailQuery.data?.configYAML ?? "") : "";
  const databaseConfigIncluded = detailQuery.data?.databaseConfigIncluded ?? false;

  useEffect(() => {
    if (!open || (isEdit && !detailNode)) {
      return;
    }
    form.setFieldsValue({
      name: detailNode?.name ?? "",
      description: detailNode?.description ?? "",
      isOn: detailNode?.isOn ?? true,
      isPrimary: detailNode?.isPrimary ?? false,
      http: detailNode?.http ?? { isOn: true, listen: [] },
      typedAccessAddrs: detailNode?.typedAccessAddrs ?? [],
    });
  }, [form, open, isEdit, detailNode]);
  const syntaxTheme: SyntaxThemeName = isDarkMode ? "oneDark" : "oneLight";
  const syntaxCustomStyle = {
    backgroundColor: isDarkMode ? token.colorBgElevated : token.colorBgLayout,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    fontSize: 14,
    margin: 0,
    padding: 16,
  };

  const handleCopyConfig = async () => {
    if (!apiYaml) {
      return;
    }

    try {
      await navigator.clipboard.writeText(apiYaml);
      message.success("配置已复制到剪贴板");
    } catch (error) {
      console.error("复制 goedge2.yaml 节点配置失败:", error);
      message.error(formatErrorMessage("复制失败", error));
    }
  };

  const onFinish = async (values: ApiNodeFormValues) => {
    try {
      setSubmitting(true);
      if (node) {
        if (!detailNode) {
          return;
        }
        await request(`/api/api-nodes/${node.id}`, {
          method: "PUT",
          data: {
            id: node.id,
            name: values.name,
            description: values.description,
            isOn: values.isOn,
            isPrimary: values.isPrimary,
            http: { ...values.http, isOn: true },
            typedAccessAddrs: values.typedAccessAddrs,
            https: detailNode.https,
          },
        });
        message.success("修改成功");
      } else {
        await request("/api/api-nodes", {
          method: "POST",
          data: {
            name: values.name,
            description: values.description,
            isOn: values.isOn,
            http: { ...values.http, isOn: true },
            typedAccessAddrs: values.typedAccessAddrs,
          },
        });
        message.success("创建成功");
      }
      onOk();
    } catch (error) {
      console.error(isEdit ? "修改API节点失败:" : "创建API节点失败:", error);
      message.error(formatErrorMessage(isEdit ? "修改失败" : "创建失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "修改API节点" : "创建API节点"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okButtonProps={{ disabled: detailUnavailable }}
      width={{ xs: "90%", sm: "80%", md: "70%", lg: "60%", xl: "50%", xxl: "40%" }}
      afterOpenChange={(visible) => {
        if (!visible) {
          form.resetFields();
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={submitting || detailUnavailable}
        initialValues={{
          isOn: true,
        }}
      >
        <Form.Item name="name" label="节点名称" rules={[{ required: true, message: "请输入节点名称" }]}>
          <Input placeholder="请输入节点名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="请输入描述" />
        </Form.Item>

        <Form.Item name="isOn" label="启用" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        <Form.Item name={["http", "listen"]} label="HTTP监听端口" help="输入后按回车添加，可粘贴多个端口。">
          <MultiListenPortInput />
        </Form.Item>

        {/* TODO: 后期实现 HTTPS 结构化编辑表单 */}

        <Form.Item name="typedAccessAddrs" label="访问地址" help="每行一个访问地址，例如 http://192.168.100.100:8080">
          <AccessAddrsInput />
        </Form.Item>

        {/* TODO: 后期实现 REST API 结构化编辑表单 */}

        {isEdit && (
          <Form.Item name="isPrimary" label="主节点" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        )}

        {isEdit && (
          <Card
            size="small"
            title="goedge2.yaml"
            loading={detailLoading}
            extra={
              <Button icon={<CopyOutlined />} onClick={handleCopyConfig} disabled={!apiYaml}>
                复制配置
              </Button>
            }
          >
            <Flex vertical gap="small" style={{ width: "100%" }}>
              <Paragraph style={{ marginBottom: 0 }}>
                {databaseConfigIncluded ? (
                  <>
                    将以下内容保存为 <Text code>goedge2.yaml</Text>。数据库类型来自当前提供接口的 API 服务，<Text code>database.dsn</Text> 已脱敏为{" "}
                    <Text code>******</Text>，使用前请替换为目标节点的完整数据库 DSN；已有配置请保留原 DSN。
                  </>
                ) : (
                  <>
                    将以下节点身份字段更新到 <Text code>goedge2.yaml</Text>，并保留或补充 <Text code>database.driver</Text> 和{" "}
                    <Text code>database.dsn</Text> 数据库配置。
                  </>
                )}
              </Paragraph>

              {detailQuery.isError ? (
                <Alert
                  showIcon
                  type="error"
                  title={formatErrorMessage("读取 API 节点详情失败", detailQuery.error)}
                  action={
                    <Button disabled={detailQuery.isFetching} onClick={() => void detailQuery.refetch()}>
                      重试
                    </Button>
                  }
                />
              ) : detailUnavailable ? (
                <Alert showIcon type="warning" title="API 节点不存在或已被删除。" />
              ) : hasApiCredentials ? (
                <>
                  {!databaseConfigIncluded && (
                    <Alert showIcon type="warning" title="未能读取当前 API 服务的数据库配置，请保留或手动补充数据库配置。" />
                  )}
                  <LazySyntaxHighlighter
                    language="yaml"
                    theme={syntaxTheme}
                    customStyle={syntaxCustomStyle}
                    codeTagProps={{ style: { background: "transparent" } }}
                  >
                    {apiYaml}
                  </LazySyntaxHighlighter>
                </>
              ) : (
                <Alert showIcon type="warning" title="当前节点缺少 UniqueId 或 Secret，暂时无法生成 goedge2.yaml 节点配置。" />
              )}
            </Flex>
          </Card>
        )}
      </Form>
    </Modal>
  );
};

export default function ApiNodes() {
  const query = useQuery<{ apiNodes: APINode[] }>({
    queryKey: settingQueryKeys.apiNodes(),
    queryFn: () => listApiNodes(),
  });
  const { apiNodes } = query.data ?? { apiNodes: [] };
  const loading = query.isPending || query.isFetching;
  const pageContainerLoading = loading && !apiNodes;
  const location = useLocation();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState<APINode | undefined>(undefined);

  const handleDelete = async (nodeId: number) => {
    try {
      await request(`/api/api-nodes/${nodeId}`, { method: "DELETE" });
      message.success("删除成功");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("删除失败", error));
    }
  };

  const columns: ColumnsType<APINode> = [
    {
      title: "名称",
      dataIndex: "name",
      render: (_, record) => (
        <Flex vertical align="flex-start" gap={4}>
          <span>{record.name}</span>
          {record.isPrimary ? <Tag color="blue">主节点</Tag> : null}
        </Flex>
      ),
    },
    {
      title: "访问地址",
      dataIndex: "accessAddrs",
      render: (_: unknown, record: APINode) => {
        if (record.typedAccessAddrs?.length) {
          return record.typedAccessAddrs.map((addr: NetworkAddress) => `${addr.protocol}://${addr.host}:${addr.portRange}`).join(", ");
        }
        return record.accessAddrs?.join(", ") || "-";
      },
    },
    {
      title: "版本号",
      key: "buildVersion",
      render: (_, record) => record.status?.buildVersion || "-",
    },
    {
      title: "CPU",
      key: "cpuUsage",
      render: (_, record) => (record.status?.cpuUsage != null ? <Progress percent={Math.round(record.status.cpuUsage * 100)} size="small" /> : "-"),
    },
    {
      title: "内存",
      key: "memoryUsage",
      render: (_, record) =>
        record.status?.memoryUsage != null ? <Progress percent={Math.round(record.status.memoryUsage * 100)} size="small" /> : "-",
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (v: boolean) => (v ? <Tag color="green">已启用</Tag> : <Tag color="red">已禁用</Tag>),
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
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList: advSettingTabList,
      })}
      header={{ title: "高级设置" }}
      loading={pageContainerLoading}
      tabList={advSettingTabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setCurrentNode(undefined);
            setModalOpen(true);
          }}
        >
          创建API节点
        </Button>
      }
    >
      <Table<APINode> columns={columns} dataSource={apiNodes} rowKey={(record) => String(record.id)} pagination={false} loading={loading} />

      {modalOpen && (
        <ApiNodeFormModal
          key={currentNode?.id ?? "new"}
          open={modalOpen}
          node={currentNode}
          onCancel={() => setModalOpen(false)}
          onOk={() => {
            setModalOpen(false);
            void query.refetch();
          }}
        />
      )}
    </PageContainer>
  );
}
