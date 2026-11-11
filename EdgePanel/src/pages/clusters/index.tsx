import { Button, Popconfirm, Tag, Space, TableProps, message } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { formatErrorMessage } from "@/utils";
import dayjs from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, request, useNavigate, useSearchParams } from "@umijs/max";
import { EyeOutlined, SettingOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";

import type { ListEnabledNodeClustersResponse } from "@/pb/service_node_cluster_pb";
import type { NodeCluster } from "@/pb/models/model_node_cluster_pb";
import TableActionIcon from "@/components/TableActionIcon";
import { clusterQueryKeys } from "@/queries/keys";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";
import { listClusters } from "@/services/clusters";

function buildClusterNodesLink(clusterId: bigint, activeState?: string) {
  const searchParams = new URLSearchParams();
  if (activeState) {
    searchParams.set("activeState", activeState);
  }

  const query = searchParams.toString();
  return `/clusters/${clusterId}/nodes${query ? `?${query}` : ""}`;
}

function buildClusterServersLink(clusterId: bigint) {
  return `/servers?nodeClusterId=${clusterId}`;
}

export default function Clusters() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);

  const query = useQuery<ListEnabledNodeClustersResponse>({
    queryKey: clusterQueryKeys.list(effectiveSearchParams),
    queryFn: () => listClusters(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const page = Number(effectiveSearchParams.get("page")) || 1;
  const size = Number(effectiveSearchParams.get("size")) || defaultPageSize;
  const keyword = effectiveSearchParams.get("keyword") || "";

  const onTableChange: TableProps<NodeCluster>["onChange"] = (pagination, _filters, sorter) => {
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

  const onDelete = async (clusterId: bigint) => {
    try {
      await request(`/api/cluster/${clusterId}`, { method: "DELETE" });
      void queryClient.invalidateQueries({ queryKey: clusterQueryKeys.listBase() });
    } catch (error) {
      console.error("删除集群失败:", error);
      message.error(formatErrorMessage("删除集群失败", error));
    }
  };

  const columns: ProColumns<NodeCluster>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
    },
    {
      title: "ID",
      dataIndex: "id",
      fixed: "left",
      search: false,
      width: 80,
    },
    {
      title: "集群名称",
      dataIndex: "name",
      search: false,
      render: (_, cluster) => <Link to={`/clusters/${cluster.id ?? 0n}/dashboard`}>{cluster.name ?? "-"}</Link>,
    },
    {
      title: "节点数",
      dataIndex: "countAllNodes",
      search: false,
      render: (_, cluster) => <Link to={buildClusterNodesLink(cluster.id ?? 0n)}>{cluster.countAllNodes ?? 0}</Link>,
    },
    {
      title: "在线节点数",
      dataIndex: "countActiveNodes",
      search: false,
      render: (_, cluster) => <Link to={buildClusterNodesLink(cluster.id ?? 0n, "1")}>{cluster.countActiveNodes ?? 0}</Link>,
    },
    {
      title: "网站数",
      dataIndex: "countServers",
      search: false,
      render: (_, cluster) => <Link to={buildClusterServersLink(cluster.id ?? 0n)}>{cluster.countServers ?? 0}</Link>,
    },
    {
      title: "DNS域名",
      dataIndex: "dnsName",
      search: false,
      render: (_, cluster) =>
        cluster.dnsDomainName === "" ? `${cluster.dnsName ?? "-"}.主域名` : `${cluster.dnsName ?? "-"}.${cluster.dnsDomainName ?? "-"}`,
    },
    {
      title: "创建日期",
      dataIndex: "createdAt",
      search: false,
      render: (_, cluster) => dayjs.unix(Number((cluster.createdAt ?? 0).toString())).format("YYYY-MM-DD"),
    },
    {
      title: "状态",
      dataIndex: "isOn",
      search: false,
      render: (_, cluster) => (cluster.isOn ? <Tag color="green">有效中</Tag> : <Tag>未启用</Tag>),
    },
    {
      title: "操作",
      valueType: "option",
      fixed: "right",
      width: 130,
      render: (_, cluster) => (
        <Space size="small">
          <TableActionIcon tooltip="详情" icon={<EyeOutlined />} onClick={() => navigate(`/clusters/${cluster.id ?? 0n}/dashboard`)} />
          <TableActionIcon tooltip="设置" icon={<SettingOutlined />} onClick={() => navigate(`/clusters/${cluster.id ?? 0n}/settings`)} />
          <Popconfirm title="确定删除此集群吗？" onConfirm={() => onDelete(cluster.id ?? 0n)}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "集群管理" }}
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => navigate("/clusters/create")}>
          创建集群
        </Button>,
      ]}
    >
      <ProTable<NodeCluster>
        headerTitle="集群列表"
        columns={columns}
        dataSource={data?.nodeClusters}
        loading={loading}
        rowKey="id"
        onChange={onTableChange}
        scroll={{ x: "max-content" }}
        options={{
          reload: () => {
            void queryClient.invalidateQueries({ queryKey: clusterQueryKeys.listBase() });
          },
        }}
        search={{
          labelWidth: "auto",
        }}
        form={{
          initialValues: {
            keyword,
          },
        }}
        onSubmit={(values) => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("page", "1");
          newParams.set("keyword", values.keyword ?? "");
          setSearchParams(newParams);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("page", "1");
          newParams.set("keyword", "");
          setSearchParams(newParams);
        }}
        pagination={{
          current: page,
          pageSize: size,
          total: Number(data?.total),
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
    </PageContainer>
  );
}
