import { Button, Popconfirm, Space, Spin, TableProps, Tag, Tooltip, message } from "antd";
import { PageContainer, ProTable } from "@ant-design/pro-components";
import { ProColumns, ProFormInstance } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, request, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { listServers } from "@/services/servers";
import type { Server } from "@/pb/models/model_server_pb";
import type { ListEnabledServersMatchResponse } from "@/pb/service_server_pb";
import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, SettingOutlined } from "@ant-design/icons";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { ClusterSelector } from "@/components/ClusterSelector";
import { ServerGroupSelector } from "@/components/ServerGroupSelector";
import { formatBytesSimple, formatErrorMessage, getErrorMessage } from "@/utils";
import TableActionIcon from "@/components/TableActionIcon";
import { DomainPreviewCell } from "./_components/DomainPreviewCell";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

type SortField = "trafficOut" | "requests";
type SortOrder = "ascend" | "descend" | null;

function getListenPorts(server: Server) {
  const ports = [];
  if (server.http != null && server.http.isOn) {
    for (const listen of server.http.listen) {
      ports.push({
        protocol: listen.protocol,
        port: listen.portRange,
      });
    }
  }

  if (server.https != null && server.https.isOn) {
    for (const listen of server.https.listen) {
      ports.push({
        protocol: listen.protocol,
        port: listen.portRange,
      });
    }
  }

  if (server.tcp != null && server.tcp.isOn) {
    for (const listen of server.tcp.listen) {
      ports.push({
        protocol: listen.protocol,
        port: listen.portRange,
      });
    }
  }

  if (server.tls != null && server.tls.isOn) {
    for (const listen of server.tls.listen) {
      ports.push({
        protocol: listen.protocol,
        port: listen.portRange,
      });
    }
  }

  if (server.udp != null && server.udp.isOn) {
    for (const listen of server.udp.listen) {
      ports.push({
        protocol: listen.protocol,
        port: listen.portRange,
      });
    }
  }

  return ports;
}

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
  sortField: undefined as SortField | undefined,
  sortOrder: undefined as SortOrder | undefined,
};

type ServerSearchFormValues = {
  keyword?: string;
  nodeClusterId?: string;
  serverGroupId?: string;
};

const CNAMECell = ({ cname }: { cname?: string }) => {
  const [hovered, setHovered] = useState(false);

  const copyCNAME = async () => {
    if (!cname) {
      return;
    }

    try {
      await navigator.clipboard.writeText(cname);
      message.success("CNAME已复制到剪贴板");
    } catch (error) {
      message.error(formatErrorMessage("复制CNAME失败", error));
    }
  };

  if (!cname) {
    return "-";
  }

  return (
    <Space size={0} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span>{cname}</span>
      <Tooltip title="复制CNAME">
        <Button
          icon={<CopyOutlined />}
          type="text"
          size="small"
          onClick={() => void copyCNAME()}
          style={{ opacity: hovered ? 1 : 0, pointerEvents: hovered ? "auto" : "none" }}
        />
      </Tooltip>
    </Space>
  );
};

