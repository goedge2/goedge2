import { Descriptions, Space, TableProps, Button, message, Spin, Popconfirm, theme } from "antd";
import { PageContainer, ProTable, type ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { request, useParams, useSearchParams } from "@umijs/max";
import { useState } from "react";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";

import type { DNSDomain } from "@/pb/models/model_dns_domain_pb";
import type { DNSProvider } from "@/pb/models/model_dns_provider_pb";
import type { ListDNSDomainsWithDNSProviderIdResponse } from "@/pb/service_dns_domain_pb";
import { dnsQueryKeys } from "@/queries/keys";
import { listDNSDomains } from "@/services/dns";
import { ProviderForm } from "./_components/ProviderForm";
import { ProviderDescriptions } from "./_shared/providers";
import type { ProviderApiParams } from "./_shared/providers/types";
import dayjs from "dayjs";
import { DeleteOutlined, SyncOutlined } from "@ant-design/icons";
import TableActionIcon from "@/components/TableActionIcon";
import { formatErrorMessage, getErrorMessage } from "@/utils";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";

type DomainsPageData = ListDNSDomainsWithDNSProviderIdResponse & {
  dnsProvider?: DNSProvider;
};

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

export default function DnsDomains() {
  const { token } = theme.useToken();
  const { providerId } = useParams<{ providerId: string }>();
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [syncingDomains, setSyncingDomains] = useState(false);
  const [syncingDomainIds, setSyncingDomainIds] = useState<Set<string>>(new Set());
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const queryParams = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const query = useQuery<DomainsPageData>({
    queryKey: dnsQueryKeys.domains(providerId, effectiveSearchParams),
    queryFn: () => listDNSDomains(providerId, effectiveSearchParams),
    enabled: Boolean(providerId),
  });
  const data = query.data;
  const dnsProvider = data?.dnsProvider;
  const loading = query.isPending || query.isFetching;

  const handleSyncDomains = async () => {
    if (!dnsProvider) return;
    setSyncingDomains(true);
    try {
      await request(`/api/dns/provider/${dnsProvider.id}/sync-domains`, { method: "POST" });
      message.success("同步成功");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("同步失败", error));
    } finally {
      setSyncingDomains(false);
    }
  };

  const handleSyncDomain = async (domainId: string) => {
    setSyncingDomainIds((prev) => {
      const next = new Set(prev);
      next.add(domainId);
      return next;
    });
    try {
      const response = await request<{ isOk?: boolean; error?: string }>(`/api/dns/domain/${domainId}/sync-data`, { method: "POST" });
      if (response.isOk) {
        message.success("同步成功");
      } else {
        message.error(response.error || "同步失败");
      }
    } catch (error) {
      message.error(formatErrorMessage("同步失败", error));
    } finally {
      setSyncingDomainIds((prev) => {
        const next = new Set(prev);
        next.delete(domainId);
        return next;
      });
    }
  };

  const onBatchSync = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: selectedRowKeys.length });

    let success = 0;
    let fail = 0;
    let firstErrorMessage = "";

    for (let i = 0; i < selectedRowKeys.length; i++) {
      const id = String(selectedRowKeys[i]);

      setSyncingDomainIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      try {
        const response = await request<{ isOk?: boolean }>(`/api/dns/domain/${id}/sync-data`, { method: "POST" });
        if (response.isOk) success++;
        else fail++;
      } catch (error) {
        fail++;
        if (firstErrorMessage === "") {
          firstErrorMessage = getErrorMessage(error, "未知错误");
        }
      } finally {
        setSyncingDomainIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      setBatchProgress({ current: i + 1, total: selectedRowKeys.length });
    }

    setBatchLoading(false);
    setBatchProgress({ current: 0, total: 0 });
    setSelectedRowKeys([]);

    if (fail > 0) {
      message.warning(
        firstErrorMessage ? `同步完成: ${success} 成功, ${fail} 失败。首个错误: ${firstErrorMessage}` : `同步完成: ${success} 成功, ${fail} 失败`,
      );
    } else {
      message.success(`同步完成: ${success} 成功`);
    }
    void query.refetch();
  };

  const getProviderDescriptionItems = (provider?: DNSProvider) => {
    if (!provider) return [];

    const baseItems = [
      {
        key: "name",
        label: "账号说明",
        children: provider.name,
      },
      {
        key: "providerType",
        label: "服务商",
        children: provider.typeName,
      },
    ];

    const typeSpecificItems =
      (ProviderDescriptions[provider.type] ? ProviderDescriptions[provider.type]((provider.apiParams || {}) as ProviderApiParams) : []) || [];

    return [...baseItems, ...typeSpecificItems];
  };

  const onTableChange: TableProps<DNSDomain>["onChange"] = (pagination, _filters, sorter) => {
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

  const columns: ProColumns<DNSDomain>[] = [
    {
      title: "域名",
      dataIndex: "name",
    },
    {
      title: "线路",
      dataIndex: "routes",
      render: (routes) => (Array.isArray(routes) ? routes.length : 0),
      search: false,
    },
    {
      title: "集群",
      dataIndex: "countNodeClusters",
      search: false,
    },
    {
      title: "节点域名",
      dataIndex: "countAllNodes",
      search: false,
    },
    {
      title: "网站域名",
      dataIndex: "countAllServers",
      search: false,
    },
    {
      title: "数据更新时间",
      dataIndex: "dataUpdatedAt",
      render: (_, record) =>
        Number(record.dataUpdatedAt) === 0 ? (
          <span style={{ color: token.colorTextQuaternary }}>尚未更新</span>
        ) : (
          dayjs.unix(Number(record.dataUpdatedAt)).format("YYYY-MM-DD HH:mm:ss")
        ),
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      fixed: "right",
      width: 130,
      render: (_, record) => {
        const isSyncing = syncingDomainIds.has(record.id.toString());
        return [
          isSyncing ? (
            <TableActionIcon key="sync" tooltip="同步中" icon={<SyncOutlined />} loading disabled />
          ) : (
            <TableActionIcon key="sync" tooltip="同步" icon={<SyncOutlined />} onClick={() => handleSyncDomain(record.id.toString())} />
          ),
          <TableActionIcon key="delete" tooltip="删除" icon={<DeleteOutlined />} danger />,
        ];
      },
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname(), entityName: dnsProvider?.name, fallbackEntityLabel: "DNS服务商" })}
      header={{ title: "DNS域名管理" }}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        <Descriptions
          title="账号信息"
          column={1}
          size="small"
          extra={<a onClick={() => setShowProviderForm(true)}>修改</a>}
          items={getProviderDescriptionItems(dnsProvider)}
        />

        <ProTable<DNSDomain>
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          tableAlertRender={false}
          columns={columns}
          dataSource={data?.dnsDomains}
          loading={loading}
          rowKey={(cluster) => cluster.id}
          scroll={{ x: "max-content" }}
          search={false}
          onChange={onTableChange}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSize: Number(queryParams.size),
            current: Number(queryParams.page),
            total: Number(data?.total),
          }}
          options={{
            reload: () => {
              void query.refetch();
            },
          }}
          toolBarRender={() => [
            selectedRowKeys.length > 0 && (
              <Space key="batch-actions" wrap>
                <span style={{ marginRight: 8 }}>已选择 {selectedRowKeys.length} 项</span>
                {batchLoading && (
                  <span style={{ marginRight: 8 }}>
                    <Spin size="small" /> 处理中 {batchProgress.current}/{batchProgress.total}
                  </span>
                )}
                <Popconfirm title={`确定同步选中的 ${selectedRowKeys.length} 个域名吗？`} onConfirm={onBatchSync} disabled={batchLoading}>
                  <Button type="link" disabled={batchLoading} style={{ padding: "4px 8px" }}>
                    批量同步
                  </Button>
                </Popconfirm>
                <Button type="link" onClick={() => setSelectedRowKeys([])} style={{ padding: "4px 8px" }} disabled={batchLoading}>
                  取消
                </Button>
              </Space>
            ),
            <Button key="sync" loading={syncingDomains} onClick={handleSyncDomains}>
              刷新域名
            </Button>,
          ]}
        />
      </Space>

      {showProviderForm && dnsProvider && (
        <ProviderForm
          provider={dnsProvider}
          onCancel={() => setShowProviderForm(false)}
          onOk={() => {
            setShowProviderForm(false);
            void query.refetch();
          }}
        />
      )}
    </PageContainer>
  );
}
