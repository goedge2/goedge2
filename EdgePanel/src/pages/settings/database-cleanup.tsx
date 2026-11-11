import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Button, Form, InputNumber, Space, Popconfirm, message, Card, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PageContainer, FooterToolbar } from "@ant-design/pro-components";
import { request, useLocation, useNavigate } from "@umijs/max";
import { settingQueryKeys } from "@/queries/keys";
import { readDatabaseCleanupData } from "@/services/settings";
import type { DatabaseCleanupData } from "@/services/settings";
import { advSettingTabList } from "./_shared/advSettingTabList";
import { CompactField } from "@/components/SharedInput";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

interface DBTable {
  name: string;
  schema: string;
  type: string;
  engine: string;
  rows: number;
  dataLength: number;
  indexLength: number;
  comment: string;
  collation: string;
  isBaseTable: boolean;
  canClean: boolean;
  canDelete: boolean;
}

interface DatabaseCleanConfig {
  serverAccessLog?: { clean?: { days?: number } };
  serverBandwidthStat?: { clean?: { days?: number } };
  serverDailyStat?: { clean?: { days?: number } };
  serverDomainHourlyStat?: { clean?: { days?: number } };
  trafficDailyStat?: { clean?: { days?: number } };
  trafficHourlyStat?: { clean?: { days?: number } };
  nodeClusterTrafficDailyStat?: { clean?: { days?: number } };
  nodeTrafficDailyStat?: { clean?: { days?: number } };
  nodeTrafficHourlyStat?: { clean?: { days?: number } };
  httpCacheTask?: { clean?: { days?: number } };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function DatabaseCleanup() {
  const query = useQuery<DatabaseCleanupData>({
    queryKey: settingQueryKeys.databaseCleanup(),
    queryFn: () => readDatabaseCleanupData(),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;
  const pageContainerLoading = loading && !data;
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("manual");
  const [moreSettings, setMoreSettings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<DatabaseCleanConfig>();

  useEffect(() => {
    if (data?.databaseConfig?.valueJSON) {
      try {
        form.setFieldsValue(JSON.parse(data.databaseConfig.valueJSON));
      } catch {
        // ignore parse error
      }
    }
  }, [data, form]);

  const handleTruncate = async (tableName: string) => {
    try {
      await request(`/api/db/tables/${tableName}/truncate`, { method: "POST" });
      message.success("清空成功");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("清空失败", error));
    }
  };

  const handleDelete = async (tableName: string) => {
    try {
      await request(`/api/db/tables/${tableName}`, { method: "DELETE" });
      message.success("删除成功");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("删除失败", error));
    }
  };

  const onFinish = async (values: DatabaseCleanConfig) => {
    setSubmitting(true);
    try {
      await request("/api/sys/settings/databaseConfig", {
        method: "PUT",
        data: {
          code: "databaseConfig",
          valueJSON: JSON.stringify(values),
        },
      });
      message.success("保存成功");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<DBTable> = [
    {
      title: "表名",
      dataIndex: "name",
    },
    {
      title: "占用空间",
      key: "size",
      render: (_, r) => formatBytes(r.dataLength + r.indexLength),
    },
    {
      title: "记录数",
      key: "rows",
      render: (_, r) => r.rows.toLocaleString(),
    },
    {
      title: "用途",
      dataIndex: "comment",
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space>
          {record.canClean && (
            <Popconfirm title={`确定要清空表 "${record.name}" 的数据吗？此操作不可恢复。`} onConfirm={() => handleTruncate(record.name)}>
              <Button size="small" danger>
                清空
              </Button>
            </Popconfirm>
          )}
          {record.canDelete && (
            <Popconfirm title={`确定要删除表 "${record.name}" 吗？此操作不可恢复。`} onConfirm={() => handleDelete(record.name)}>
              <Button size="small" danger type="primary">
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageContainer
        breadcrumb={buildPageBreadcrumb({
          pathname: location.pathname,
          tabList: advSettingTabList,
        })}
        header={{ title: "高级设置" }}
        loading={pageContainerLoading}
        tabList={advSettingTabList}
        tabActiveKey={location.pathname}
        onTabChange={(key) => navigate(key)}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "manual",
              label: "手动清理",
              children: <Table<DBTable> columns={columns} dataSource={data?.dbTables ?? []} rowKey="name" pagination={false} loading={loading} />,
            },
            {
              key: "auto",
              label: "自动清理设置",
              children: (
                <Form form={form} layout="vertical" onFinish={onFinish}>
                  <Card title="网站访问日志" style={{ marginBottom: 16 }}>
                    <Form.Item
                      name={["serverAccessLog", "clean", "days"]}
                      label="数据保存天数"
                      help="天数包括当天。如果填0表示不自动清理。此设置也会同时作用于日志数据库。"
                    >
                      <CompactField addonAfter="天">
                        <InputNumber min={0} style={{ width: 120 }} />
                      </CompactField>
                    </Form.Item>
                  </Card>

                  <div style={{ marginBottom: 16 }}>
                    <Button type="link" onClick={() => setMoreSettings(!moreSettings)}>
                      {moreSettings ? "收起更多设置" : "更多设置"}
                    </Button>
                  </div>

                  <div style={{ display: moreSettings ? "block" : "none" }}>
                    <Card title="网站带宽统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["serverBandwidthStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="网站流量统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["serverDailyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="网站按小时域名统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["serverDomainHourlyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="系统整体按天流量统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["trafficDailyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="系统整体按小时流量统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["trafficHourlyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="集群按天流量统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["nodeClusterTrafficDailyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="节点按天流量统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["nodeTrafficDailyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="节点按小时流量统计" style={{ marginBottom: 16 }}>
                      <Form.Item name={["nodeTrafficHourlyStat", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                    <Card title="缓存任务" style={{ marginBottom: 16 }}>
                      <Form.Item name={["httpCacheTask", "clean", "days"]} label="数据保存天数">
                        <CompactField addonAfter="天">
                          <InputNumber min={0} style={{ width: 120 }} />
                        </CompactField>
                      </Form.Item>
                    </Card>
                  </div>
                </Form>
              ),
            },
          ]}
        />
      </PageContainer>
      {activeTab === "auto" && (
        <FooterToolbar>
          <Button type="primary" onClick={() => form.submit()} loading={submitting}>
            保存
          </Button>
        </FooterToolbar>
      )}
    </>
  );
}
