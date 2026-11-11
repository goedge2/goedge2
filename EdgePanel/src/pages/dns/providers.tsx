import { Space, Button, TableProps, Popconfirm, message } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { formatErrorMessage } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, request, useSearchParams } from "@umijs/max";
import { useState } from "react";
import { DeleteOutlined, EyeOutlined, FormOutlined } from "@ant-design/icons";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { useDefaultPageSize } from "@/runtime/shellQueries";

import type { ListEnabledDNSProvidersResponse } from "@/pb/service_dns_provider_pb";
import type { DNSProvider } from "@/pb/models/model_dns_provider_pb";
import { ProviderForm } from "./_components/ProviderForm";
import TableActionIcon from "@/components/TableActionIcon";
import { dnsQueryKeys } from "@/queries/keys";
import { listDNSProviders } from "@/services/dns";
import { withDefaultPageSize } from "@/services/pagination";

// DNS 服务商列表
export default function DnsProviders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const queryClient = useQueryClient();
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<DNSProvider | undefined>(undefined);

  const query = useQuery<ListEnabledDNSProvidersResponse>({
    queryKey: dnsQueryKeys.providers(effectiveSearchParams),
    queryFn: () => listDNSProviders(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const page = Number(effectiveSearchParams.get("page")) || 1;
  const size = Number(effectiveSearchParams.get("size")) || defaultPageSize;
  const keyword = effectiveSearchParams.get("keyword") || "";

  const onTableChange: TableProps<DNSProvider>["onChange"] = (pagination, _filters, sorter) => {
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

  const onDelete = async (providerId: string) => {
    try {
      await request(`/api/dns/provider?dnsProviderId=${providerId}`, { method: "DELETE" });
      message.success("删除成功");
      void queryClient.invalidateQueries({ queryKey: dnsQueryKeys.providersBase() });
    } catch (error) {
      console.error("删除DNS服务商失败:", error);
      message.error(formatErrorMessage("删除失败", error));
    }
  };

  const columns: ProColumns<DNSProvider>[] = [
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
    },
    {
      title: "ID",
      dataIndex: "id",
      fixed: "left",
      width: 80,
      search: false,
    },
    {
      title: "账号说明",
      dataIndex: "name",
      render: (_, provider) => <Link to={`/dns/provider/${provider.id}/domains`}>{provider.name}</Link>,
      search: false,
    },
    {
      title: "服务商",
      dataIndex: "typeName",
      search: false,
    },
    {
      title: "域名数量",
      dataIndex: "countDomains",
      search: false,
    },
    {
      title: "操作",
      valueType: "option",
      fixed: "right",
      width: 180,
      render: (_, provider) => (
        <Space size="small">
          <Link to={`/dns/provider/${provider.id}/domains`}>
            <TableActionIcon tooltip="详情" icon={<EyeOutlined />} />
          </Link>
          <TableActionIcon
            tooltip="修改"
            icon={<FormOutlined />}
            onClick={() => {
              setCurrentProvider(provider);
              setShowProviderForm(true);
            }}
          />
          <Popconfirm
            title="确定删除此DNS服务商?"
            description="删除后该服务商下的域名将无法管理"
            onConfirm={() => onDelete(provider.id)}
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
      header={{ title: "DNS服务商" }}
      extra={[
        <Button
          key="create"
          type="primary"
          onClick={() => {
            setCurrentProvider(undefined);
            setShowProviderForm(true);
          }}
        >
          添加服务商
        </Button>,
      ]}
    >
      <ProTable<DNSProvider>
        headerTitle="服务商列表"
        columns={columns}
        rowKey="id"
        onChange={onTableChange}
        dataSource={data?.dnsProviders}
        loading={loading}
        options={{
          reload: () => {
            void queryClient.invalidateQueries({ queryKey: dnsQueryKeys.providersBase() });
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
        scroll={{ x: "max-content" }}
      />

      {showProviderForm && (
        <ProviderForm
          provider={currentProvider}
          onCancel={() => {
            setShowProviderForm(false);
            setCurrentProvider(undefined);
          }}
          onOk={() => {
            setShowProviderForm(false);
            setCurrentProvider(undefined);
            void queryClient.invalidateQueries({ queryKey: dnsQueryKeys.providersBase() });
          }}
        />
      )}
    </PageContainer>
  );
}
