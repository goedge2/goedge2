import {
  Button,
  Card,
  Form,
  FormInstance,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Tabs,
  Switch,
  TableProps,
  message,
} from "antd";
import { Outlet, request, useLocation, useNavigate, useParams, useSearchParams } from "@umijs/max";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { clusterQueryKeys } from "@/queries/keys";
import { getMonitorNodeDetail, getMonitorSettings, listMonitorGroups, listMonitorNodes } from "@/services/clusters";
import type { ReportNode } from "@/pb/models/model_report_node_pb";
import type { ReportNodeGroup } from "@/pb/models/model_report_node_group_pb";
import type { ReportResult } from "@/pb/models/model_report_result_pb";
import type { NodeLog } from "@/pb/models/model_node_log_pb";
import type { ListEnabledReportNodesResponse, FindEnabledReportNodeResponse, ReadReportNodeGlobalSettingResponse } from "@/pb/service_report_node_pb";
import type { FindAllEnabledReportNodeGroupsResponse, FindEnabledReportNodeGroupResponse } from "@/pb/service_report_node_group_pb";
import type { ListReportResultsResponse } from "@/pb/service_report_result_pb";
import type { ListNodeLogsResponse } from "@/pb/service_node_log_pb";
import { formatErrorMessage, useFetchData } from "@/utils";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import TableActionIcon from "@/components/TableActionIcon";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

export const MonitorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabList = [
    { key: "/clusters/monitor", tab: "终端" },
    { key: "/clusters/monitor/groups", tab: "分组" },
    { key: "/clusters/monitor/settings", tab: "设置" },
  ];

  const activeKey = tabList.find((t) => location.pathname === t.key)?.key || "/clusters/monitor";

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList,
      })}
      header={{ title: "区域监控" }}
      tabActiveKey={activeKey}
      onTabChange={handleTabChange}
      tabList={tabList}
    >
      <Card>
        <Outlet />
      </Card>
    </PageContainer>
  );
};

interface NodeFormUIProps {
  groups: ReportNodeGroup[];
}

const NodeFormUI = ({ groups }: NodeFormUIProps) => {
  return (
    <>
      <Form.Item name="name" label="终端名称" rules={[{ required: true, message: "请输入终端名称" }]}>
        <Input placeholder="请输入终端名称" />
      </Form.Item>

      <Form.Item name="location" label="区域">
        <Input placeholder="请输入区域" />
      </Form.Item>

      <Form.Item name="isp" label="网络提供商">
        <Input placeholder="请输入网络提供商" />
      </Form.Item>

      <Form.Item name="isOn" label="是否启用" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item name="reportNodeGroupIds" label="分组">
        <Select
          mode="multiple"
          placeholder="请选择分组"
          options={groups.map((g) => ({
            label: g.name,
            value: g.id,
          }))}
        />
      </Form.Item>

      <Form.Item name="allowIPs" label="允许的终端IP" rules={[{ validator: validateIPs }]}>
        <MultiLineArrayTextArea placeholder="每行填写一个IP地址" />
      </Form.Item>
    </>
  );
};

interface NodeFormProps {
  nodeId: string;
  groups: ReportNodeGroup[];
  form?: FormInstance;
}

const NodeForm = ({ nodeId, groups, form: externalForm }: NodeFormProps) => {
  const [form] = Form.useForm(externalForm);
  const { data: nodeData } = useFetchData<FindEnabledReportNodeResponse>(nodeId ? `/api/monitor/node/${nodeId}` : "", "get");

  useEffect(() => {
    if (nodeData?.reportNode) {
      form.setFieldsValue({
        name: nodeData.reportNode.name,
        location: nodeData.reportNode.location,
        isp: nodeData.reportNode.isp,
        allowIPs: nodeData.reportNode.allowIPs,
        isOn: nodeData.reportNode.isOn,
        reportNodeGroupIds: nodeData.reportNode.reportNodeGroups.map((g: ReportNodeGroup) => g.id),
      });
    }
  }, [nodeData, form]);

  return (
    <Form form={form} layout="vertical">
      <NodeFormUI groups={groups} />
    </Form>
  );
};

interface NodeModalProps {
  nodeId?: string;
  groups: ReportNodeGroup[];
  onClose: () => void;
  onSuccess: () => void;
}

