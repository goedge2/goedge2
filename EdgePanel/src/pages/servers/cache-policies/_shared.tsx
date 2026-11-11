import { Button, Card, Form, FormInstance, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, TableProps, message } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Link, request, useNavigate, useParams, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { getCachePolicyDetail, listCachePolicies } from "@/services/servers";
import type { HTTPCachePolicy } from "@/pb/models/model_http_cache_policy_pb";
import type { ListEnabledHTTPCachePoliciesResponse } from "@/pb/service_http_cache_policy_pb";
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { SizeCapacityInput, TimeDurationInput } from "@/components/SharedInput";
import type { SizeCapacity } from "@/pb/models/model_config_shared_pb";
import { CacheRefsInput } from "@/components/CacheRefsInput";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

// 缓存策略默认值
const cachePolicyDefaultConfig = {
  isOn: true,
  type: "file",
  syncCompressionCache: false,
  capacity: { count: 128, unit: "gb" },
  maxSize: { count: 256, unit: "mb" },
  fetchTimeout: { count: 20, unit: "minute" },
};

const policyTypeOptions = [
  { label: "文件缓存", value: "file" },
  { label: "内存缓存", value: "memory" },
];

const CachePolicyFormItems = ({ form }: { form: FormInstance<HTTPCachePolicy> }) => {
  const policyType = Form.useWatch("type", form);

  return (
    <>
      <Form.Item name="name" label="策略名称" rules={[{ required: true, message: "请输入策略名称" }]}>
        <Input placeholder="请输入缓存策略名称" />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea placeholder="请输入策略描述" rows={3} />
      </Form.Item>

      <Form.Item name="type" label="策略类型" rules={[{ required: true, message: "请选择策略类型" }]}>
        <Select options={policyTypeOptions} />
      </Form.Item>

      {policyType === "file" && (
        <>
          <Form.Item
            name={["options", "dir"]}
            label="缓存目录"
            rules={[{ required: true, message: "请输入缓存目录" }]}
            help="缓存文件存放的目录，必须是绝对路径"
          >
            <Input placeholder="/var/cache" />
          </Form.Item>

          <Form.Item
            name={["options", "openFileCache"]}
            label="缓存文件句柄缓存"
            help="保持在内存中的缓存文件句柄的数量，提升缓存文件打开速度，同时也会占用系统更多的内存，建议数量不超过缓存文件数量的百分之一；0表示不启用。"
          >
            <InputNumber min={0} placeholder="0" />
          </Form.Item>

          <Form.Item
            name={["options", "enableSendfile"]}
            label="开启 sendfile 选项"
            valuePropName="checked"
            help="使用sendfile提升发送缓存文件的效率。"
          >
            <Switch />
          </Form.Item>
        </>
      )}

      {policyType === "memory" && (
        <Form.Item name={["options", "capacity"]} label="内存最大容量" help="单个节点上允许缓存的最大容量，如果为0表示没有限制。">
          <SizeCapacityInput />
        </Form.Item>
      )}

      <Form.Item name="isOn" label="启用" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item
        name="capacity"
        label="缓存硬盘最大用量"
        help="单个节点上缓存所在硬盘的最大用量，超出此用量或硬盘接近用尽时，将会自动尝试清理旧数据，如果为0表示没有限制。"
      >
        <SizeCapacityInput />
      </Form.Item>

      <Form.Item name="fetchTimeout" label="预热超时时间" help="预热读取源站的超时时间，默认20分钟。">
        <TimeDurationInput minUnit="second" />
      </Form.Item>

      <Form.Item
        name="syncCompressionCache"
        label="同步写入压缩缓存"
        valuePropName="checked"
        help="选中后，在压缩设置开启的情况下，在缓存源站内容的同时，也会同步写入压缩缓存；不选中，表示在源站内容缓存后，下一次调用才会缓存压缩内容，防止同一时间内硬盘IO负载过高。"
      >
        <Switch />
      </Form.Item>
    </>
  );
};

const CreateCachePolicyPopup = ({ onClose, onCreateSuccess }: { onClose: () => void; onCreateSuccess?: () => void }) => {
  const [form] = Form.useForm<HTTPCachePolicy>();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = () => {
    setConfirmLoading(true);
    form.submit();
  };

  const onSuccess = () => {
    onClose();
    if (onCreateSuccess) {
      onCreateSuccess();
    }
  };

  const onError = (error?: unknown) => {
    setConfirmLoading(false);
    if (error) {
      message.error(formatErrorMessage("创建缓存策略失败", error));
    }
  };

  const onFinish = async (values: HTTPCachePolicy) => {
    try {
      const payload = {
        httpCachePolicy: {
          name: values.name,
          description: values.description || "",
          isOn: values.isOn,
          type: values.type,
          capacity: values.capacity,
          options: values.options,
          fetchTimeout: values.fetchTimeout,
          syncCompressionCache: values.syncCompressionCache || false,
        },
      };
      await request("/api/cache/policy", {
        method: "POST",
        data: payload,
      });
      onSuccess();
    } catch (error) {
      console.error("创建缓存策略失败:", error);
      onError(error);
    }
  };

  return (
    <Modal
      title="创建缓存策略"
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
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={cachePolicyDefaultConfig}>
        <CachePolicyFormItems form={form} />
      </Form>
    </Modal>
  );
};

