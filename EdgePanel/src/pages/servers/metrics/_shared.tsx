import { FooterToolbar, PageContainer, ProColumns, ProTable } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Link, request, useNavigate, useParams, useSearchParams } from "@umijs/max";
import { App, Button, Card, Form, Input, InputNumber, List, Modal, Popconfirm, Select, Space, Switch, TableProps, Tag, theme } from "antd";
import { BarChartOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import type { MetricChart } from "@/pb/models/model_metric_chart_pb";
import type { MetricItem } from "@/pb/models/model_metric_item_pb";
import type { FindEnabledMetricItemResponse, ListEnabledMetricItemsResponse } from "@/pb/service_metric_item_pb";
import type { ListEnabledMetricChartsResponse } from "@/pb/service_metric_chart_pb";
import { MetricHttpKeysInput } from "@/components/SharedInput";
import { HttpKeyName, formatErrorMessage } from "@/utils";
import { serverQueryKeys } from "@/queries/keys";
import TableActionIcon from "@/components/TableActionIcon";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";
import { getMetricDetail, listMetrics } from "@/services/servers";
import { decodeMetricChartParams, encodeMetricChartParams, getMetricChartTypeName, getMetricPeriodUnitName } from "./metricsHelpers";

const metricValueOptions = [
  { label: "请求数", value: "${countRequest}" },
  { label: "连接数", value: "${countConnection}" },
  { label: "下行流量", value: "${countTrafficOut}" },
  { label: "上行流量", value: "${countTrafficIn}" },
];

const metricPeriodUnitOptions = [
  { label: "分钟", value: "minute" },
  { label: "小时", value: "hour" },
  { label: "天", value: "day" },
  { label: "周", value: "week" },
  { label: "月", value: "month" },
];

const metricChartTypeOptions = [
  { label: "柱图", value: "bar", description: "通过柱图展示各个对象的排行。" },
  { label: "饼图", value: "pie", description: "通过饼图展示各个对象的占比。" },
  { label: "时间柱图", value: "timeBar", description: "通过柱图展示各个对象在不同时间段的变化。" },
  { label: "时间线图", value: "timeLine", description: "通过线图展示各个对象在不同时间段的变化。" },
  { label: "表格", value: "table", description: "以表格的形式展示数据。" },
];

type MetricPeriodValue = { period: number; periodUnit: string };

type MetricFormValues = {
  name: string;
  keys: string[];
  value: string;
  periodConfig: MetricPeriodValue;
  expiresPeriod: number;
  isOn: boolean;
  isPublic: boolean;
};

type ChartFormValues = {
  name: string;
  type: string;
  isOn: boolean;
  maxItems: number;
  ignoreEmptyKeys: boolean;
  ignoredKeys: string[];
};

const MetricPeriodInput = ({ value, onChange }: { value?: MetricPeriodValue; onChange?: (value: MetricPeriodValue) => void }) => {
  const currentValue = value || { period: 1, periodUnit: "day" };
  return (
    <Space.Compact>
      <InputNumber min={1} max={9999} value={currentValue.period} onChange={(period) => onChange?.({ ...currentValue, period: period || 1 })} />
      <Select
        style={{ width: 100 }}
        value={currentValue.periodUnit}
        options={metricPeriodUnitOptions}
        onChange={(periodUnit) => onChange?.({ ...currentValue, periodUnit })}
      />
    </Space.Compact>
  );
};

const metricInitialValues: MetricFormValues = {
  name: "",
  keys: [],
  value: "${countRequest}",
  periodConfig: { period: 1, periodUnit: "day" },
  expiresPeriod: 0,
  isOn: true,
  isPublic: true,
};

const buildMetricPayload = (values: MetricFormValues, metricItemId?: bigint) => ({
  ...(metricItemId ? { metricItemId: String(metricItemId) } : { category: "http" }),
  name: values.name,
  keys: values.keys || [],
  period: values.periodConfig.period,
  periodUnit: values.periodConfig.periodUnit,
  expiresPeriod: values.expiresPeriod || 0,
  value: values.value,
  ...(metricItemId ? { isOn: values.isOn, isPublic: values.isPublic } : { isPublic: values.isPublic }),
});

const getMetricPeriod = (metric: MetricItem): MetricPeriodValue => ({ period: metric.period || 1, periodUnit: metric.periodUnit || "day" });

export default function Metrics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const [createPopup, setCreatePopup] = useState(false);
  const { message: messageApi } = App.useApp();
  const query = useQuery<ListEnabledMetricItemsResponse>({
    queryKey: serverQueryKeys.metrics(effectiveSearchParams),
    queryFn: () => listMetrics(effectiveSearchParams),
  });

  const onTableChange: TableProps<MetricItem>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const nextParams = { ...Object.fromEntries(searchParams.entries()) };
    if (pagination.current) nextParams.page = String(pagination.current);
    if (pagination.pageSize) nextParams.size = String(pagination.pageSize);
    if (s.order && s.columnKey) {
      nextParams.sortField = s.columnKey as string;
      nextParams.sortOrder = s.order;
    } else {
      delete nextParams.sortField;
      delete nextParams.sortOrder;
    }
    setSearchParams(nextParams);
  };

  const onDelete = async (id: bigint) => {
    try {
      await request(`/api/metrics/${id}`, { method: "DELETE" });
      messageApi.success("删除成功");
      void query.refetch();
    } catch (error) {
      messageApi.error(formatErrorMessage("删除指标失败", error));
    }
  };

  const columns: ProColumns<MetricItem>[] = [
    { title: "ID", dataIndex: "id", valueType: "digit", width: 100 },
    {
      title: "指标名称",
      dataIndex: "name",
      render: (_, entity) => (
        <div>
          <Link to={`/servers/metrics/${entity.id}`}>{entity.name}</Link>
          <div style={{ marginTop: 4 }}>
            {entity.isPublic && <Tag color="blue">公用</Tag>}
            {entity.code && <Tag color="orange">内置</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: "统计对象",
      dataIndex: "keys",
      render: (_, entity) => (entity.keys?.length ? entity.keys.map((key) => <Tag key={key}>{HttpKeyName(key)}</Tag>) : "-"),
    },
    {
      title: "统计数值",
      dataIndex: "value",
      render: (_, entity) => metricValueOptions.find((option) => option.value === entity.value)?.label || entity.value,
    },
    { title: "统计周期", render: (_, entity) => `${entity.period || 1} ${getMetricPeriodUnitName(entity.periodUnit || "day")}` },
    { title: "状态", dataIndex: "isOn", render: (_, entity) => <Tag color={entity.isOn ? "green" : "default"}>{entity.isOn ? "启用" : "停用"}</Tag> },
    {
      title: "操作",
      valueType: "option",
      render: (_, entity) => (
        <Space size="small">
          <Link to={`/servers/metrics/${entity.id}`}>
            <TableActionIcon tooltip="编辑" icon={<EditOutlined />} />
          </Link>
          <Popconfirm title="确定删除此指标吗？" onConfirm={() => onDelete(entity.id)} okText="确定" cancelText="取消">
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      title="统计指标"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatePopup(true)}>
          创建指标
        </Button>
      }
    >
      <ProTable<MetricItem>
        columns={columns}
        dataSource={query.data?.metricItems || []}
        loading={query.isPending || query.isFetching}
        rowKey="id"
        onChange={onTableChange}
        search={false}
        options={{ reload: () => void query.refetch() }}
        pagination={{
          current: Number(effectiveSearchParams.get("page") || 1),
          pageSize: Number(effectiveSearchParams.get("size") || defaultPageSize),
        }}
      />
      {createPopup && <MetricFormModal open onClose={() => setCreatePopup(false)} onSuccess={() => void query.refetch()} />}
    </PageContainer>
  );
}

const MetricFormModal = ({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [form] = Form.useForm<MetricFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const { message: messageApi } = App.useApp();
  const onFinish = async (values: MetricFormValues) => {
    setSubmitting(true);
    try {
      await request("/api/metrics", { method: "POST", data: buildMetricPayload(values) });
      messageApi.success("指标创建成功");
      onSuccess();
      onClose();
    } catch (error) {
      messageApi.error(formatErrorMessage("创建指标失败", error));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal
      title="创建 HTTP 统计指标"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} initialValues={metricInitialValues} onFinish={onFinish}>
        <Form.Item label="指标名称" name="name" rules={[{ required: true, message: "请输入指标名称" }]}>
          <Input maxLength={100} placeholder="请输入指标名称" />
        </Form.Item>
        <Form.Item label="统计对象" name="keys" rules={[{ required: true, message: "请选择统计对象" }]}>
          <MetricHttpKeysInput />
        </Form.Item>
        <Form.Item
          label="统计周期"
          name="periodConfig"
          help="在此周期内同一对象累积为同一数据。"
          rules={[{ required: true, message: "请设置统计周期" }]}
        >
          <MetricPeriodInput />
        </Form.Item>
        <Form.Item label="统计数值" name="value" rules={[{ required: true, message: "请选择统计数值" }]}>
          <Select options={metricValueOptions} />
        </Form.Item>
        <Form.Item label="数据保留周期" name="expiresPeriod" help="自动删除此周期以外的数据，单位和统计周期一致；不填或为 0 表示自动计算。">
          <InputNumber min={0} max={9999} />
        </Form.Item>
        <Form.Item label="公用" name="isPublic" valuePropName="checked" help="选中表示所有集群自动使用此指标。">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const EditMetricPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const query = useQuery<FindEnabledMetricItemResponse>({
    queryKey: serverQueryKeys.metricDetail(id),
    queryFn: () => getMetricDetail(id),
    enabled: Boolean(id),
  });
  const metric = query.data?.metricItem;
  const [form] = Form.useForm<MetricFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [charts, setCharts] = useState<MetricChart[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [chartModal, setChartModal] = useState<MetricChart | "create" | null>(null);
  const { token } = theme.useToken();
  const { message: messageApi } = App.useApp();

  const loadCharts = useCallback(async () => {
    if (!metric?.id) return;
    setLoadingCharts(true);
    try {
      const response = await request<ListEnabledMetricChartsResponse>(`/api/metrics/${metric.id}/charts`, { params: { size: 50 } });
      setCharts(response.metricCharts || []);
    } catch (error) {
      messageApi.error(formatErrorMessage("加载图表失败", error));
    } finally {
      setLoadingCharts(false);
    }
  }, [metric?.id, messageApi]);

  useEffect(() => {
    if (!metric) return;
    form.setFieldsValue({
      name: metric.name,
      keys: metric.keys || [],
      periodConfig: getMetricPeriod(metric),
      value: metric.value,
      expiresPeriod: metric.expiresPeriod,
      isOn: metric.isOn,
      isPublic: metric.isPublic,
    });
    void loadCharts();
  }, [metric, form, loadCharts]);

  const onFinish = async (values: MetricFormValues) => {
    if (!metric) return;
    setSubmitting(true);
    try {
      await request(`/api/metrics/${metric.id}`, { method: "PUT", data: buildMetricPayload(values, metric.id) });
      messageApi.success("指标保存成功");
      navigate("/servers/metrics");
    } catch (error) {
      messageApi.error(formatErrorMessage("更新指标失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteChart = async (chartId: bigint) => {
    try {
      await request(`/api/metrics/charts/${chartId}`, { method: "DELETE" });
      messageApi.success("图表删除成功");
      await loadCharts();
    } catch (error) {
      messageApi.error(formatErrorMessage("删除图表失败", error));
    }
  };

  if (!metric) return <Card loading={query.isPending} />;

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname(), entityName: metric.name, fallbackEntityLabel: "指标" })}
      title={`修改指标：${metric.name}`}
      onBack={() => navigate(-1)}
      loading={query.isPending && !query.data}
    >
      <Card style={{ marginBottom: 80 }}>
        <div style={{ marginBottom: 16 }}>
          <Tag color="warning">修改统计对象、统计周期或统计数值后，将重新记录数据。</Tag>
        </div>
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          onFinish={onFinish}
          initialValues={{ ...metric, periodConfig: getMetricPeriod(metric), keys: metric.keys || [] }}
        >
          <Form.Item label="指标名称" name="name" rules={[{ required: true, message: "请输入指标名称" }]}>
            <Input maxLength={100} placeholder="请输入指标名称" />
          </Form.Item>
          {metric.code && (
            <Form.Item label="代号">
              <span style={{ color: token.colorTextSecondary }}>{metric.code}</span>
            </Form.Item>
          )}
          <Form.Item label="统计对象" name="keys" rules={[{ required: true, message: "请选择统计对象" }]}>
            <MetricHttpKeysInput />
          </Form.Item>
          <Form.Item
            label="统计周期"
            name="periodConfig"
            help="在此周期内同一对象累积为同一数据。"
            rules={[{ required: true, message: "请设置统计周期" }]}
          >
            <MetricPeriodInput />
          </Form.Item>
          <Form.Item label="统计数值" name="value" rules={[{ required: true, message: "请选择统计数值" }]}>
            <Select options={metricValueOptions} />
          </Form.Item>
          <Form.Item label="数据保留周期" name="expiresPeriod" help="自动删除此周期以外的数据，单位和统计周期一致；不填或为 0 表示自动计算。">
            <InputNumber min={0} max={9999} />
          </Form.Item>
          <Form.Item label="启用" name="isOn" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="公用" name="isPublic" valuePropName="checked" help="选中表示所有集群自动使用此指标。">
            <Switch />
          </Form.Item>
          <FooterToolbar>
            <Button onClick={() => form.resetFields()}>重置</Button>
            <Button type="primary" onClick={() => form.submit()} loading={submitting}>
              保存
            </Button>
          </FooterToolbar>
        </Form>
      </Card>
      <Card
        title="统计图表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setChartModal("create")}>
            创建图表
          </Button>
        }
      >
        <List
          loading={loadingCharts}
          locale={{ emptyText: "暂时还没有图表。" }}
          dataSource={charts}
          renderItem={(chart) => (
            <List.Item
              actions={[
                <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => setChartModal(chart)}>
                  编辑
                </Button>,
                <Popconfirm key="delete" title="确定删除此图表吗？" onConfirm={() => onDeleteChart(chart.id)} okText="确定" cancelText="取消">
                  <Button type="link" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<BarChartOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />}
                title={
                  <Space>
                    {chart.name}
                    {!chart.isOn && <Tag>停用</Tag>}
                  </Space>
                }
                description={
                  <Space>
                    <Tag>{getMetricChartTypeName(chart.type)}</Tag>
                    <span>最多显示 {chart.maxItems > 0 ? chart.maxItems : "不限"} 个对象</span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
      {chartModal && (
        <MetricChartModal
          metricItemId={metric.id}
          chart={chartModal === "create" ? undefined : chartModal}
          onClose={() => setChartModal(null)}
          onSuccess={loadCharts}
        />
      )}
    </PageContainer>
  );
};

const MetricChartModal = ({
  metricItemId,
  chart,
  onClose,
  onSuccess,
}: {
  metricItemId: bigint;
  chart?: MetricChart;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) => {
  const [form] = Form.useForm<ChartFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const { message: messageApi } = App.useApp();
  const selectedType = Form.useWatch("type", form) || "bar";
  const typeDefinition = metricChartTypeOptions.find((option) => option.value === selectedType);

  useEffect(() => {
    const params = decodeMetricChartParams(chart?.paramsJSON);
    form.setFieldsValue({
      name: chart?.name || "",
      type: chart?.type || "bar",
      isOn: chart?.isOn ?? true,
      maxItems: chart?.maxItems || 0,
      ignoreEmptyKeys: chart?.ignoreEmptyKeys ?? true,
      ignoredKeys:
        chart?.ignoredKeys ||
        (Array.isArray(params.ignoredKeys) ? params.ignoredKeys.filter((value): value is string => typeof value === "string") : []),
    });
  }, [chart, form]);

  const onFinish = async (values: ChartFormValues) => {
    setSubmitting(true);
    const data = {
      metricItemId: String(metricItemId),
      metricChartId: chart ? String(chart.id) : undefined,
      name: values.name,
      type: values.type,
      widthDiv: chart?.widthDiv || 0,
      paramsJSON: encodeMetricChartParams({}),
      isOn: values.isOn,
      maxItems: values.maxItems || 0,
      ignoreEmptyKeys: values.ignoreEmptyKeys,
      ignoredKeys: values.ignoredKeys || [],
    };
    try {
      await request(chart ? `/api/metrics/charts/${chart.id}` : "/api/metrics/charts", { method: chart ? "PUT" : "POST", data });
      messageApi.success(chart ? "图表保存成功" : "图表创建成功");
      await onSuccess();
      onClose();
    } catch (error) {
      messageApi.error(formatErrorMessage(chart ? "更新图表失败" : "创建图表失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={chart ? "修改图表" : "创建图表"}
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} onFinish={onFinish}>
        <Form.Item label="图表名称" name="name" rules={[{ required: true, message: "请输入图表名称" }]} help="也会作为部分图表的标题。">
          <Input maxLength={100} placeholder="请输入图表名称" />
        </Form.Item>
        <Form.Item label="图表类型" name="type" rules={[{ required: true, message: "请选择图表类型" }]} extra={typeDefinition?.description}>
          <Select options={metricChartTypeOptions} />
        </Form.Item>
        {chart && (
          <Form.Item label="启用当前图表" name="isOn" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        <Form.Item label="对象数限制" name="maxItems" help="图表中最多显示的对象数，0 表示不限制。">
          <InputNumber min={0} max={99} />
        </Form.Item>
        <Form.Item label="忽略空值对象" name="ignoreEmptyKeys" valuePropName="checked" help="选中后，空的对象值不会在图表中出现。">
          <Switch />
        </Form.Item>
        <Form.Item label="忽略其他对象" name="ignoredKeys" help="这些对象不会在图表中出现，可输入后按回车添加。">
          <Select mode="tags" tokenSeparators={[",", " "]} placeholder="输入对象值后按回车" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