function Servers() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const searchParamsWithoutUser = new URLSearchParams(searchParams);
  searchParamsWithoutUser.delete("userId");
  const effectiveSearchParams = withDefaultPageSize(searchParamsWithoutUser, defaultPageSize);
  const searchFormRef = useRef<ProFormInstance<ServerSearchFormValues> | undefined>(undefined);
  const query = useQuery<ListEnabledServersMatchResponse>({
    queryKey: serverQueryKeys.list(effectiveSearchParams),
    queryFn: () => listServers(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const params = {
    ...defaultPageParams,
    ...Object.fromEntries(effectiveSearchParams.entries()),
    sortField: (effectiveSearchParams.get("sortField") as SortField) || undefined,
    sortOrder: (effectiveSearchParams.get("sortOrder") as SortOrder) || undefined,
  };

  // Convert URL search params to numbers for pagination
  const currentPage = Number(params.page);
  const currentSize = Number(params.size);
  const nodeClusterId = effectiveSearchParams.get("nodeClusterId") || undefined;
  const serverGroupId = effectiveSearchParams.get("serverGroupId") || undefined;

  useEffect(() => {
    searchFormRef.current?.setFieldsValue({
      keyword: params.keyword,
      nodeClusterId,
      serverGroupId,
    });
  }, [nodeClusterId, params.keyword, serverGroupId]);

  const getSortOrder = (field: SortField): SortOrder => {
    return params.sortField === field ? (params.sortOrder ?? null) : null;
  };

  const onTableChange: TableProps<Server>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newParams = new URLSearchParams(searchParamsWithoutUser);

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

  const onDelete = (serverIds: string[] | bigint[]) => {
    const deleteParams = new URLSearchParams();
    serverIds.forEach((serverId) => deleteParams.append("serverIds", String(serverId)));

    request(`/api/server?${deleteParams.toString()}`, { method: "DELETE" })
      .then(() => {
        void query.refetch();
        void queryClient.invalidateQueries({ queryKey: serverQueryKeys.groupsBase() });
      })
      .catch((error) => {
        console.log("delete error: ", error);
        message.error(formatErrorMessage("删除网站失败", error));
      });
  };

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const onToggleIsOn = async (serverIds: (string | bigint)[], isOn: boolean) => {
    const total = serverIds.length;
    setBatchLoading(true);
    setBatchProgress({ current: 0, total });

    let successCount = 0;
    let failCount = 0;
    let firstErrorMessage = "";

    for (let i = 0; i < serverIds.length; i++) {
      try {
        await request(`/api/server/${serverIds[i]}/is-on/${isOn}`, {
          method: "PATCH",
        });
        successCount++;
      } catch (error) {
        console.error(`toggle isOn error for ${serverIds[i]}:`, error);
        failCount++;
        if (firstErrorMessage === "") {
          firstErrorMessage = getErrorMessage(error, "未知错误");
        }
      }
      setBatchProgress({ current: i + 1, total });
    }

    setBatchLoading(false);
    setBatchProgress({ current: 0, total: 0 });

    if (failCount > 0) {
      message.warning(
        firstErrorMessage
          ? `操作完成: ${successCount} 成功, ${failCount} 失败。首个错误: ${firstErrorMessage}`
          : `操作完成: ${successCount} 成功, ${failCount} 失败`,
      );
    } else {
      message.success(`已${isOn ? "启用" : "禁用"} ${successCount} 个网站`);
    }

    void query.refetch();
  };
  const columns: ProColumns<Server>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
      colSize: 2,
      order: 3,
      fieldProps: { placeholder: "搜索关键词：域名、端口、网站名称等" },
    },
    {
      title: "集群",
      dataIndex: "nodeClusterId",
      hideInTable: true,
      order: 2,
      formItemRender: () => <ClusterSelector />,
    },
    {
      title: "网站分组",
      dataIndex: "serverGroupId",
      hideInTable: true,
      order: 1,
      formItemRender: () => <ServerGroupSelector includeUngrouped />,
    },
    {
      title: "ID",
      dataIndex: "id",
      fixed: "left",
      width: 80,
      search: false,
    },
    {
      title: "网站名称",
      dataIndex: "name",
      render: (_, server) => (
        <Space orientation="vertical" size={0}>
          <Link to={`/servers/${server.id}/dashboard`}>{server.name}</Link>
          <div style={{ marginTop: 4 }}>
            {(() => {
              switch (server.type) {
                case "httpProxy":
                  return (
                    <Tag variant="filled" style={{ fontSize: "10px", lineHeight: "16px" }}>
                      CDN加速
                    </Tag>
                  );
                case "tcpProxy":
                  return (
                    <Tag variant="filled" style={{ fontSize: "10px", lineHeight: "16px" }}>
                      TCP负载均衡
                    </Tag>
                  );
                case "udpProxy":
                  return (
                    <Tag variant="filled" style={{ fontSize: "10px", lineHeight: "16px" }}>
                      UDP负载均衡
                    </Tag>
                  );
                default:
                  return (
                    <Tag variant="filled" style={{ fontSize: "10px", lineHeight: "16px" }}>
                      其他服务
                    </Tag>
                  );
              }
            })()}
          </div>
        </Space>
      ),
      search: false,
    },
    {
      title: "部署集群",
      dataIndex: ["nodeCluster", "name"],
      search: false,
    },
    {
      title: "域名",
      dataIndex: "firstServerName",
      render: (_, server) => <DomainPreviewCell domains={server.serverNames} previewCount={1} />,
      search: false,
    },
    {
      title: "CNAME",
      dataIndex: "cname",
      render: (_, server) => <CNAMECell cname={server.cname} />,
      search: false,
    },
    {
      title: "端口",
      key: "listenPorts",
      render: (_, server) => (
        <Space size="small" orientation="vertical">
          {getListenPorts(server).map((port) => (
            <Tag key={`${port.port}-${port.protocol}`}>
              {port.port} ({port.protocol})
            </Tag>
          ))}
        </Space>
      ),
      search: false,
    },
    {
      title: "下行带宽",
      dataIndex: "bandwidthBytes",
      key: "trafficOut",
      align: "right",
      sorter: true,
      sortOrder: getSortOrder("trafficOut"),
      render: (_, server) => (String(server.bandwidthBytes) === "0" ? "-" : formatBytesSimple(Number(server.bandwidthBytes))),
      search: false,
    },
    {
      title: "QPS",
      dataIndex: "countRequests",
      key: "requests",
      align: "right",
      sorter: true,
      sortOrder: getSortOrder("requests"),
      render: (_, server) => (String(server.countRequests) === "0" ? "-" : String(server.countRequests)),
      search: false,
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (_, server) => (server.isOn ? <CheckOutlined style={{ color: "green" }} /> : <CloseOutlined style={{ color: "red" }} />),
      search: false,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      render: (_, server) => dayjs.unix(Number(server.createdAt)).format("YYYY-MM-DD HH:mm:ss"),
      search: false,
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      align: "center",
      width: 130,
      render: (_, server) => (
        <Space size="small">
          <Link to={`/servers/${server.id}/dashboard`}>
            <TableActionIcon tooltip="详情" icon={<EyeOutlined />} />
          </Link>
          <Link to={`/servers/${server.id}/settings`}>
            <TableActionIcon tooltip="设置" icon={<SettingOutlined />} />
          </Link>
          <Popconfirm title="确定删除吗？" onConfirm={() => onDelete([server.id!])}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
      search: false,
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{
        title: "网站列表",
        extra: [
          <Link key="create" to="/servers/create">
            <Button type="primary">创建网站</Button>
          </Link>,
        ],
      }}
    >
      <ProTable<Server>
        columns={columns}
        dataSource={data?.servers}
        loading={loading}
        rowKey={(server) => String(server.id)}
        scroll={{ x: "max-content" }}
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
          defaultCollapsed: true,
          defaultColsNumber: 1,
          span: {
            xs: 24,
            sm: 24,
            md: 12,
            lg: 12,
            xl: 12,
            xxl: 12,
          },
        }}
        formRef={searchFormRef}
        form={{
          initialValues: {
            keyword: params.keyword,
            nodeClusterId,
            serverGroupId,
          },
        }}
        onSubmit={(formParams: ServerSearchFormValues) => {
          const values = formParams;

          const newParams = new URLSearchParams(searchParamsWithoutUser);

          newParams.set("keyword", values.keyword || "");

          if (values.nodeClusterId) {
            newParams.set("nodeClusterId", values.nodeClusterId);
          } else {
            newParams.delete("nodeClusterId");
          }

          if (values.serverGroupId) {
            newParams.set("serverGroupId", values.serverGroupId);
          } else {
            newParams.delete("serverGroupId");
          }

          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        onReset={() => {
          const newParams = new URLSearchParams(searchParamsWithoutUser);
          newParams.set("keyword", "");
          newParams.delete("nodeClusterId");
          newParams.delete("serverGroupId");
          newParams.set("page", "1");
          setSearchParams(newParams);
        }}
        columnsState={{
          defaultValue: {
            createdAt: { show: false },
          },
          persistenceKey: "servers-table-columns",
          persistenceType: "localStorage",
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        tableAlertRender={false}
        toolBarRender={() => [
          selectedRowKeys.length > 0 && (
            <Space key="batch-actions" wrap>
              <span style={{ marginRight: 8 }}>已选择 {selectedRowKeys.length} 项</span>
              {batchLoading && (
                <span style={{ marginRight: 8 }}>
                  <Spin size="small" /> 处理中 {batchProgress.current}/{batchProgress.total}
                </span>
              )}
              <Popconfirm
                title={`确定启用选中的 ${selectedRowKeys.length} 个网站吗？`}
                onConfirm={async () => {
                  await onToggleIsOn(selectedRowKeys as string[], true);
                  setSelectedRowKeys([]);
                }}
                disabled={batchLoading}
              >
                <Button type="link" disabled={batchLoading} style={{ padding: "4px 8px" }}>
                  批量启用
                </Button>
              </Popconfirm>
              <Popconfirm
                title={`确定禁用选中的 ${selectedRowKeys.length} 个网站吗？`}
                onConfirm={async () => {
                  await onToggleIsOn(selectedRowKeys as string[], false);
                  setSelectedRowKeys([]);
                }}
                disabled={batchLoading}
              >
                <Button type="link" disabled={batchLoading} style={{ padding: "4px 8px" }}>
                  批量禁用
                </Button>
              </Popconfirm>
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 个网站吗？`}
                onConfirm={() => {
                  onDelete(selectedRowKeys as string[]);
                  setSelectedRowKeys([]);
                }}
                disabled={batchLoading}
              >
                <Button type="link" danger disabled={batchLoading} style={{ padding: "4px 8px" }}>
                  批量删除
                </Button>
              </Popconfirm>
              <Button type="link" onClick={() => setSelectedRowKeys([])} style={{ padding: "4px 8px" }}>
                取消
              </Button>
            </Space>
          ),
        ]}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: currentSize,
          current: currentPage,
          total: Number(data?.total),
        }}
      />
    </PageContainer>
  );
}

export default Servers;