export const EditCachePolicyPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<HTTPCachePolicy>();
  const query = useQuery<{ httpCachePolicy: HTTPCachePolicy }>({
    queryKey: serverQueryKeys.cachePolicyDetail(id),
    queryFn: () => getCachePolicyDetail(id),
    enabled: Boolean(id),
  });
  const pageContainerLoading = query.isPending && !query.data;

  const data = query.data;

  const [confirmLoading, setConfirmLoading] = useState(false);

  const onFinish = async (values: HTTPCachePolicy) => {
    setConfirmLoading(true);
    try {
      const payload = {
        httpCachePolicyId: id,
        httpCachePolicy: {
          name: values.name,
          description: values.description || "",
          isOn: values.isOn,
          type: values.type,
          capacity: values.capacity,
          options: values.options,
          fetchTimeout: values.fetchTimeout,
          syncCompressionCache: values.syncCompressionCache || false,
          cacheRefs: values.cacheRefs,
        },
      };
      await request(`/api/cache/policy/${id}`, {
        method: "PUT",
        data: payload,
      });
      navigate("/servers/cache-policies");
    } catch (error) {
      console.error("更新缓存策略失败:", error);
      message.error(formatErrorMessage("更新缓存策略失败", error));
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: getCurrentBreadcrumbPathname(),
        entityName: data?.httpCachePolicy?.name,
        fallbackEntityLabel: "缓存策略",
      })}
      header={{ title: data?.httpCachePolicy?.name || "编辑缓存策略" }}
      loading={pageContainerLoading}
    >
      <Form
        form={form}
        labelCol={{ span: 4 }}
        layout="horizontal"
        onFinish={onFinish}
        initialValues={
          data?.httpCachePolicy
            ? {
                ...data.httpCachePolicy,
                type: data.httpCachePolicy.type as "file" | "memory",
              }
            : undefined
        }
      >
        <Space orientation="vertical" style={{ width: "100%" }} size="large">
          <Card>
            <CachePolicyFormItems form={form} />
          </Card>

          <Card title="默认缓存条件">
            <Form.Item name="cacheRefs">
              <CacheRefsInput />
            </Form.Item>
          </Card>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={confirmLoading}>
              保存
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </PageContainer>
  );
};

function CachePolicies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const [createPopup, setCreatePopup] = useState<boolean>(false);
  const query = useQuery<ListEnabledHTTPCachePoliciesResponse>({
    queryKey: serverQueryKeys.cachePolicies(effectiveSearchParams),
    queryFn: () => listCachePolicies(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const page = Number(effectiveSearchParams.get("page")) || 1;
  const size = Number(effectiveSearchParams.get("size")) || defaultPageSize;
  const keyword = effectiveSearchParams.get("keyword") || "";

  const onTableChange: TableProps<HTTPCachePolicy>["onChange"] = (pagination, _filters, sorter) => {
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

  const onDelete = async (policyId: string) => {
    try {
      await request(`/api/cache/policy/${policyId}`, { method: "DELETE", skipErrorHandler: true });
      void query.refetch();
    } catch (error) {
      console.error("Delete error: ", error);
      message.error(formatErrorMessage("删除缓存策略失败", error));
    }
  };

  const renderPolicyType = (type: string): string => {
    switch (type) {
      case "file":
        return "文件缓存";
      case "memory":
        return "内存缓存";
      default:
        return type;
    }
  };

  const renderCapacity = (capacity: SizeCapacity | undefined): string => {
    if (!capacity || !capacity.count) {
      return "-";
    }
    return `${capacity.count}${capacity.unit ? capacity.unit.toUpperCase() : ""}`;
  };

  const columns: ProColumns<HTTPCachePolicy>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
    },
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: "策略名称",
      dataIndex: "name",
      render: (dom, entity) => <Link to={`/servers/cache-policies/${entity.id}`}>{dom}</Link>,
      search: false,
    },
    {
      title: "策略类型",
      dataIndex: "type",
      width: 100,
      render: (_, entity) => renderPolicyType(entity.type),
      search: false,
    },
    {
      title: "集群数量",
      dataIndex: "countClusters",
      width: 100,
      render: (_, entity) => <Link to={`/clusters?httpCachePolicyId=${entity.id}`}>{entity.countClusters ?? 0}</Link>,
      search: false,
    },
    {
      title: "总容量限制",
      dataIndex: "capacity",
      width: 120,
      render: (_, entity) => renderCapacity(entity.capacity),
      search: false,
    },
    {
      title: "状态",
      dataIndex: "isOn",
      width: 80,
      render: (_, entity) => (entity.isOn ? <CheckOutlined style={{ color: "green" }} /> : <CloseOutlined style={{ color: "red" }} />),
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      width: 130,
      fixed: "right",
      align: "center",
      render: (_, entity) => (
        <Space size="small">
          <TableActionIcon tooltip="编辑" icon={<EditOutlined />} onClick={() => navigate(`/servers/cache-policies/${entity.id}`)} />
          <Popconfirm title="确定删除吗？" onConfirm={() => onDelete(entity.id)}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "缓存策略" }}
      extra={[
        <Button key="create" type="primary" onClick={() => setCreatePopup(true)}>
          创建策略
        </Button>,
      ]}
    >
      <ProTable<HTTPCachePolicy>
        headerTitle="策略列表"
        columns={columns}
        rowKey="id"
        onChange={onTableChange}
        dataSource={data?.httpCachePolicies}
        loading={loading}
        options={{
          reload: () => {
            void query.refetch();
          },
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

      {createPopup && (
        <CreateCachePolicyPopup
          onClose={() => setCreatePopup(false)}
          onCreateSuccess={() => {
            void query.refetch();
          }}
        />
      )}
    </PageContainer>
  );
}

export default CachePolicies;
