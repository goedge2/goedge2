import { BarChartOutlined } from "@ant-design/icons";
import { PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Card, Result } from "antd";
import { useLocation, useNavigate, useParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { getServerSettings } from "@/services/servers";
import { getServerTabList } from "./_shared/serverTabList";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

export default function ServerStats() {
  const { serverId } = useParams<{ serverId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery<{ server?: { name?: string } }>({
    queryKey: serverQueryKeys.stats(serverId),
    queryFn: () => getServerSettings(serverId),
    enabled: Boolean(serverId),
  });
  const data = query.data;
  const pageContainerLoading = query.isPending && !query.data;

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.server?.name,
        currentLabel: "统计",
        fallbackEntityLabel: "网站",
        tabList: getServerTabList(serverId!),
      })}
      header={{ title: data?.server?.name || "统计" }}
      tabList={getServerTabList(serverId!)}
      tabActiveKey={location.pathname}
      loading={pageContainerLoading}
      onTabChange={(key) => navigate(key)}
    >
      <Card>
        <Result icon={<BarChartOutlined style={{ fontSize: 48 }} />} title="统计" subTitle="功能开发中..." />
      </Card>
    </PageContainer>
  );
}
