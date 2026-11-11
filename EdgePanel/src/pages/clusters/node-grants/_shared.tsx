import { CheckCircleOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { PageContainer, type ProColumns, ProTable } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { NavLink, request, useNavigate, useParams, useSearchParams } from "@umijs/max";
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, TableProps, Tabs, type TabsProps, Tag } from "antd";
import { useEffect, useState } from "react";
import TableActionIcon from "@/components/TableActionIcon";
import PasswordInput from "@/components/PasswordInput";
import type { NodeCluster } from "@/pb/models/model_node_cluster_pb";
import type { NodeGrant } from "@/pb/models/model_node_grant_pb";
import type { Node } from "@/pb/models/model_node_pb";
import type { ListEnabledNodeGrantsResponse } from "@/pb/service_node_grant_pb";
import { clusterQueryKeys } from "@/queries/keys";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { getNodeGrantDetail, listNodeGrants } from "@/services/clusters";
import { withDefaultPageSize } from "@/services/pagination";
import { formatErrorMessage, getErrorMessage } from "@/utils";

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

// 认证列表组件
const NodeGrantList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const query = useQuery<ListEnabledNodeGrantsResponse>({
    queryKey: clusterQueryKeys.nodeGrants(effectiveSearchParams),
    queryFn: () => listNodeGrants(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const onTableChange: TableProps<NodeGrant>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newParams = new URLSearchParams(searchParams);

    if (pagination.current) {
      newParams.set("page", String(pagination.current));
    } else {
      newParams.delete("page");
    }
    if (pagination.pageSize) {
      newParams.set("size", String(pagination.pageSize));
    }

    if (s.order && s.columnKey) {
      newParams.set("sortField", s.columnKey as string);
      newParams.set("sortOrder", s.order);
    } else {
      newParams.delete("sortField");
      newParams.delete("sortOrder");
    }

    setSearchParams(newParams);
  };

  const onDelete = (grantId: string) => {
    request(`/api/node-grants/${grantId}`, { method: "DELETE" })
      .then(() => {
        void query.refetch();
      })
      .catch((error) => {
        console.log("delete error: ", error);
        Modal.error({ title: "错误", content: formatErrorMessage("删除认证失败", error) });
      });
  };

  const renderMethod = (method: string): React.ReactNode => {
    switch (method) {
      case "user":
        return <Tag color="blue">用户名+密码</Tag>;
      case "privateKey":
        return <Tag color="green">私钥</Tag>;
      default:
        return <Tag>{method}</Tag>;
    }
  };

  const columns: ProColumns<NodeGrant>[] = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      fixed: "left",
      render: (id) => String(id),
      search: false,
    },
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      fieldProps: { placeholder: "搜索认证..." },
    },
    {
      title: "名称",
      dataIndex: "name",
      render: (name, record) => <NavLink to={`/clusters/node-grants/${record.id}`}>{name}</NavLink>,
      search: false,
    },
    {
      title: "类型",
      dataIndex: "method",
      render: (_, record) => renderMethod(record.method),
      search: false,
    },
    {
      title: "用户名",
      dataIndex: "username",
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      fixed: "right",
      render: (_, record) => [
        <TableActionIcon key="view" tooltip="查看详情" icon={<EyeOutlined />} onClick={() => navigate(`/clusters/node-grants/${record.id}`)} />,
        <Popconfirm
          key="delete"
          title="删除认证"
          description="确定要删除该认证吗？"
          onConfirm={() => onDelete(String(record.id))}
          okText="确认"
          cancelText="取消"
        >
          <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "SSH认证管理" }}
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => navigate("/clusters/node-grants/create")}>
          创建认证
        </Button>,
      ]}
    >
      <ProTable<NodeGrant>
        columns={columns}
        dataSource={data?.nodeGrants || []}
        loading={loading}
        rowKey={(record) => String(record.id)}
        onChange={onTableChange}
        options={{
          reload: () => {
            void query.refetch();
          },
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
        }}
        form={{
          initialValues: { keyword: params.keyword },
        }}
        onSubmit={(values) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("keyword", values.keyword || "");
          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("keyword", "");
          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        pagination={{
          current: Number(params.page),
          pageSize: Number(params.size),
          total: Number(data?.total || 0),
        }}
      />
    </PageContainer>
  );
};