const NodeModal = ({ nodeId, groups, onClose, onSuccess }: NodeModalProps) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { data: nodeData } = useFetchData<FindEnabledReportNodeResponse>(nodeId ? `/api/monitor/node/${nodeId}` : "", "get");

  useEffect(() => {
    if (nodeData?.reportNode) {
      form.setFieldsValue({
        name: nodeData.reportNode.name,
        location: nodeData.reportNode.location,
        isp: nodeData.reportNode.isp,
        allowIPs: nodeData.reportNode.allowIPs,
        isOn: nodeData.reportNode.isOn,
        reportNodeGroupIds: nodeData.reportNode.reportNodeGroups.map((g: ReportNodeGroup) => g.id),
      });
    } else if (!nodeId && groups.length > 0) {
      form.setFieldsValue({
        isOn: true,
        reportNodeGroupIds: groups.map((g) => g.id),
      });
    }
  }, [nodeData, nodeId, form, groups]);

  const onFinish = async (values: {
    name: string;
    location: string;
    isp: string;
    allowIPs: string[];
    reportNodeGroupIds: string[];
    isOn: boolean;
  }) => {
    try {
      if (nodeId) {
        await request(`/api/monitor/node/${nodeId}`, {
          method: "PUT",
          data: {
            name: values.name,
            location: values.location,
            isp: values.isp,
            allowIPs: values.allowIPs || [],
            isOn: values.isOn,
            reportNodeGroupIds: values.reportNodeGroupIds || [],
          },
        });
      } else {
        await request("/api/monitor/node", {
          method: "POST",
          data: {
            name: values.name,
            location: values.location,
            isp: values.isp,
            allowIPs: values.allowIPs || [],
            isOn: values.isOn,
            reportNodeGroupIds: values.reportNodeGroupIds || [],
          },
        });
      }
      onClose();
      onSuccess();
    } catch (error) {
      console.error("操作失败:", error);
      message.error(formatErrorMessage(nodeId ? "更新监控终端失败" : "创建监控终端失败", error));
      setConfirmLoading(false);
    }
  };

  const handleOk = () => {
    setConfirmLoading(true);
    form.submit();
  };

  return (
    <Modal
      title={nodeId ? "编辑监控终端" : "创建监控终端"}
      open={true}
      onCancel={onClose}
      afterClose={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "40%",
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <NodeFormUI groups={groups} />
      </Form>
    </Modal>
  );
};

interface GroupModalProps {
  groupId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const GroupModal = ({ groupId, onClose, onSuccess }: GroupModalProps) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { data: groupData } = useFetchData<FindEnabledReportNodeGroupResponse>(groupId ? `/api/monitor/node-group/${groupId}` : "", "get");

  useEffect(() => {
    if (groupData?.reportNodeGroup) {
      form.setFieldsValue({
        name: groupData.reportNodeGroup.name,
      });
    }
  }, [groupData, form]);

  const handleOk = () => {
    setConfirmLoading(true);
    form.submit();
  };

  const onFinish = async (values: { name: string }) => {
    try {
      if (groupId) {
        await request(`/api/monitor/node-group/${groupId}`, {
          method: "PUT",
          data: values,
        });
      } else {
        await request("/api/monitor/node-group", {
          method: "POST",
          data: values,
        });
      }
      onClose();
      onSuccess();
    } catch (error) {
      console.error("操作失败:", error);
      message.error(formatErrorMessage(groupId ? "更新分组失败" : "创建分组失败", error));
      setConfirmLoading(false);
    }
  };

  return (
    <Modal
      title={groupId ? "编辑分组" : "创建分组"}
      open={true}
      onCancel={onClose}
      afterClose={onClose}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "40%",
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="分组名称" rules={[{ required: true, message: "请输入分组名称" }]}>
          <Input placeholder="请输入分组名称" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

function validateIPs(_: unknown, value: string[] | undefined) {
  if (!value || value.length === 0) {
    return Promise.resolve();
  }
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d+)?$/;
  for (const ip of value) {
    if (ip && !ipRegex.test(ip)) {
      return Promise.reject(new Error(`无效的IP地址: ${ip}`));
    }
  }
  return Promise.resolve();
}

function getStatusTag(node: ReportNode) {
  if (!node.isOn) {
    return <Tag color="default">禁用</Tag>;
  }

  const now = dayjs();
  const updatedAt = dayjs.unix(Number(node.status?.updatedAt || 0));
  const isRecentlyUpdated = now.diff(updatedAt, "minute") <= 5;

  if (node.isActive && isRecentlyUpdated) {
    return <Tag color="green">在线</Tag>;
  }

  return <Tag color="orange">离线</Tag>;
}

export const MonitorNodesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const query = useQuery<ListEnabledReportNodesResponse & { reportNodeGroups: ReportNodeGroup[] }>({
    queryKey: clusterQueryKeys.monitorNodes(effectiveSearchParams),
    queryFn: () => listMonitorNodes(effectiveSearchParams),
  });
  const { reportNodes, total, reportNodeGroups } = query.data ?? ({} as ListEnabledReportNodesResponse & { reportNodeGroups: ReportNodeGroup[] });
  const loading = query.isPending || query.isFetching;

