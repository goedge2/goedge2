import { App, Button, Space, Tag, Tooltip, TableProps, theme } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Link, request, useSearchParams } from "@umijs/max";
import type { NodeLog as NodeLogModel } from "@/pb/models/model_node_log_pb";
import type { ListNodeLogsResponse } from "@/pb/service_node_log_pb";
import { clusterQueryKeys } from "@/queries/keys";
import { listNodeLogs } from "@/services/clusters";
import { CheckOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
  level: "",
  dayFrom: "",
  dayTo: "",
  isUnread: "false",
  fixedState: "0",
};

const levelPresentation: Record<string, { color: string; label: string }> = {
  error: { color: "red", label: "错误" },
  warn: { color: "orange", label: "警告" },
  warning: { color: "orange", label: "警告" },
  info: { color: "blue", label: "信息" },
  debug: { color: "default", label: "调试" },
};

// 节点日志列表组件
const NodeLog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const { message: messageApi, modal } = App.useApp();
  const { token } = theme.useToken();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const query = useQuery<ListNodeLogsResponse>({
    queryKey: clusterQueryKeys.nodeLogs(effectiveSearchParams),
    queryFn: () => listNodeLogs(effectiveSearchParams),
  });

  const refreshPage = () => {
    void query.refetch();
  };

  // 从 URL 查询参数构建 QueryParams
  const params = {
    ...defaultPageParams,
    ...Object.fromEntries(effectiveSearchParams.entries()),
  };

  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const logs = data?.nodeLogs || [];
  const total = data?.total || 0;

  const onTableChange: TableProps<NodeLogModel>["onChange"] = (pagination, _filters, sorter) => {
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
    setSearchParams(newSearchParams);
  };

  const onMarkAsRead = async (logIds: string[]) => {
    setBatchLoading(true);
    try {
      await request("/api/node-logs/read", {
        method: "PUT",
        data: {
          nodeLogIds: logIds,
        },
      });
      messageApi.success("标记已读成功");
      refreshPage();
      setSelectedRowKeys([]);
    } catch (error) {
      modal.error({ title: "错误", content: formatErrorMessage("标记已读失败", error) });
    } finally {
      setBatchLoading(false);
    }
  };

  const onMarkAllAsRead = async () => {
    try {
      await request("/api/node-logs/read-all", { method: "PUT" });
      messageApi.success("全部标记已读成功");
      refreshPage();
    } catch (error) {
      modal.error({ title: "错误", content: formatErrorMessage("标记全部已读失败", error) });
    }
  };

  const renderLevel = (level: string): React.ReactNode => {
    const presentation = levelPresentation[level];
    return <Tag color={presentation?.color || "default"}>{presentation?.label || level || "未知"}</Tag>;
  };

  const columns: ProColumns<NodeLogModel>[] = [
    {
      title: "关键字",
      dataIndex: "keyword",
      hideInTable: true,
    },
    {
      title: "级别",
      dataIndex: "level",
      valueType: "select",
      valueEnum: {
        error: { text: "ERROR", status: "Error" },
        warn: { text: "WARN", status: "Warning" },
        warning: { text: "WARNING", status: "Warning" },
        info: { text: "INFO", status: "Processing" },
        debug: { text: "DEBUG", status: "Default" },
      },
      width: 80,
      hideInTable: true,
    },
    {
      title: "时间范围",
      dataIndex: "dayRange",
      valueType: "dateRange",
      hideInTable: true,
      search: {
        transform: (value) => {
          return {
            dayFrom: value[0],
            dayTo: value[1],
          };
        },
      },
    },
    {
      title: "读取状态",
      dataIndex: "isUnread",
      valueType: "select",
      valueEnum: {
        true: { text: "未读" },
        false: { text: "已读" },
      },
      hideInTable: true,
    },
    {
      title: "日志内容",
      dataIndex: "description",
      search: false,
      render: (_, record) => {
        const nodeId = String(record.node?.id ?? record.nodeId ?? "0");
        const clusterId = String(record.nodeCluster?.id ?? "0");
        const nodeName = record.node?.name || (nodeId !== "0" ? `节点 #${nodeId}` : "-");
        const clusterName = record.nodeCluster?.name || (clusterId !== "0" ? `集群 #${clusterId}` : "-");
        const content = record.tag ? `[${record.tag}] ${record.description}` : record.description;
        const readIcon = record.isRead ? (
          <Tooltip title="已读">
            <EyeOutlined aria-label="已读" style={{ color: "#52c41a", marginTop: 3 }} />
          </Tooltip>
        ) : (
          <Tooltip title="未读">
            <EyeInvisibleOutlined aria-label="未读" style={{ color: "#faad14", marginTop: 3 }} />
          </Tooltip>
        );

        return (
          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
            <Space size={8} wrap style={{ color: token.colorTextTertiary, fontSize: 12 }}>
              <span>{dayjs.unix(Number(record.createdAt)).format("YYYY-MM-DD HH:mm:ss")}</span>
              <span>·</span>
              {nodeId !== "0" ? <Link to={`/clusters/nodes/${nodeId}/details`}>{nodeName}</Link> : <span>{nodeName}</span>}
              <span>·</span>
              {clusterId !== "0" ? <Link to={`/clusters/${clusterId}/dashboard`}>{clusterName}</Link> : <span>{clusterName}</span>}
            </Space>
            <Space size={6} align="start" style={{ width: "100%" }}>
              {readIcon}
              {renderLevel(record.level)}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6 }}>{content || "-"}</span>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {record.isRead ? (
            <TableActionIcon tooltip="已读" aria-label="已读" icon={<CheckOutlined aria-label="已读" />} disabled />
          ) : (
            <TableActionIcon
              tooltip="标记已读"
              aria-label="标记已读"
              icon={<CheckOutlined aria-label="标记已读" />}
              onClick={() => onMarkAsRead([String(record.id)])}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "节点日志" }}
      extra={[
        <Button key="markAllRead" onClick={onMarkAllAsRead} disabled={logs.filter((log) => !log.isRead).length === 0}>
          全部标记已读
        </Button>,
      ]}
    >
      <ProTable<NodeLogModel>
        headerTitle="日志列表"
        rowKey="id"
        onChange={onTableChange}
        options={{
          reload: () => {
            void query.refetch();
          },
        }}
        search={{
          labelWidth: "auto",
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
        }}
        tableAlertRender={false}
        toolBarRender={() =>
          selectedRowKeys.length > 0
            ? [
                <Space key="batch-actions" wrap>
                  <span>已选 {selectedRowKeys.length} 项</span>
                  <Button
                    type="link"
                    loading={batchLoading}
                    disabled={batchLoading}
                    onClick={() => onMarkAsRead(selectedRowKeys.map((key) => String(key)))}
                  >
                    批量标记已读
                  </Button>
                  <Button type="link" disabled={batchLoading} onClick={() => setSelectedRowKeys([])}>
                    取消选择
                  </Button>
                </Space>,
              ]
            : []
        }
        columns={columns}
        dataSource={logs}
        loading={loading}
        form={{
          initialValues: {
            keyword: params.keyword,
            level: params.level,
            isUnread: params.isUnread === "true" ? "true" : params.isUnread === "false" ? "false" : undefined,
            dayRange: params.dayFrom && params.dayTo ? [dayjs(params.dayFrom), dayjs(params.dayTo)] : undefined,
          },
        }}
        onSubmit={(values) => {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set("keyword", values.keyword || "");
          newSearchParams.set("level", values.level || "");

          if (values.dayRange && values.dayRange[0] && values.dayRange[1]) {
            const start = dayjs(values.dayRange[0]).format("YYYY-MM-DD");
            const end = dayjs(values.dayRange[1]).format("YYYY-MM-DD");
            newSearchParams.set("dayFrom", start);
            newSearchParams.set("dayTo", end);
          } else {
            newSearchParams.set("dayFrom", "");
            newSearchParams.set("dayTo", "");
          }

          newSearchParams.set("isUnread", values.isUnread || "");
          newSearchParams.set("page", "1");
          setSearchParams(newSearchParams);
        }}
        onReset={() => {
          const newSearchParams = new URLSearchParams();
          newSearchParams.set("page", "1");
          newSearchParams.set("size", String(params.size));
          setSearchParams(newSearchParams);
        }}
        pagination={{
          current: Number(params.page),
          pageSize: Number(params.size),
          total: Number(total),
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
      />
    </PageContainer>
  );
};

export default NodeLog;
