import { useState } from "react";
import { Button, Modal, Popconfirm, Space, Tag, message, TableProps } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { EyeOutlined, DeleteOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { request, useNavigate, useSearchParams } from "@umijs/max";
import { clusterQueryKeys } from "@/queries/keys";
import { listNodes } from "@/services/clusters";
import { ClusterSelector } from "@/components/ClusterSelector";
import type { ListEnabledNodesMatchResponse } from "@/pb/service_node_pb";
import type { Node } from "@/pb/models/model_node_pb";
import { formatBytesSimple, formatErrorMessage } from "@/utils";
import NodeStatusTag from "@/components/NodeStatusTag";
import NodeName from "@/components/NodeName";
import TableActionIcon from "@/components/TableActionIcon";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";
import { NodeDNSSettingsPanel } from "./_shared/NodeDNSSettingsPanel";

type FilterFormValues = {
  keyword?: string;
  nodeClusterId?: string;
  activeState?: string;
  installState?: string;
};

type SortField = "cpu" | "memory" | "trafficOut" | "load" | "connections";
type SortOrder = "ascend" | "descend" | null;

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
  nodeClusterId: undefined as string | undefined,
  activeState: 0,
  installState: 0,
  sortField: undefined as SortField | undefined,
  sortOrder: undefined as SortOrder | undefined,
};