  const [popupCreateNode, setPopupCreateNode] = useState(false);

  const onTableChange: TableProps<ReportNode>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newSearchParams = new URLSearchParams(searchParams);

    if (pagination.current) {
      newSearchParams.set("page", String(pagination.current));
    } else {
      newSearchParams.delete("page");
    }
    if (pagination.pageSize) {
      newSearchParams.set("size", String(pagination.pageSize));
    }

    if (s.order && s.columnKey) {
      newSearchParams.set("sortField", s.columnKey as string);
      newSearchParams.set("sortOrder", s.order);
    } else {
      newSearchParams.delete("sortField");
      newSearchParams.delete("sortOrder");
    }
    navigate(`?${newSearchParams.toString()}`);
  };

  const columns: ProColumns<ReportNode>[] = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: "名称",
      dataIndex: "name",
      render: (dom, node) => (
        <Space size="small" orientation="vertical">
          <a onClick={() => navigate(`/clusters/monitor/nodes/${node.id}`)}>{dom}</a>
          {node.reportNodeGroups.length > 0 && (
            <div>
              {node.reportNodeGroups.map((group: ReportNodeGroup) => (
                <Tag key={group.id}>{group.name}</Tag>
              ))}
            </div>
          )}
        </Space>
      ),
    },
    {
      title: "区域",
      dataIndex: "location",
      render: (dom, node) => dom || node.status?.location || "-",
      search: false,
    },
    {
      title: "网络提供商",
      dataIndex: "isp",
      render: (dom, node) => dom || node.status?.isp || "-",
      search: false,
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (_, node) => getStatusTag(node),
      width: 100,
      search: false,
    },
    {
      title: "最后更新",
      dataIndex: "status",
      render: (_, node) => {
        if (!node.status?.updatedAt) return "-";
        return dayjs.unix(Number(node.status.updatedAt)).format("YYYY-MM-DD HH:mm:ss");
      },
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      render: (_, node) => (
        <Space size="small">
          <TableActionIcon tooltip="详情" icon={<EyeOutlined />} onClick={() => navigate(`/clusters/monitor/nodes/${node.id}`)} />
          <Popconfirm title="确定删除吗？" onConfirm={() => onDelete(node.id)}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onDelete = async (nodeId: string) => {
    try {
      await request(`/api/monitor/node/${nodeId}`, { method: "DELETE" });
      void query.refetch();
    } catch (error) {
      console.error("删除失败:", error);
      message.error(formatErrorMessage("删除监控终端失败", error));
    }
  };

  return (
    <div>
      <ProTable<ReportNode>
        columns={columns}
        dataSource={reportNodes || []}
        loading={loading}
        rowKey="id"
        onChange={onTableChange}
        search={{
          labelWidth: "auto",
        }}
        options={{
          reload: () => {
            void query.refetch();
          },
        }}
        form={{
          initialValues: {
            name: params.keyword,
          },
        }}
        onSubmit={(values) => {
          const newSearchParams = new URLSearchParams({
            ...params,
            page: "1",
            size: String(params.size),
            keyword: values.name || "",
          });
          navigate(`?${newSearchParams.toString()}`);
        }}
        onReset={() => {
          const newSearchParams = new URLSearchParams({
            ...params,
            page: "1",
            size: String(params.size),
            keyword: "",
          });
          navigate(`?${newSearchParams.toString()}`);
        }}
        pagination={{
          total: Number(total || 0),
          current: Number(params.page),
          pageSize: Number(params.size),
        }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setPopupCreateNode(true)}>
            添加终端
          </Button>,
        ]}
      />

      {popupCreateNode && (
        <NodeModal
          groups={reportNodeGroups || []}
          onClose={() => setPopupCreateNode(false)}
          onSuccess={() => {
            setPopupCreateNode(false);
            void query.refetch();
          }}
        />
      )}
    </div>
  );
};

