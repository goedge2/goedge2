import { Button, Card, Form, Input, Modal, Popconfirm, Radio, Space, TableProps } from "antd";
import { Outlet, request, useLocation, useNavigate, useSearchParams } from "@umijs/max";
import { useQuery } from "@tanstack/react-query";
import { serverQueryKeys } from "@/queries/keys";
import { listCacheTasks } from "@/services/servers";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import type { HTTPCacheTask } from "@/pb/models/model_http_cache_task_pb";
import type { ListHTTPCacheTasksResponse } from "@/pb/service_http_cache_task_pb";
import { DeleteOutlined, InfoOutlined } from "@ant-design/icons";
import { useState } from "react";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import dayjs from "dayjs";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

export const CacheTasksLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabList = [
    { key: "/servers/cache-task", tab: "刷新缓存" },
    { key: "/servers/cache-task/fetch", tab: "预热缓存" },
    { key: "/servers/cache-task/all", tab: "所有任务" },
  ];

  const activeKey =
    tabList.find((t) => location.pathname === t.key)?.key ||
    tabList.find((t) => location.pathname.startsWith(t.key + "/"))?.key ||
    "/servers/cache-task";

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList,
      })}
      header={{ title: "刷新预热" }}
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

export const PurgeCacheTask = () => {
  const [form] = Form.useForm<{ type: string; keyType: string; keys: string[] }>();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { type: string; keyType: string; keys: string[] }) => {
    try {
      setLoading(true);
      const keys = (values.keys || []).filter((k: string) => k.trim());
      if (keys.length === 0) {
        Modal.error({ title: "错误", content: "请输入至少一条数据" });
        setLoading(false);
        return;
      }

      const payload = {
        type: "purge",
        keyType: values.keyType || "key",
        keys: keys,
      };

      await request("/api/cache/task", {
        method: "POST",
        data: payload,
      });
      Modal.success({
        title: "成功",
        content: "缓存刷新任务已创建",
        onOk: () => form.resetFields(),
      });
    } catch (error) {
      console.error("创建刷新缓存任务失败:", error);
      Modal.error({ title: "错误", content: formatErrorMessage("创建任务失败", error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ keyType: "key" }}>
        <Form.Item name="type" hidden initialValue="purge">
          <Input />
        </Form.Item>

        <Form.Item name="keyType" label="选择类型" rules={[{ required: true, message: "请选择类型" }]}>
          <Radio.Group>
            <Radio value="key">URL</Radio>
            <Radio value="prefix">目录</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.keyType !== currentValues.keyType}>
          {({ getFieldValue }) => {
            const keyType = getFieldValue("keyType");
            return (
              <Form.Item
                name="keys"
                label={keyType === "key" ? "要刷新的URL列表" : "要刷新的URL目录列表"}
                rules={[{ required: true, message: "请输入至少一条数据" }]}
              >
                <MultiLineArrayTextArea
                  placeholder={keyType === "key" ? "https://example.com/hello/world.html" : "https://example.com/hello/\n或者\nhttps://example.com/"}
                  autoSize={{ minRows: 5, maxRows: 10 }}
                />
              </Form.Item>
            );
          }}
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            创建任务
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export const FetchCacheTask = () => {
  const [form] = Form.useForm<{ type: string; keyType: string; keys: string[] }>();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { type: string; keyType: string; keys: string[] }) => {
    try {
      setLoading(true);
      const keys = (values.keys || []).filter((k: string) => k.trim());
      if (keys.length === 0) {
        Modal.error({ title: "错误", content: "请输入至少一条数据" });
        setLoading(false);
        return;
      }

      const payload = {
        type: "fetch",
        keyType: "key",
        keys: keys,
      };

      await request("/api/cache/task", {
        method: "POST",
        data: payload,
      });
      Modal.success({
        title: "成功",
        content: "缓存预热任务已创建",
        onOk: () => form.resetFields(),
      });
    } catch (error) {
      console.error("创建预热缓存任务失败:", error);
      Modal.error({ title: "错误", content: formatErrorMessage("创建任务失败", error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="type" hidden initialValue="fetch">
          <Input />
        </Form.Item>

        <Form.Item name="keyType" hidden initialValue="key">
          <Input />
        </Form.Item>

        <Form.Item name="keys" label="要预热的URL列表" rules={[{ required: true, message: "请输入至少一条数据" }]}>
          <MultiLineArrayTextArea placeholder="https://example.com/hello/world.html" autoSize={{ minRows: 5, maxRows: 10 }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            创建任务
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export const AllCacheTasks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const query = useQuery<ListHTTPCacheTasksResponse>({
    queryKey: serverQueryKeys.cacheTasks(effectiveSearchParams),
    queryFn: () => listCacheTasks(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const page = Number(effectiveSearchParams.get("page")) || 1;
  const size = Number(effectiveSearchParams.get("size")) || defaultPageSize;

  const onTableChange: TableProps<HTTPCacheTask>["onChange"] = (pagination, _filters, sorter) => {
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

  const onDelete = (taskId: string) => {
    request(`/api/cache/task/${taskId}`, { method: "DELETE" })
      .then(() => {
        navigate(0);
      })
      .catch((error) => {
        console.log("delete error: ", error);
        Modal.error({ title: "错误", content: formatErrorMessage("删除任务失败", error) });
      });
  };

  const renderTaskType = (type: string): string => {
    switch (type) {
      case "purge":
        return "刷新缓存";
      case "fetch":
        return "预热缓存";
      default:
        return type;
    }
  };

  const renderKeyType = (keyType: string): string => {
    switch (keyType) {
      case "key":
        return "URL";
      case "prefix":
        return "目录";
      default:
        return keyType;
    }
  };

  const columns: ProColumns<HTTPCacheTask>[] = [
    {
      title: "任务ID",
      dataIndex: "id",
      width: 80,
      render: (dom) => String(dom),
      search: false,
    },
    {
      title: "任务类型",
      dataIndex: "type",
      width: 100,
      render: (_, entity) => renderTaskType(entity.type),
      search: false,
    },
    {
      title: "URL类型",
      dataIndex: "keyType",
      width: 100,
      render: (_, entity) => renderKeyType(entity.keyType),
      search: false,
    },
    {
      title: "提交时间",
      dataIndex: "createdAt",
      width: 180,
      render: (_, entity) => dayjs(Number(entity.createdAt) * 1000).format("YYYY-MM-DD HH:mm:ss"),
      search: false,
    },
    {
      title: "所属用户",
      dataIndex: ["user", "username"],
      width: 120,
      search: false,
    },
    {
      title: "任务状态",
      dataIndex: "isDone",
      width: 100,
      render: (_, entity) => (entity.isDone ? "已完成" : "队列中"),
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <TableActionIcon
            tooltip="任务详情"
            icon={<InfoOutlined />}
            onClick={() => Modal.info({ title: "任务详情", content: `任务ID: ${record.id}` })}
          />
          <Popconfirm title="确定要删除该任务吗？" onConfirm={() => onDelete(String(record.id))}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<HTTPCacheTask>
      headerTitle="任务列表"
      columns={columns}
      dataSource={data?.httpCacheTasks || []}
      loading={loading}
      rowKey={(record) => String(record.id)}
      onChange={onTableChange}
      search={false}
      options={false}
      pagination={{
        current: page,
        pageSize: size,
        total: Number(data?.total || 0),
        showSizeChanger: true,
        showQuickJumper: true,
      }}
    />
  );
};