// 创建认证组件
const CreateNodeGrant = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<NodeGrant & { method: string }>();
  const [loading, setLoading] = useState(false);
  const method = Form.useWatch("method", form);

  const onFinish = async (values: NodeGrant & { method: string }) => {
    try {
      setLoading(true);
      const payload = {
        name: values.name,
        method: values.method,
        username: values.username,
        password: values.password || "",
        privateKey: values.privateKey || "",
        passphrase: values.passphrase || "",
        description: values.description || "",
      };

      await request("/api/node-grants", {
        method: "POST",
        data: payload,
      });
      Modal.success({
        title: "成功",
        content: "认证已创建",
        onOk: () => navigate("/clusters/node-grants"),
      });
    } catch (error) {
      console.error("创建认证失败:", error);
      Modal.error({ title: "错误", content: formatErrorMessage("创建认证失败", error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })} header={{ title: "创建SSH认证" }}>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ method: "user" }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入认证名称" }]}>
            <Input placeholder="请输入认证名称" />
          </Form.Item>

          <Form.Item name="method" label="认证类型" rules={[{ required: true, message: "请选择认证类型" }]}>
            <Select
              options={[
                { label: "用户名+密码", value: "user" },
                { label: "私钥", value: "privateKey" },
              ]}
            />
          </Form.Item>

          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>

          {method === "user" && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
              <PasswordInput placeholder="请输入密码" />
            </Form.Item>
          )}

          {method === "privateKey" && (
            <>
              <Form.Item name="privateKey" label="私钥" rules={[{ required: true, message: "请输入私钥" }]}>
                <Input.TextArea placeholder="请输入私钥" rows={6} />
              </Form.Item>

              <Form.Item name="passphrase" label="私钥密码（可选）">
                <PasswordInput placeholder="请输入私钥密码" />
              </Form.Item>
            </>
          )}

          <Form.Item name="description" label="描述（可选）">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建
              </Button>
              <Button onClick={() => navigate("/clusters/node-grants")}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

