import { Space, Tag, Button, TableProps, Popconfirm, message } from "antd";
import { PageContainer, ProTable, ProColumns } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Link, request, useNavigate, useSearchParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { useDefaultPageSize } from "@/runtime/shellQueries";
import { withDefaultPageSize } from "@/services/pagination";
import { listWafPolicies } from "@/services/servers";
import { DeleteOutlined, FormOutlined } from "@ant-design/icons";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";

import type { HTTPFirewallPolicy } from "@/pb/models/model_http_firewall_pb";
import type { ListEnabledHTTPFirewallPoliciesResponse } from "@/pb/service_http_firewall_policy_pb";
import TableActionIcon from "@/components/TableActionIcon";

const defaultPageParams = {
  page: 1,
  size: 20,
  keyword: "",
};

// 全局WAF策略
export default function WafPolicies() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const defaultPageSize = useDefaultPageSize();
  const effectiveSearchParams = withDefaultPageSize(searchParams, defaultPageSize);
  const params = { ...defaultPageParams, ...Object.fromEntries(effectiveSearchParams.entries()) };
  const query = useQuery<ListEnabledHTTPFirewallPoliciesResponse>({
    queryKey: serverQueryKeys.wafPolicies(effectiveSearchParams),
    queryFn: () => listWafPolicies(effectiveSearchParams),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;

  const onDelete = async (policyId: string) => {
    try {
      await request(`/api/waf/policy/${policyId}`, { method: "DELETE", skipErrorHandler: true });
      void query.refetch();
    } catch (error) {
      console.error("删除WAF策略失败:", error);
      message.error(formatErrorMessage("删除WAF策略失败", error));
    }
  };

  const onTableChange: TableProps<HTTPFirewallPolicy>["onChange"] = (pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newSearchParams = new URLSearchParams({
      ...params,
      page: String(pagination.current || 1),
      size: String(pagination.pageSize || defaultPageSize),
    });

    if (s.order && s.columnKey) {
      newSearchParams.set("sortField", s.columnKey as string);
      newSearchParams.set("sortOrder", s.order);
    } else {
      newSearchParams.delete("sortField");
      newSearchParams.delete("sortOrder");
    }
    navigate(`?${newSearchParams.toString()}`);
  };

  const columns: ProColumns<HTTPFirewallPolicy>[] = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      search: false,
    },
    {
      title: "策略名称",
      dataIndex: "name",
      render: (dom, policy) => <Link to={`/servers/waf/policy/${policy.id}`}>{dom}</Link>,
      search: false,
    },
    {
      title: "关键词",
      dataIndex: "keyword",
      hideInTable: true,
    },
    {
      title: "入站规则分组",
      dataIndex: "countInboundGroups",
      search: false,
    },
    {
      title: "出站规则分组",
      dataIndex: "countOutboundGroups",
      search: false,
    },
    {
      title: "集群数量",
      dataIndex: "countClusters",
      search: false,
      render: (_, policy) => <Link to={`/clusters?httpFirewallPolicyId=${policy.id ?? 0n}`}>{policy.countClusters ?? 0}</Link>,
    },
    {
      title: "状态",
      dataIndex: "mode",
      search: false,
      render: (_, policy) => {
        if (!policy.isOn) {
          return <Tag color="red">已停用</Tag>;
        }

        switch (policy.mode) {
          case "defend":
            return <Tag color="green">防御模式</Tag>;
          case "observe":
            return <Tag color="blue">观察模式</Tag>;
          case "bypass":
            return <Tag>通过模式</Tag>;
          default:
            return <Tag>{policy.mode}</Tag>;
        }
      },
    },
    {
      title: "操作",
      valueType: "option",
      key: "action",
      width: 130,
      render: (_, policy) => (
        <Space size="small">
          <TableActionIcon tooltip="修改" icon={<FormOutlined />} onClick={() => navigate(`/servers/waf/policy/${policy.id}`)} />
          <Popconfirm title="确定删除此WAF策略吗？" onConfirm={() => onDelete(policy.id ?? "0")}>
            <TableActionIcon tooltip="删除" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "WAF策略" }}
      extra={[
        <Button
          key="create"
          type="primary"
          onClick={() => {
            /* TODO: 创建策略逻辑 */
          }}
        >
          创建策略
        </Button>,
      ]}
    >
      <ProTable<HTTPFirewallPolicy>
        columns={columns}
        dataSource={data?.httpFirewallPolicies}
        loading={loading}
        rowKey="id"
        onChange={onTableChange}
        options={{
          density: true,
          fullScreen: true,
          reload: () => {
            void query.refetch();
          },
          setting: true,
        }}
        search={{
          labelWidth: "auto",
        }}
        form={{
          initialValues: {
            keyword: params.keyword,
          },
        }}
        onSubmit={(values) => {
          const newSearchParams = new URLSearchParams({
            ...params,
            page: "1",
            size: String(params.size),
            keyword: values.keyword ?? "",
          });
          navigate(`?${newSearchParams.toString()}`);
        }}
        onReset={() => {
          const newSearchParams = new URLSearchParams({
            ...params,
            page: "1",
            size: String(params.size),
            keyword: "",
          });
          navigate(`?${newSearchParams.toString()}`);
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          pageSize: Number(params.size),
          current: Number(params.page),
          total: Number(data?.total),
        }}
      />
    </PageContainer>
  );
}
