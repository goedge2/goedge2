import { Button, Popconfirm, Space, Tag, message, Typography, Modal, Form, Drawer, Progress } from "antd";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { ProColumns, ActionType } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Link, request, useLocation, useNavigate, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { listIPItems, listIPLists } from "@/services/servers";
import { useRef, useState } from "react";
import dayjs from "dayjs";
import type { IPList } from "@/pb/models/model_ip_list_pb";
import type { IPItem } from "@/pb/models/model_ip_item_pb";
import type { ListAllEnabledIPItemsResponse_Result, ListAllEnabledIPItemsResponse } from "@/pb/service_ip_item_pb";
import type { ListEnabledIPListsResponse } from "@/pb/service_ip_list_pb";
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import { FirewallEventLevels, formatErrorMessage } from "@/utils";
import IPItemForm from "@/components/form/IPItemForm";
import IPListForm from "@/components/form/IPListForm";
import TableActionIcon from "@/components/TableActionIcon";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

const { Text } = Typography;

const tabList = [
  { tab: "IP列表", key: "/servers/ip-lists" },
  { tab: "黑名单", key: "/servers/ip-lists/blacklist" },
  { tab: "白名单", key: "/servers/ip-lists/whitelist" },
];

export function AllIPItemTable() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const query = useQuery<ListAllEnabledIPItemsResponse>({
    queryKey: serverQueryKeys.ipItems(effectiveSearchParams),
    queryFn: () => listIPItems(effectiveSearchParams),
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListAllEnabledIPItemsResponse_Result | null>(null);
  const [form] = Form.useForm();

  const data = query.data;
  const loading = query.isPending || query.isFetching;

  // Pagination logic matches Servers.tsx
  const page = Number(effectiveSearchParams.get("page")) || 1;
  const size = Number(effectiveSearchParams.get("size")) || defaultPageSize;
  const keyword = effectiveSearchParams.get("keyword") || "";

  const onTableChange: TableProps<ListAllEnabledIPItemsResponse_Result>["onChange"] = (pagination) => {
    const newParams = new URLSearchParams(searchParams);

    if (pagination.current) {
      newParams.set("page", String(pagination.current));
    } else {
      newParams.delete("page");
    }
    if (pagination.pageSize) {
      newParams.set("size", String(pagination.pageSize));
    }

    setSearchParams(newParams);
  };

  const handleDeleteIPItems = async (ids: React.Key[]) => {
    try {
      await request("/api/ip-items/delete-batch", {
        method: "POST",
        data: {
          ipItemIds: ids.map((id) => String(id)),
        },
      });
      message.success("删除成功");
      void query.refetch();
      setSelectedRowKeys([]);
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("删除失败", e));
    }
  };

  const handleEditIPItem = (record: ListAllEnabledIPItemsResponse_Result) => {
    setEditingItem(record);
    setIsEditModalOpen(true);

    // Prepare initial values
    if (record.ipItem) {
      form.setFieldsValue({
        value: record.ipItem.value || record.ipItem.ipFrom || (record.ipItem.ipTo ? `${record.ipItem.ipFrom}-${record.ipItem.ipTo}` : ""),
        expiredAt: record.ipItem.expiredAt && Number(record.ipItem.expiredAt) > 0 ? dayjs.unix(Number(record.ipItem.expiredAt)) : null,
        eventLevel: record.ipItem.eventLevel,
        reason: record.ipItem.reason,
      });
    }
  };

  const handleUpdateIPItem = async () => {
    try {
      const values = await form.validateFields();
      if (!editingItem?.ipItem?.id) return;

      await request(`/api/ip-item/${editingItem.ipItem.id}`, {
        method: "PUT",
        data: {
          ipItemId: editingItem.ipItem.id,
          value: values.value,
          expiredAt: values.expiredAt ? values.expiredAt.unix() : 0,
          eventLevel: values.eventLevel,
          reason: values.reason,
        },
      });

      message.success("修改成功");
      setIsEditModalOpen(false);
      setEditingItem(null);
      void query.refetch();
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("修改失败", e));
    }
  };

  const columns: ProColumns<ListAllEnabledIPItemsResponse_Result>[] = [
    {
      title: "IP",
      dataIndex: ["ipItem", "value"],
      render: (_, result) => {
        const record = result.ipItem;
        if (!record) return "-";
        let ipText = record.value;
        if (!ipText) {
          if (record.ipTo) {
            ipText = `${record.ipFrom} - ${record.ipTo}`;
          } else {
            ipText = record.ipFrom;
          }
        }
        const ipList = result.ipList;
        const server = result.server;

        return (
          <Space orientation="vertical" size={0}>
            <Text copyable>{ipText}</Text>
            {(record.ipRegion || record.ipISP) && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.ipRegion} {record.ipISP ? `| ${record.ipISP}` : ""}
              </Text>
            )}
            <div style={{ fontSize: 12, color: "#999" }}>
              添加于: {dayjs.unix(Number(record.createdAt || 0)).format("YYYY-MM-DD HH:mm:ss")}
              {ipList && (
                <>
                  &nbsp;
                  <span style={{ color: "#aaa" }}>@</span>
                  &nbsp; [{ipList.type === "black" ? "黑名单" : "白名单"}: {ipList.name}]
                </>
              )}
              {server && (
                <>
                  &nbsp;
                  <Link to={`/servers/settings/${server.id}`}>[网站: {server.name}]</Link>
                </>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: "级别",
      dataIndex: ["ipItem", "eventLevel"],
      valueType: "select",
      valueEnum: {
        debug: { text: "Debug", status: "Default" },
        info: { text: "Info", status: "Processing" },
        notice: { text: "Notice", status: "Processing" },
        warning: { text: "Warning", status: "Warning" },
        warn: { text: "Warning", status: "Warning" },
        error: { text: "Error", status: "Error" },
        critical: { text: "Critical", status: "Error" },
        fatal: { text: "Fatal", status: "Error" },
      },
      render: (_, result) => {
        const levelCode = result.ipItem?.eventLevel || "";
        const level = FirewallEventLevels.find((l) => l.code === levelCode);

        let color = "default";
        switch (levelCode) {
          case "debug":
            color = "default";
            break;
          case "info":
          case "notice":
            color = "processing";
            break;
          case "warning":
          case "warn":
            color = "warning";
            break;
          case "error":
          case "critical":
          case "fatal":
            color = "error";
            break;
        }

        return <Tag color={color}>{level ? level.name : levelCode}</Tag>;
      },
      search: false,
    },
    {
      title: "过期时间",
      dataIndex: ["ipItem", "expiredAt"],
      render: (_, result) => {
        const record = result.ipItem;
        // Check for 0 (BigInt or number conversion)
        if (!record || !record.expiredAt || Number(record.expiredAt) === 0) return "不过期";

        const expiredAt = Number(record.expiredAt);
        const now = dayjs().unix();

        let relativeTime;
        if (expiredAt < now) {
          relativeTime = <span style={{ color: "red", fontSize: "12px" }}>已过期</span>;
        } else {
          const diff = expiredAt - now;
          const timeStr =
            diff < 60
              ? `${diff}秒`
              : diff < 3600
                ? `${Math.ceil(diff / 60)}分钟`
                : diff < 86400
                  ? `${Math.ceil(diff / 3600)}小时`
                  : `${Math.ceil(diff / 86400)}天`;
          relativeTime = <span style={{ color: "gray", fontSize: "12px" }}>{timeStr}后</span>;
        }

        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {dayjs.unix(expiredAt).format("YYYY-MM-DD HH:mm:ss")}
            {relativeTime}
          </div>
        );
      },
      search: false,
    },
    {
      title: "来源/备注",
      render: (_, result) => {
        const record = result.ipItem;
        if (!record) return "-";

        return (
          <Space orientation="vertical" size={0}>
            <span>{record.reason || "-"}</span>

            {/* Source Node */}
            {record.sourceNode && (
              <Link to={`/clusters/nodes/${record.sourceNode.id}/details`} style={{ fontSize: 12 }}>
                节点: {record.sourceNode.name}
              </Link>
            )}

            {/* Source Server */}
            {record.sourceServer && (
              <Link to={`/servers/settings/${record.sourceServer.id}`} style={{ fontSize: 12 }}>
                网站: {record.sourceServer.name}
              </Link>
            )}

            {/* Source WAF */}
            {record.sourceHTTPFirewallPolicy && (
              <Link to={`/servers/waf/policy/${record.sourceHTTPFirewallPolicy.id}`} style={{ fontSize: 12 }}>
                策略: {record.sourceHTTPFirewallPolicy.name}
                {record.sourceHTTPFirewallRuleGroup ? ` > ${record.sourceHTTPFirewallRuleGroup.name}` : ""}
                {record.sourceHTTPFirewallRuleSet ? ` > ${record.sourceHTTPFirewallRuleSet.name}` : ""}
              </Link>
            )}
          </Space>
        );
      },
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      render: (_, result) => [
        <TableActionIcon key="edit" tooltip="编辑" icon={<EditOutlined />} onClick={() => handleEditIPItem(result)} />,
        <Popconfirm key="delete" title="确定要删除吗?" onConfirm={() => result.ipItem && handleDeleteIPItems([String(result.ipItem.id)])}>
          <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList,
      })}
      header={{ title: "IP名单" }}
      tabList={tabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => {
        navigate(key);
      }}
    >
      <ProTable
        rowKey={(record) => String(record.ipItem?.id)}
        columns={columns}
        dataSource={data?.results || []}
        loading={loading}
        onChange={onTableChange}
        options={{
          reload: () => {
            void query.refetch();
          },
          density: true,
          setting: true,
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
        }}
        form={{
          initialValues: {
            keyword: keyword,
          },
        }}
        onSubmit={(formParams) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("keyword", formParams.keyword || "");
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
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: size,
          current: page,
          total: Number(data?.total || 0),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertRender={false}
        toolBarRender={() => [
          selectedRowKeys.length > 0 && (
            <Space key="batch-actions" wrap>
              <span style={{ marginRight: 8 }}>已选择 {selectedRowKeys.length} 项</span>
              <Popconfirm
                key="batch-delete"
                title={`确定删除选中的 ${selectedRowKeys.length} 个IP吗？`}
                onConfirm={() => handleDeleteIPItems(selectedRowKeys)}
              >
                <Button type="link" danger style={{ padding: "4px 8px" }}>
                  批量删除
                </Button>
              </Popconfirm>
              <Button type="link" onClick={() => setSelectedRowKeys([])} style={{ padding: "4px 8px" }}>
                取消
              </Button>
            </Space>
          ),
        ]}
      />
      <Modal title="修改IP" open={isEditModalOpen} onOk={handleUpdateIPItem} onCancel={() => setIsEditModalOpen(false)} destroyOnHidden>
        <IPItemForm form={form} />
      </Modal>
    </PageContainer>
  );
}