export const MonitorNodeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const nodeId = id || "0";
  const query = useQuery<{ reportNode: ReportNode; reportNodeGroups: ReportNodeGroup[] }>({
    queryKey: clusterQueryKeys.monitorNodeDetail(id),
    queryFn: () => getMonitorNodeDetail(id),
    enabled: Boolean(id),
  });
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const { reportNode: node, reportNodeGroups: groups } = query.data ?? ({} as { reportNode: ReportNode; reportNodeGroups: ReportNodeGroup[] });

  if (!node) {
    return null;
  }

  const onEditSubmit = async () => {
    try {
      setEditLoading(true);
      const values = await editForm.validateFields();
      await request(`/api/monitor/node/${nodeId}`, {
        method: "PUT",
        data: {
          name: values.name,
          location: values.location,
          isp: values.isp,
          allowIPs: values.allowIPs || [],
          isOn: values.isOn,
          reportNodeGroupIds: values.reportNodeGroupIds || [],
        },
      });
      await query.refetch();
    } catch (error) {
      console.error("保存失败:", error);
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setEditLoading(false);
    }
  };

  const items = [
    {
      key: "1",
      label: `${node.name} - 详情`,
      children: (
        <div>
          <Card title="基本信息" style={{ marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>名称</div>
                <div>{node.name}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>状态</div>
                <div>{getStatusTag(node)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>分组</div>
                <div>{node.reportNodeGroups.map((g: ReportNodeGroup) => g.name).join(", ") || "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>区域</div>
                <div>{node.location || node.status?.location || "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>网络提供商</div>
                <div>{node.isp || node.status?.isp || "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>版本号</div>
                <div>{node.status?.buildVersion || "-"}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "12px", color: "#666" }}>允许的终端IP</div>
                <div>{node.allowIPs.length > 0 ? node.allowIPs.map((ip: string, idx: number) => <Tag key={idx}>{ip}</Tag>) : <span>-</span>}</div>
              </div>
            </div>
          </Card>
          <Card title="安装信息">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>节点ID</div>
                <div style={{ wordBreak: "break-all" }}>{node.uniqueId}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#666" }}>节点Secret</div>
                <div style={{ wordBreak: "break-all", fontFamily: "monospace" }}>{node.secret}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "12px", color: "#666" }}>配置文件</div>
                <div>configs/api_reporter.yaml</div>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: "2",
      label: "监控结果",
      children: <MonitorResultsTab nodeId={nodeId} />,
    },
    {
      key: "3",
      label: "运行日志",
      children: <RunLogsTab nodeId={nodeId} />,
    },
    {
      key: "4",
      label: "修改",
      children: (
        <div>
          <NodeForm nodeId={nodeId} groups={groups} form={editForm} />
          <Form.Item style={{ marginTop: "16px" }}>
            <Button type="primary" onClick={onEditSubmit} loading={editLoading}>
              保存
            </Button>
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: getCurrentBreadcrumbPathname(),
        entityName: node?.name,
        fallbackEntityLabel: "终端",
      })}
      header={{ title: "终端详情" }}
      extra={[
        <Button key="back" onClick={() => navigate("/clusters/monitor")}>
          返回
        </Button>,
      ]}
    >
      <Tabs items={items} />
    </PageContainer>
  );
};

const MonitorResultsTab = ({ nodeId }: { nodeId: string }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultPageSize = useDefaultPageSize();
  const params = {
    page: searchParams.get("resultsPage") || "1",
    size: String(defaultPageSize),
    level: searchParams.get("resultsLevel") || "",
  };
  const offset = (Number(params.page) - 1) * Number(params.size);

  const { data, loading, refetch } = useFetchData<ListReportResultsResponse>(`/api/monitor/${nodeId}/report-results`, "get", {
    offset,
    size: params.size,
    level: params.level,
  });

  const onTableChange: TableProps<ReportResult>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newParams = new URLSearchParams(searchParams);

    if (pagination.current) {
      newParams.set("resultsPage", String(pagination.current));
    } else {
      newParams.delete("resultsPage");
    }

    // Note: ProTable might not pass pageSize back if it wasn't changed via size changer,
    // but here we are using a shared URL param for size or maybe specific one?
    // The previous code didn't seem to update size for results tab specifically, using global size.
    // Let's keep it simple and just update page.

    if (s.order && s.columnKey) {
      newParams.set("sortField", s.columnKey as string);
      newParams.set("sortOrder", s.order);
    }
    navigate(`?${newParams.toString()}`);
  };

  const columns: ProColumns<ReportResult>[] = [
    {
      title: "类型",
      dataIndex: "type",
      render: (_, entity) => (entity.type === "ipAddr" ? "IP地址" : entity.type),
      width: 100,
      search: false,
    },
    {
      title: "对象",
      dataIndex: "targetDesc",
      search: false,
    },
    {
      title: "级别",
      dataIndex: "level",
      valueType: "select",
      valueEnum: {
        error: { text: "错误", status: "Error" },
        warning: { text: "警告", status: "Warning" },
        info: { text: "信息", status: "Processing" },
        success: { text: "成功", status: "Success" },
      },
      render: (_, entity) => {
        const colors: { [key: string]: string } = {
          error: "red",
          warning: "orange",
          info: "blue",
          success: "green",
        };
        return <Tag color={colors[entity.level] || "default"}>{entity.level}</Tag>;
      },
    },
    {
      title: "耗时(ms)",
      dataIndex: "costMs",
      width: 100,
      search: false,
    },
    {
      title: "错误信息",
      dataIndex: "error",
      search: false,
    },
    {
      title: "检测时间",
      dataIndex: "updatedAt",
      render: (_, entity) => dayjs.unix(Number(entity.updatedAt)).format("YYYY-MM-DD HH:mm:ss"),
      search: false,
    },
  ];

  return (
    <div>
      <ProTable<ReportResult>
        columns={columns}
        dataSource={data?.reportResults || []}
        loading={loading}
        rowKey="id"
        onChange={onTableChange}
        search={{
          labelWidth: "auto",
        }}
        form={{
          initialValues: {
            level: params.level,
          },
        }}
        onSubmit={(values) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("resultsPage", "1");
          newParams.set("resultsLevel", values.level || "");
          navigate(`?${newParams.toString()}`);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("resultsPage", "1");
          newParams.set("resultsLevel", "");
          navigate(`?${newParams.toString()}`);
        }}
        pagination={{
          total: Number(data?.total || 0),
          current: Number(params.page),
          pageSize: Number(params.size),
        }}
        options={{
          reload: () => {
            void refetch();
          },
        }}
      />
    </div>
  );
};