export default function Nodes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const [messageApi, contextHolder] = message.useMessage();
  const [editingDNSNode, setEditingDNSNode] = useState<Node | undefined>();
  const query = useQuery<ListEnabledNodesMatchResponse>({
    queryKey: clusterQueryKeys.nodes(effectiveSearchParams),
    queryFn: () => listNodes(effectiveSearchParams),
  });

  const params = {
    ...defaultPageParams,
    ...Object.fromEntries(effectiveSearchParams.entries()),
    page: Number(effectiveSearchParams.get("page")) || 1,
    size: Number(effectiveSearchParams.get("size")) || defaultPageSize,
    activeState: Number(effectiveSearchParams.get("activeState")) || 0,
    installState: Number(effectiveSearchParams.get("installState")) || 0,
    nodeClusterId: effectiveSearchParams.get("nodeClusterId") || undefined,
    sortField: (effectiveSearchParams.get("sortField") as SortField) || undefined,
    sortOrder: (effectiveSearchParams.get("sortOrder") as SortOrder) || undefined,
  };

  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const onTableChange: TableProps<Node>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const search = new URLSearchParams(searchParams);

    if (pagination.current) {
      search.set("page", String(pagination.current));
    } else {
      search.delete("page");
    }
    if (pagination.pageSize) {
      search.set("size", String(pagination.pageSize));
    }

    if (s.order && s.columnKey) {
      search.set("sortField", s.columnKey as string);
      search.set("sortOrder", s.order);
    } else {
      search.delete("sortField");
      search.delete("sortOrder");
    }

    const qs = search.toString();
    navigate(qs ? `?${qs}` : "");
  };

  const onDelete = async (nodeId: bigint) => {
    try {
      await request(`/api/node/${nodeId}`, { method: "DELETE" });
      messageApi.success("删除成功");
      void query.refetch();
    } catch (e) {
      console.error(e);
      messageApi.error(formatErrorMessage("删除失败", e));
    }
  };

  const getSortOrder = (field: SortField): SortOrder => {
    return params.sortField === field ? (params.sortOrder ?? null) : null;
  };

  const columns: ProColumns<Node>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      fieldProps: { placeholder: "关键词搜索" },
    },
    {
      title: "集群",
      dataIndex: "nodeClusterId",
      hideInTable: true,
      formItemRender: () => <ClusterSelector />,
    },
    {
      title: "安装状态",
      dataIndex: "installState",
      hideInTable: true,
      valueType: "select",
      valueEnum: {
        0: "全部安装状态",
        1: "已安装",
        2: "未安装",
      },
      fieldProps: {
        style: { width: 120 },
      },
    },
    {
      title: "ID",
      dataIndex: "id",
      fixed: "left",
      width: 80,
      search: false,
    },
    {
      title: "节点名称",
      dataIndex: "name",
      search: false,
      render: (_, record) => <NodeName node={record} />,
    },
    {
      title: "IP地址",
      dataIndex: "ipAddresses",
      search: false,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          {record.ipAddresses?.map((ip, index) => (
            <div key={index} style={{ fontSize: 12 }}>
              {ip.ip ?? "-"}
            </div>
          ))}
          {(!record.ipAddresses || record.ipAddresses.length === 0) && "-"}
        </Space>
      ),
    },
    {
      title: "DNS线路",
      dataIndex: "dnsRoutes",
      width: 180,
      search: false,
      render: (_, record) => {
        const routes = record.dnsRoutes ?? [];
        const primaryClusterId = String(record.nodeCluster?.id ?? 0n);
        return (
          <Space direction="vertical" size={4}>
            {routes.length > 0 ? (
              <Space size={[4, 4]} wrap>
                {routes.map((route, index) => (
                  <Tag key={`${route.code ?? route.name ?? index}`} color="default">
                    {route.name ?? route.code ?? "-"}
                  </Tag>
                ))}
              </Space>
            ) : (
              <span>-</span>
            )}
            {primaryClusterId !== "0" ? (
              <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => setEditingDNSNode(record)}>
                {routes.length > 0 ? "修改" : "设置"}
              </Button>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "CPU",
      key: "cpu",
      width: 80,
      sorter: true,
      sortOrder: getSortOrder("cpu"),
      search: false,
      render: (_, record) => (record.isActive ? `${record.status?.cpuUsage?.toFixed(1) ?? "-"}%` : "-"),
    },
    {
      title: "内存",
      key: "memory",
      width: 80,
      sorter: true,
      sortOrder: getSortOrder("memory"),
      search: false,
      render: (_, record) => (record.isActive ? `${record.status?.memoryUsage?.toFixed(1) ?? "-"}%` : "-"),
    },
    {
      title: "下行带宽",
      key: "trafficOut",
      width: 110,
      sorter: true,
      sortOrder: getSortOrder("trafficOut"),
      search: false,
      render: (_, record) =>
        record.isActive && record.status?.trafficOutBytes !== undefined ? `${formatBytesSimple(record.status.trafficOutBytes)}/s` : "-",
    },
    {
      title: "连接数",
      key: "connections",
      width: 90,
      sorter: true,
      sortOrder: getSortOrder("connections"),
      search: false,
      render: (_, record) => (record.isActive ? (record.status?.connectionCount ?? "-") : "-"),
    },
    {
      title: "负载",
      key: "load",
      width: 80,
      sorter: true,
      sortOrder: getSortOrder("load"),
      search: false,
      render: (_, record) => (record.isActive ? (record.status?.load1m?.toFixed(2) ?? "-") : "-"),
    },
    {
      title: "状态",
      dataIndex: "activeState",
      hideInTable: false,
      valueType: "select",
      valueEnum: {
        0: "全部在线状态",
        1: "在线",
        2: "离线",
      },
      fieldProps: {
        style: { width: 120 },
      },
      render: (_, record) => <NodeStatusTag node={record} onUpdate={() => void query.refetch()} />,
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 130,
      search: false,
      render: (_, record) => (
        <Space size="small">
          <TableActionIcon tooltip="详情" icon={<EyeOutlined />} onClick={() => navigate(`/clusters/nodes/${record.id}/details`)} />
          <TableActionIcon tooltip="设置" icon={<SettingOutlined />} onClick={() => navigate(`/clusters/nodes/${record.id}/settings`)} />
          <Popconfirm
            title="确定删除此节点吗？"
            description="删除后无法恢复"
            onConfirm={() => onDelete(record.id ?? 0n)}
            okText="确定"
            cancelText="取消"
          >
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "节点管理" }}
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => navigate("/clusters/node/create")}>
          创建节点
        </Button>,
      ]}
    >
      {contextHolder}
      {editingDNSNode ? (
        <Modal title="修改节点DNS设置" open footer={null} width={720} destroyOnHidden onCancel={() => setEditingDNSNode(undefined)}>
          <NodeDNSSettingsPanel
            nodeId={String(editingDNSNode.id ?? 0n)}
            nodeClusterId={String(editingDNSNode.nodeCluster?.id ?? 0n)}
            onSaved={() => {
              setEditingDNSNode(undefined);
              void query.refetch();
            }}
          />
        </Modal>
      ) : null}
      <ProTable<Node>
        columns={columns}
        dataSource={data?.nodes}
        loading={loading}
        rowKey={(record) => String(record.id ?? 0n)}
        scroll={{ x: "max-content" }}
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
          initialValues: {
            keyword: params.keyword,
            nodeClusterId: params.nodeClusterId,
            activeState: String(params.activeState),
            installState: String(params.installState),
          },
        }}
        onSubmit={(values: FilterFormValues) => {
          const search = new URLSearchParams();
          if (values.keyword) search.set("keyword", values.keyword);
          if (values.nodeClusterId) search.set("nodeClusterId", values.nodeClusterId);

          if (values.activeState && values.activeState !== "0") {
            search.set("activeState", String(values.activeState));
          }
          if (values.installState && values.installState !== "0") {
            search.set("installState", String(values.installState));
          }

          search.set("page", "1");
          search.set("size", String(params.size));
          if (params.sortField && params.sortOrder) {
            search.set("sortField", params.sortField);
            search.set("sortOrder", params.sortOrder);
          }
          navigate(`?${search.toString()}`);
        }}
        onReset={() => {
          const search = new URLSearchParams();
          search.set("size", String(params.size));
          navigate(`?${search.toString()}`);
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: params.size,
          defaultCurrent: 1,
          current: params.page,
          total: Number(data?.total || 0),
        }}
      />
    </PageContainer>
  );
}