// New IPItemTable component for displaying IPs within a list
export function IPItemTable({ listId }: { listId: number }) {
  const actionRef = useRef<ActionType>(null);
  const defaultPageSize = useDefaultPageSize();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IPItem | null>(null);
  const [form] = Form.useForm();

  // Progress states
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleDeleteIPItems = async (ids: React.Key[]) => {
    try {
      await request("/api/ip-items/delete-batch", {
        method: "POST",
        data: {
          ipItemIds: ids.map((id) => String(id)),
        },
      });
      message.success("删除成功");
      actionRef.current?.reload();
      setSelectedRowKeys([]);
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("删除失败", e));
    }
  };

  const handleCreateIPItem = async () => {
    try {
      const values = await form.validateFields();

      const rawValue = values.value || "";
      const ips = rawValue
        .split(/[\n,;]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s);

      if (ips.length === 0) {
        message.warning("请输入IP");
        return;
      }

      setProcessing(true);
      setProgress({ current: 0, total: ips.length });

      let successCount = 0;
      for (let i = 0; i < ips.length; i++) {
        const ip = ips[i];
        try {
          await request("/api/ip-item", {
            method: "POST",
            data: {
              ipListId: listId,
              value: ip,
              expiredAt: values.expiredAt ? values.expiredAt.unix() : 0,
              eventLevel: values.eventLevel,
              reason: values.reason,
            },
          });
          successCount++;
        } catch (e) {
          console.error(`Failed to add ${ip}`, e);
        }
        setProgress({ current: i + 1, total: ips.length });
      }

      message.success(`成功添加 ${successCount} 个IP`);
      setIsCreateModalOpen(false);
      form.resetFields();
      setProcessing(false);
      actionRef.current?.reload();
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("添加失败", e));
      setProcessing(false);
    }
  };

  const handleEditIPItem = (record: IPItem) => {
    setEditingItem(record);
    setIsEditModalOpen(true);
    form.setFieldsValue({
      value: record.value || record.ipFrom || (record.ipTo ? `${record.ipFrom}-${record.ipTo}` : ""),
      expiredAt: record.expiredAt && Number(record.expiredAt) > 0 ? dayjs.unix(Number(record.expiredAt)) : null,
      eventLevel: record.eventLevel,
      reason: record.reason,
    });
  };

  const handleUpdateIPItem = async () => {
    try {
      const values = await form.validateFields();
      if (!editingItem?.id) return;

      await request(`/api/ip-item/${editingItem.id}`, {
        method: "PUT",
        data: {
          ipItemId: editingItem.id,
          value: values.value,
          expiredAt: values.expiredAt ? values.expiredAt.unix() : 0,
          eventLevel: values.eventLevel,
          reason: values.reason,
        },
      });

      message.success("修改成功");
      setIsEditModalOpen(false);
      setEditingItem(null);
      actionRef.current?.reload();
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("修改失败", e));
    }
  };

  const columns: ProColumns<IPItem>[] = [
    {
      title: "IP",
      dataIndex: "value",
      render: (_, record) => {
        let ipText = record.value;
        if (!ipText) {
          if (record.ipTo) {
            ipText = `${record.ipFrom} - ${record.ipTo}`;
          } else {
            ipText = record.ipFrom;
          }
        }
        return (
          <Space orientation="vertical" size={0}>
            <Text copyable>{ipText}</Text>
            {(record.ipRegion || record.ipISP) && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.ipRegion} {record.ipISP ? `| ${record.ipISP}` : ""}
              </Text>
            )}
            <div style={{ fontSize: 12, color: "#999" }}>添加于: {dayjs.unix(Number(record.createdAt || 0)).format("YYYY-MM-DD HH:mm:ss")}</div>
          </Space>
        );
      },
    },
    {
      title: "级别",
      dataIndex: "eventLevel",
      valueType: "select",
      valueEnum: {
        debug: { text: "Debug", status: "Default" },
        info: { text: "Info", status: "Processing" },
        notice: { text: "Notice", status: "Processing" },
        warning: { text: "Warning", status: "Warning" },
        warn: { text: "Warning", status: "Warning" },
        error: { text: "Error", status: "Error" },
        critical: { text: "Critical", status: "Error" },
        fatal: { text: "Fatal", status: "Error" },
      },
      render: (_, record) => {
        const levelCode = record.eventLevel || "";
        const level = FirewallEventLevels.find((l) => l.code === levelCode);

        let color = "default";
        switch (levelCode) {
          case "debug":
            color = "default";
            break;
          case "info":
          case "notice":
            color = "processing";
            break;
          case "warning":
          case "warn":
            color = "warning";
            break;
          case "error":
          case "critical":
          case "fatal":
            color = "error";
            break;
        }

        return <Tag color={color}>{level ? level.name : levelCode}</Tag>;
      },
      search: false,
    },
    {
      title: "过期时间",
      dataIndex: "expiredAt",
      render: (_, record) => {
        if (!record.expiredAt || Number(record.expiredAt) === 0) return "不过期";

        const expiredAt = Number(record.expiredAt);
        const now = dayjs().unix();

        let relativeTime;
        if (expiredAt < now) {
          relativeTime = <span style={{ color: "red", fontSize: "12px" }}>已过期</span>;
        } else {
          const diff = expiredAt - now;
          const timeStr =
            diff < 60
              ? `${diff}秒`
              : diff < 3600
                ? `${Math.ceil(diff / 60)}分钟`
                : diff < 86400
                  ? `${Math.ceil(diff / 3600)}小时`
                  : `${Math.ceil(diff / 86400)}天`;
          relativeTime = <span style={{ color: "gray", fontSize: "12px" }}>{timeStr}后</span>;
        }

        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {dayjs.unix(expiredAt).format("YYYY-MM-DD HH:mm:ss")}
            {relativeTime}
          </div>
        );
      },
      search: false,
    },
    {
      title: "来源/备注",
      dataIndex: "reason",
      render: (_, record) => {
        return (
          <Space orientation="vertical" size={0}>
            <span>{record.reason || "-"}</span>

            {record.sourceNode && (
              <Link to={`/clusters/nodes/${record.sourceNode.id}/details`} style={{ fontSize: 12 }}>
                节点: {record.sourceNode.name}
              </Link>
            )}

            {record.sourceServer && (
              <Link to={`/servers/settings/${record.sourceServer.id}`} style={{ fontSize: 12 }}>
                网站: {record.sourceServer.name}
              </Link>
            )}

            {record.sourceHTTPFirewallPolicy && (
              <Link to={`/servers/waf/policy/${record.sourceHTTPFirewallPolicy.id}`} style={{ fontSize: 12 }}>
                策略: {record.sourceHTTPFirewallPolicy.name}
                {record.sourceHTTPFirewallRuleGroup ? ` > ${record.sourceHTTPFirewallRuleGroup.name}` : ""}
                {record.sourceHTTPFirewallRuleSet ? ` > ${record.sourceHTTPFirewallRuleSet.name}` : ""}
              </Link>
            )}
          </Space>
        );
      },
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      render: (_, record) => [
        <TableActionIcon key="edit" tooltip="编辑" icon={<EditOutlined />} onClick={() => handleEditIPItem(record)} />,
        <Popconfirm key="delete" title="确定要删除吗?" onConfirm={() => handleDeleteIPItems([String(record.id)])}>
          <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<IPItem>
        actionRef={actionRef}
        rowKey={(record) => String(record.id)}
        columns={columns}
        request={async (params) => {
          const { current, pageSize, keyword } = params;
          const res = await request<{ ipItems?: IPItem[]; total?: number }>(`/api/ip-list/${listId}/ip-items`, {
            params: {
              offset: ((current || 1) - 1) * (pageSize || defaultPageSize),
              size: pageSize || defaultPageSize,
              keyword: keyword,
            },
          });
          return {
            data: res.ipItems || [],
            success: true,
            total: res.total,
          };
        }}
        search={false}
        options={{
          search: selectedRowKeys.length === 0,
        }}
        toolBarRender={() => {
          if (selectedRowKeys.length > 0) {
            return [
              <Space key="batch-actions" wrap style={{ marginRight: 16 }}>
                <span>已选择 {selectedRowKeys.length} 项</span>
                <Popconfirm
                  key="batch-delete"
                  title={`确定删除选中的 ${selectedRowKeys.length} 个IP吗？`}
                  onConfirm={() => handleDeleteIPItems(selectedRowKeys)}
                >
                  <Button type="link" danger>
                    批量删除
                  </Button>
                </Popconfirm>
                <Button type="link" onClick={() => setSelectedRowKeys([])}>
                  取消
                </Button>
              </Space>,
            ];
          }
          return [
            <Button key="import" icon={<UploadOutlined />}>
              导入
            </Button>,
            <Button key="export" icon={<DownloadOutlined />}>
              导出
            </Button>,
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsCreateModalOpen(true);
                form.resetFields();
              }}
            >
              添加IP
            </Button>,
          ];
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        tableAlertRender={false}
      />
      <Modal
        title="添加IP"
        open={isCreateModalOpen}
        onOk={handleCreateIPItem}
        onCancel={() => {
          if (!processing) {
            setIsCreateModalOpen(false);
          }
        }}
        destroyOnHidden
        confirmLoading={processing}
        footer={(originNode) => {
          if (processing) {
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Progress percent={Math.round((progress.current / progress.total) * 100)} size="small" />
                <span style={{ whiteSpace: "nowrap" }}>
                  {progress.current} / {progress.total}
                </span>
              </div>
            );
          }
          return originNode;
        }}
      >
        <IPItemForm form={form} />
      </Modal>
      <Modal title="修改IP" open={isEditModalOpen} onOk={handleUpdateIPItem} onCancel={() => setIsEditModalOpen(false)} destroyOnHidden>
        <IPItemForm form={form} isEdit={true} />
      </Modal>
    </>
  );
}