const RunLogsTab = ({ nodeId }: { nodeId: string }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultPageSize = useDefaultPageSize();
  const params = {
    page: searchParams.get("logsPage") || "1",
    size: String(defaultPageSize),
    keyword: searchParams.get("keyword") || "",
    level: searchParams.get("logsLevel") || "",
  };
  const offset = (Number(params.page) - 1) * Number(params.size);

  const { data, loading, refetch } = useFetchData<ListNodeLogsResponse>(`/api/node-logs`, "get", {
    role: "report",
    targetId: nodeId,
    offset,
    size: params.size,
    keyword: params.keyword,
    level: params.level,
  });

  const onTableChange: TableProps<NodeLog>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newParams = new URLSearchParams(searchParams);

    if (pagination.current) {
      newParams.set("logsPage", String(pagination.current));
    } else {
      newParams.delete("logsPage");
    }

    if (s.order && s.columnKey) {
      newParams.set("sortField", s.columnKey as string);
      newParams.set("sortOrder", s.order);
    }
    navigate(`?${newParams.toString()}`);
  };

  const getLevelColor = (level: string) => {
    const colors: { [key: string]: string } = {
      错误: "#ff4d4f",
      警告: "#faad14",
      信息: "#1890ff",
      成功: "#52c41a",
    };
    return colors[level] || "inherit";
  };

  const columns: ProColumns<NodeLog>[] = [
    {
      title: "时间",
      dataIndex: "createdAt",
      render: (_, entity) => dayjs.unix(Number(entity.createdAt)).format("YYYY-MM-DD HH:mm:ss"),
      width: 180,
      search: false,
    },
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
    },
    {
      title: "级别",
      dataIndex: "level",
      valueType: "select",
      valueEnum: {
        错误: { text: "错误", status: "Error" },
        警告: { text: "警告", status: "Warning" },
        信息: { text: "信息", status: "Processing" },
        成功: { text: "成功", status: "Success" },
      },
      render: (_, record) => <span style={{ color: getLevelColor(record.level), fontWeight: "bold" }}>{record.level}</span>,
      width: 80,
    },
    {
      title: "内容",
      dataIndex: "description",
      render: (_, record) => <span style={{ color: getLevelColor(record.level) }}>{record.description}</span>,
      search: false,
    },
  ];

  return (
    <div>
      <ProTable<NodeLog>
        columns={columns}
        dataSource={data?.nodeLogs || []}
        loading={loading}
        rowKey="id"
        onChange={onTableChange}
        search={{
          labelWidth: "auto",
        }}
        form={{
          initialValues: {
            keyword: params.keyword,
            level: params.level,
          },
        }}
        onSubmit={(values) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("logsPage", "1");
          newParams.set("keyword", values.keyword || "");
          newParams.set("logsLevel", values.level || "");
          navigate(`?${newParams.toString()}`);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("logsPage", "1");
          newParams.set("keyword", "");
          newParams.set("logsLevel", "");
          navigate(`?${newParams.toString()}`);
        }}
        pagination={{
          total: Number(data?.total || 0),
          current: Number(params.page),
          pageSize: Number(params.size),
        }}
        options={{
          reload: () => {
            void refetch();
          },
        }}
      />
    </div>
  );
};