// 认证详情组件
const NodeGrantDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useQuery<{
    nodeGrant: NodeGrant;
    nodeClusters: NodeCluster[];
    nodes: Node[];
  }>({
    queryKey: clusterQueryKeys.nodeGrantDetail(id),
    queryFn: () => getNodeGrantDetail(id),
    enabled: Boolean(id),
  });
  const [form] = Form.useForm<NodeGrant & { method: string }>();
  const [editLoading, setEditLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ isOk: boolean; error: string } | null>(null);
  const method = Form.useWatch("method", form);
  const pageContainerLoading = query.isPending && !query.data;

  const {
    nodeGrant: grant,
    nodeClusters: clustersData,
    nodes: nodesData,
  } = query.data ??
  ({
    nodeGrant: undefined,
    nodeClusters: undefined,
    nodes: undefined,
  } as {
    nodeGrant: NodeGrant | undefined;
    nodeClusters: NodeCluster[] | undefined;
    nodes: Node[] | undefined;
  });

  useEffect(() => {
    if (!grant) {
      return;
    }
    form.setFieldsValue({
      name: grant.name,
      method: grant.method,
      username: grant.username,
      description: grant.description,
      password: "",
      privateKey: "",
      passphrase: "",
    });
  }, [form, grant]);

  const onEditFinish = async (values: NodeGrant & { method: string }) => {
    try {
      setEditLoading(true);
      const payload: Record<string, unknown> = {
        name: values.name,
        method: values.method,
        username: values.username,
        description: values.description || "",
      };
      if (values.password) payload.password = values.password;
      if (values.privateKey) payload.privateKey = values.privateKey;
      if (values.passphrase) payload.passphrase = values.passphrase;

      await request(`/api/node-grants/${id}`, {
        method: "PUT",
        data: payload,
      });
      Modal.success({
        title: "成功",
        content: "认证已更新",
      });
    } catch (error) {
      console.error("更新认证失败:", error);
      Modal.error({ title: "错误", content: formatErrorMessage("更新认证失败", error) });
    } finally {
      setEditLoading(false);
    }
  };

  const onTest = async (testValues: { host: string; port: number }) => {
    try {
      setTestLoading(true);
      const response = await request<{ isOk?: boolean; error?: string }>(`/api/node-grants/${id}/test-connection`, {
        method: "POST",
        data: {
          host: testValues.host,
          port: testValues.port,
        },
      });
      setTestResult({
        isOk: !!response.isOk,
        error: response.error || "",
      });
    } catch (error) {
      console.error("测试连接失败:", error);
      setTestResult({
        isOk: false,
        error: getErrorMessage(error, "测试连接请求失败"),
      });
    } finally {
      setTestLoading(false);
    }
  };

  const tabItems: TabsProps["items"] = [
    {
      key: "detail",
      label: grant ? `${grant.name} - 详情` : "详情",
      children: (
        <>
          <Card title="基本信息" style={{ marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <div style={{ color: "#666", fontSize: "12px" }}>ID</div>
                <div>{grant?.id}</div>
              </div>
              <div>
                <div style={{ color: "#666", fontSize: "12px" }}>名称</div>
                <div>{grant?.name}</div>
              </div>
              <div>
                <div style={{ color: "#666", fontSize: "12px" }}>认证类型</div>
                <div>{grant?.method === "user" ? "用户名+密码" : "私钥"}</div>
              </div>
              <div>
                <div style={{ color: "#666", fontSize: "12px" }}>用户名</div>
                <div>{grant?.username}</div>
              </div>
              {grant?.method === "user" && (
                <div>
                  <div style={{ color: "#666", fontSize: "12px" }}>密码</div>
                  <div>{grant.hasPassword ? grant.passwordMask : "未设置"}</div>
                </div>
              )}
              {grant?.method === "privateKey" && (
                <>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ color: "#666", fontSize: "12px" }}>私钥</div>
                    <div>{grant.hasPrivateKey ? grant.privateKeyMask : "未设置"}</div>
                  </div>
                  {grant?.hasPassphrase && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ color: "#666", fontSize: "12px" }}>私钥密码</div>
                      <div>{grant.passphraseMask}</div>
                    </div>
                  )}
                </>
              )}
              {grant?.description && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ color: "#666", fontSize: "12px" }}>描述</div>
                  <div>{grant.description}</div>
                </div>
              )}
            </div>
          </Card>
          <Card title="使用此认证的集群" style={{ marginBottom: "16px" }}>
            {clustersData && clustersData.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {clustersData.map((cluster: NodeCluster) => (
                  <Tag key={String(cluster.id)}>{cluster.name}</Tag>
                ))}
              </div>
            ) : (
              <div style={{ color: "#999" }}>未使用</div>
            )}
          </Card>
          <Card title="使用此认证的节点" style={{ marginBottom: "16px" }}>
            {nodesData && nodesData.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {nodesData.map((node: Node) => (
                  <Tag key={String(node.id)}>{node.name}</Tag>
                ))}
              </div>
            ) : (
              <div style={{ color: "#999" }}>未使用</div>
            )}
          </Card>
        </>
      ),
    },
    {
      key: "test",
      label: "测试",
      children: (
        <Card>
          <Form layout="vertical" onFinish={onTest}>
            <Form.Item name="host" label="IP地址" rules={[{ required: true, message: "请输入IP地址" }]}>
              <Input placeholder="请输入服务器IP地址" />
            </Form.Item>

            <Form.Item
              name="port"
              label="端口"
              initialValue="22"
              rules={[
                { required: true, message: "请输入端口" },
                { pattern: /^\d+$/, message: "端口必须是数字" },
              ]}
            >
              <Input placeholder="请输入SSH端口，默认22" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={testLoading}>
                测试连接
              </Button>
            </Form.Item>

            {testResult && (
              <Alert
                title={testResult.isOk ? "连接成功" : "连接失败"}
                description={testResult.error || ""}
                type={testResult.isOk ? "success" : "error"}
                closable={{ onClose: () => setTestResult(null) }}
              />
            )}
          </Form>
        </Card>
      ),
    },
    {
      key: "edit",
      label: "编辑",
      children: (
        <Card>
          <Form form={form} layout="vertical" onFinish={onEditFinish}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入认证名称" }]}>
              <Input placeholder="请输入认证名称" />
            </Form.Item>

            <Form.Item name="method" label="认证类型" rules={[{ required: true, message: "请选择认证类型" }]}>
              <Select
                options={[
                  { label: "用户名+密码", value: "user" },
                  { label: "私钥", value: "privateKey" },
                ]}
              />
            </Form.Item>

            <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input placeholder="请输入用户名" />
            </Form.Item>

            {method === "user" && (
              <Form.Item
                name="password"
                label="密码"
                extra={
                  grant?.hasPassword ? (
                    <Space size={8}>
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      已保存密码 {grant.passwordMask}，留空时保留现有密码。
                    </Space>
                  ) : (
                    "请输入密码。"
                  )
                }
                rules={[{ required: !grant?.hasPassword, message: "请输入密码" }]}
              >
                <PasswordInput placeholder={grant?.hasPassword ? "留空以保留现有密码" : "请输入密码"} />
              </Form.Item>
            )}

            {method === "privateKey" && (
              <>
                <Form.Item
                  name="privateKey"
                  label="私钥"
                  extra={
                    grant?.hasPrivateKey ? (
                      <Space size={8}>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        已保存私钥 {grant.privateKeyMask}，留空时保留现有私钥。
                      </Space>
                    ) : (
                      "请输入私钥。"
                    )
                  }
                  rules={[{ required: !grant?.hasPrivateKey, message: "请输入私钥" }]}
                >
                  <Input.TextArea placeholder={grant?.hasPrivateKey ? "留空以保留现有私钥" : "请输入私钥"} rows={6} />
                </Form.Item>

                <Form.Item
                  name="passphrase"
                  label="私钥密码（可选）"
                  extra={grant?.hasPassphrase ? `已保存私钥密码 ${grant.passphraseMask}，留空时保留现有私钥密码。` : "留空表示私钥没有密码。"}
                >
                  <PasswordInput placeholder={grant?.hasPassphrase ? "留空以保留现有私钥密码" : "请输入私钥密码"} />
                </Form.Item>
              </>
            )}

            <Form.Item name="description" label="描述（可选）">
              <Input.TextArea placeholder="请输入描述" rows={3} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={editLoading}>
                  保存
                </Button>
                <Button onClick={() => navigate("/clusters/node-grants")}>返回</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname(), entityName: grant?.name, fallbackEntityLabel: "SSH认证" })}
      header={{ title: grant?.name || "SSH认证详情" }}
      loading={pageContainerLoading}
    >
      <Tabs items={tabItems} />
    </PageContainer>
  );
};

export { CreateNodeGrant, NodeGrantDetail, NodeGrantList };