export function IPListTable() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectionListType, setSelectionListType] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<IPList | null>(null);
  const [form] = Form.useForm();

  const [openListId, setOpenListId] = useState<number | null>(null);
  const query = useQuery<ListEnabledIPListsResponse>({
    queryKey: serverQueryKeys.ipLists(location.pathname, effectiveSearchParams),
    queryFn: () => listIPLists(location.pathname, effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  // Pagination logic
  const page = Number(effectiveSearchParams.get("page")) || 1;
  const size = Number(effectiveSearchParams.get("size")) || defaultPageSize;
  const keyword = effectiveSearchParams.get("keyword") || "";

  const isBlacklistTab = location.pathname.includes("/blacklist");
  const isWhitelistTab = location.pathname.includes("/whitelist");
  const listType = isBlacklistTab ? "black" : isWhitelistTab ? "white" : "";
  const currentSelectedRowKeys = selectionListType === listType ? selectedRowKeys : [];

  const onTableChange: TableProps<IPList>["onChange"] = (pagination) => {
    const newParams = new URLSearchParams(searchParams);

    if (pagination.current) {
      newParams.set("page", String(pagination.current));
    } else {
      newParams.delete("page");
    }
    if (pagination.pageSize) {
      newParams.set("size", String(pagination.pageSize));
    }

    setSearchParams(newParams);
  };

  const handleDeleteIPList = async (id: string | number) => {
    try {
      await request(`/api/ip-list/${id}`, { method: "DELETE" });
      message.success("删除成功");
      void query.refetch();
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("删除失败", e));
    }
  };

  const handleDeleteIPLists = async (ids: React.Key[]) => {
    try {
      for (const id of ids) {
        await request(`/api/ip-list/${id}`, { method: "DELETE" });
      }
      message.success("删除成功");
      void query.refetch();
      setSelectedRowKeys([]);
      setSelectionListType(listType);
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("部分或全部删除失败", e));
    }
  };

  const handleCreateIPList = () => {
    setEditingList(null);
    form.resetFields();
    form.setFieldsValue({
      type: listType || "black", // Default based on tab
      isGlobal: false,
    });
    setIsModalOpen(true);
  };

  const handleEditIPList = (record: IPList) => {
    setEditingList(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      type: record.type,
      isGlobal: record.isGlobal,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleSubmitIPList = async () => {
    try {
      const values = await form.validateFields();

      if (editingList) {
        // Update
        await request(`/api/ip-list/${editingList.id}`, {
          method: "PUT",
          data: {
            ipListId: editingList.id,
            name: values.name,
            code: values.code,
            description: values.description,
          },
        });
        message.success("修改成功");
      } else {
        // Create
        await request("/api/ip-list", {
          method: "POST",
          data: {
            name: values.name,
            code: values.code,
            type: values.type,
            isGlobal: values.isGlobal,
            description: values.description,
            isPublic: true,
          },
        });
        message.success("创建成功");
      }

      setIsModalOpen(false);
      setEditingList(null);
      void query.refetch();
    } catch (e) {
      console.error(e);
      message.error(formatErrorMessage("操作失败", e));
    }
  };

  const columns: ProColumns<IPList>[] = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: "名称",
      dataIndex: "name",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Button type="link" style={{ padding: 0, height: "auto" }} onClick={() => setOpenListId(Number(record.id))}>
            {record.name}
          </Button>
          {record.isGlobal && <Tag color="blue">全局</Tag>}
        </Space>
      ),
    },
    {
      title: "代号",
      dataIndex: "code",
      search: false,
    },
    {
      title: "描述",
      dataIndex: "description",
      search: false,
    },
    {
      title: "IP数量",
      dataIndex: "countIPItems",
      render: (_, record) => <span>{record.countIPItems ? Number(record.countIPItems).toLocaleString() : "0"}</span>,
      align: "right",
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      render: (_, record) => [
        <TableActionIcon key="edit" tooltip="编辑" icon={<EditOutlined />} onClick={() => handleEditIPList(record)} />,
        <Popconfirm key="delete" title="确定要删除吗?" onConfirm={() => handleDeleteIPList(String(record.id))}>
          <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList,
      })}
      header={{
        title: "IP名单",
        extra: [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreateIPList}>
            创建名单
          </Button>,
        ],
      }}
      tabList={tabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => {
        navigate(key);
      }}
    >
      <ProTable<IPList>
        rowKey="id"
        columns={columns}
        dataSource={data?.ipLists || []}
        loading={loading}
        onChange={onTableChange}
        options={{
          reload: () => {
            void query.refetch();
          },
          density: true,
          setting: true,
        }}
        search={{
          labelWidth: "auto",
          defaultCollapsed: false,
        }}
        form={{
          initialValues: {
            keyword: keyword,
          },
        }}
        onSubmit={(formParams) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("keyword", formParams.keyword || "");
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
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: size,
          current: page,
          total: Number(data?.total || 0),
        }}
        rowSelection={{
          selectedRowKeys: currentSelectedRowKeys,
          onChange: (keys) => {
            setSelectionListType(listType);
            setSelectedRowKeys(keys);
          },
        }}
        tableAlertRender={false}
        toolBarRender={() => [
          currentSelectedRowKeys.length > 0 && (
            <Space key="batch-actions" wrap>
              <span style={{ marginRight: 8 }}>已选择 {currentSelectedRowKeys.length} 项</span>
              <Popconfirm
                key="batch-delete"
                title={`确定删除选中的 ${currentSelectedRowKeys.length} 个名单吗？`}
                onConfirm={() => handleDeleteIPLists(currentSelectedRowKeys)}
              >
                <Button type="link" danger style={{ padding: "4px 8px" }}>
                  批量删除
                </Button>
              </Popconfirm>
              <Button
                type="link"
                onClick={() => {
                  setSelectedRowKeys([]);
                  setSelectionListType(listType);
                }}
                style={{ padding: "4px 8px" }}
              >
                取消
              </Button>
            </Space>
          ),
        ]}
      />
      <Modal
        title={editingList ? "修改名单" : "创建名单"}
        open={isModalOpen}
        onOk={handleSubmitIPList}
        onCancel={() => setIsModalOpen(false)}
        destroyOnHidden
      >
        <IPListForm form={form} isEdit={!!editingList} />
      </Modal>
      <Drawer title="IP列表" open={!!openListId} onClose={() => setOpenListId(null)} size={1000} destroyOnHidden>
        {openListId && <IPItemTable listId={openListId} />}
      </Drawer>
    </PageContainer>
  );
}