export const MonitorGroupsPage = () => {
  const query = useQuery<FindAllEnabledReportNodeGroupsResponse>({
    queryKey: clusterQueryKeys.monitorGroups(),
    queryFn: () => listMonitorGroups(),
  });
  const { reportNodeGroups } = query.data ?? { reportNodeGroups: [] };
  const loading = query.isPending || query.isFetching;

  const [popupEditGroupId, setPopupEditGroupId] = useState<string | undefined>();
  const [popupCreateGroup, setPopupCreateGroup] = useState(false);

  const refresh = () => {
    void query.refetch();
  };

  const columns: ProColumns<ReportNodeGroup>[] = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: "分组名称",
      dataIndex: "name",
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      render: (_, group) => (
        <Space size="small">
          <TableActionIcon tooltip="编辑" icon={<EditOutlined />} onClick={() => setPopupEditGroupId(group.id)} />
          <Popconfirm title="确定删除吗？" onConfirm={() => onDelete(group.id)}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onDelete = async (groupId: string) => {
    try {
      await request(`/api/monitor/node-group/${groupId}`, { method: "DELETE" });
      refresh();
    } catch (error) {
      console.error("删除失败:", error);
      message.error(formatErrorMessage("删除分组失败", error));
    }
  };

  return (
    <div>
      <ProTable<ReportNodeGroup>
        columns={columns}
        dataSource={reportNodeGroups || []}
        loading={loading}
        rowKey="id"
        options={{
          reload: () => {
            refresh();
          },
        }}
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setPopupCreateGroup(true)}>
            创建分组
          </Button>,
        ]}
      />

      {popupCreateGroup && (
        <GroupModal
          onClose={() => setPopupCreateGroup(false)}
          onSuccess={() => {
            setPopupCreateGroup(false);
            refresh();
          }}
        />
      )}

      {popupEditGroupId && (
        <GroupModal
          groupId={popupEditGroupId}
          onClose={() => setPopupEditGroupId(undefined)}
          onSuccess={() => {
            setPopupEditGroupId(undefined);
            refresh();
          }}
        />
      )}
    </div>
  );
};

export const MonitorSettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const query = useQuery<ReadReportNodeGlobalSettingResponse>({
    queryKey: clusterQueryKeys.monitorSettings(),
    queryFn: () => getMonitorSettings(),
  });
  const pageLoading = query.isPending && !query.data;
  const data = query.data;

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        minNotifyConnectivity: data.minNotifyConnectivity,
        notifyWebHookURL: data.notifyWebHookURL,
      });
    }
  }, [data, form]);

  const onFinish = async (values: { minNotifyConnectivity: number; notifyWebHookURL: string }) => {
    setLoading(true);
    try {
      await request("/api/monitor/node-setting", {
        method: "PUT",
        data: {
          minNotifyConnectivity: values.minNotifyConnectivity,
          notifyWebHookURL: values.notifyWebHookURL,
        },
      });
      message.success("设置保存成功");
    } catch (error) {
      console.error("保存失败:", error);
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="全局设置">
      <Spin spinning={pageLoading}>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: "400px" }}>
          <Form.Item name="minNotifyConnectivity" label="最小通知连通值" rules={[{ required: true, message: "请输入最小通知连通值" }]}>
            <InputNumber
              min={0}
              max={100}
              step={1}
              placeholder="取值0到100，当单个被监控对象连通性低于此值时（不包含此值）发送消息提醒。"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item name="notifyWebHookURL" label="通知WebHook地址" rules={[{ required: false, message: "请输入WebHook地址" }]}>
            <Input placeholder="https://example.com/webhook" type="url" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};
