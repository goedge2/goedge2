import { Button, Modal, Space, Tag, message, TableProps } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { request, useLocation, useNavigate, useParams, useSearchParams } from "@umijs/max";
import type { NodeLog } from "@/pb/models/model_node_log_pb";
import type { ListNodeLogsResponse } from "@/pb/service_node_log_pb";
import { clusterQueryKeys } from "@/queries/keys";
import { listNodeLogsByNodeId } from "@/services/clusters";
import { CheckOutlined } from "@ant-design/icons";
import { useState } from "react";
import dayjs from "dayjs";
import { getNodeTabList } from "./_shared/nodeTabList";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
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

// 节点日志列表组件
const NodeLogs = () => {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const query = useQuery<ListNodeLogsResponse>({
    queryKey: clusterQueryKeys.nodeLogsByNode(nodeId, effectiveSearchParams),
    queryFn: () => listNodeLogsByNodeId(nodeId, effectiveSearchParams),
    enabled: Boolean(nodeId),
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

  const onTableChange: TableProps<NodeLog>["onChange"] = (pagination, _filters, sorter) => {
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
    try {
      await request("/api/node-logs/read", {
        method: "PUT",
        data: {
          nodeLogIds: logIds,
          nodeId: nodeId,
        },
      });
      message.success("标记已读成功");
      refreshPage();
      setSelectedRowKeys([]);
    } catch (error) {
      Modal.error({ title: "错误", content: formatErrorMessage("标记已读失败", error) });
    }
  };

  const onMarkAllAsRead = async () => {
    try {
      await request("/api/node-logs/read-all", { method: "POST", data: { nodeId } });
      message.success("全部标记已读成功");
      refreshPage();
    } catch (error) {
      Modal.error({ title: "错误", content: formatErrorMessage("标记全部已读失败", error) });
    }
  };

  const renderLevel = (level: string): React.ReactNode => {
    const levelColors: Record<string, string> = {
      error: "red",
      warn: "orange",
      warning: "orange",
      info: "blue",
      debug: "gray",
    };
    return <Tag color={levelColors[level] || "default"}>{level.toUpperCase()}</Tag>;
  };

  const columns: ProColumns<NodeLog>[] = [
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
      render: (_, record) => renderLevel(record.level),
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
      title: "时间",
      dataIndex: "createdAt",
      width: 160,
      render: (createdAt) => dayjs.unix(Number(createdAt)).format("YYYY-MM-DD HH:mm:ss"),
      search: false,
    },
    {
      title: "标签",
      dataIndex: "tag",
      width: 100,
      search: false,
    },
    {
      title: "描述",
      dataIndex: "description",
      ellipsis: true,
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {record.isRead ? (
            <TableActionIcon tooltip="已读" icon={<CheckOutlined />} disabled />
          ) : (
            <TableActionIcon tooltip="标记已读" icon={<CheckOutlined />} onClick={() => onMarkAsRead([String(record.id)])} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        fallbackEntityLabel: "节点",
        tabList: getNodeTabList(nodeId!),
      })}
      header={{ title: "节点日志" }}
      tabList={getNodeTabList(nodeId!)}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
      extra={[
        <Button key="markAllRead" onClick={onMarkAllAsRead} disabled={logs.filter((log) => !log.isRead).length === 0}>
          全部标记已读
        </Button>,
      ]}
    >
      <ProTable<NodeLog>
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
        tableAlertRender={({ selectedRowKeys, onCleanSelected }) => (
          <Space size={24}>
            <span>
              已选 {selectedRowKeys.length} 项
              <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
                取消选择
              </a>
            </span>
            {selectedRowKeys.length > 0 && <a onClick={() => onMarkAsRead(selectedRowKeys.map((key) => key as string))}>批量标记已读</a>}
          </Space>
        )}
        tableAlertOptionRender={() => null}
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

export default NodeLogs;
