import { PageContainer, StatisticCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Row, Col, theme } from "antd";
import { CloudServerOutlined, UserOutlined, ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "@umijs/max";
import { getClusterTabList } from "./_shared/clusterTabList";
import { clusterQueryKeys } from "@/queries/keys";
import { getClusterBoard } from "@/services/clusters";
import { formatBytesSimple } from "@/utils";
import {
  dashboardCardStyle,
  dashboardStatisticStyles,
  NodeValueChart,
  TrafficTrendChart,
  RequestTrendChart,
  TopRankingChart,
  MetricChartGrid,
} from "@/components/dashboard";
import type { ComposeServerStatNodeClusterBoardResponse } from "@/pb/service_server_stat_board_pb";
import type { NodeCluster } from "@/pb/models/model_node_cluster_pb";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const responsiveProps = { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 };
export default function ClusterDashboard() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery<{
    nodeCluster: NodeCluster;
    board: ComposeServerStatNodeClusterBoardResponse;
  }>({
    queryKey: clusterQueryKeys.board(clusterId),
    queryFn: () => getClusterBoard(clusterId),
    enabled: Boolean(clusterId),
  });
  const data = query.data;
  const { token } = theme.useToken();
  const pageContainerLoading = query.isPending && !query.data;

  const board = data?.board;

  const statsData = [
    {
      title: "在线节点",
      value: Number(board?.countActiveNodes || 0),
      styles: dashboardStatisticStyles,
      icon: <CheckCircleOutlined style={{ fontSize: "24px", color: token.colorSuccess }} />,
    },
    {
      title: "离线节点",
      value: Number(board?.countInactiveNodes || 0),
      styles: dashboardStatisticStyles,
      icon: <CloseCircleOutlined style={{ fontSize: "24px", color: token.colorError }} />,
    },
    {
      title: "服务数量",
      value: Number(board?.countServers || 0),
      styles: dashboardStatisticStyles,
      icon: <CloudServerOutlined style={{ fontSize: "24px", color: token.colorInfo }} />,
    },
    {
      title: "用户数量",
      value: Number(board?.countUsers || 0),
      styles: dashboardStatisticStyles,
      icon: <UserOutlined style={{ fontSize: "24px", color: token.colorWarning }} />,
    },
    {
      title: "当月流量",
      value: formatBytesSimple(Number(board?.monthlyTrafficBytes || 0)),
      styles: dashboardStatisticStyles,
      icon: <ThunderboltOutlined style={{ fontSize: "24px", color: token.colorPrimary }} />,
    },
    {
      title: "当天流量",
      value: formatBytesSimple(Number(board?.dailyTrafficBytes || 0)),
      styles: dashboardStatisticStyles,
      icon: <ThunderboltOutlined style={{ fontSize: "24px", color: token.colorError }} />,
    },
    {
      title: "昨日流量",
      value: formatBytesSimple(Number(board?.lastDailyTrafficBytes || 0)),
      styles: dashboardStatisticStyles,
      icon: <HistoryOutlined style={{ fontSize: "24px", color: token.colorTextSecondary }} />,
    },
  ];

  const rankingTabs = [
    {
      key: "node",
      label: "节点",
      data:
        board?.topNodeStats?.map((s) => ({
          name: s.nodeName,
          bytes: s.bytes,
        })) || [],
    },
  ];

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.nodeCluster?.name,
        fallbackEntityLabel: "集群",
        tabList: getClusterTabList(clusterId!),
      })}
      header={{ title: data?.nodeCluster?.name || "集群看板" }}
      tabList={getClusterTabList(clusterId!)}
      tabActiveKey={location.pathname}
      loading={pageContainerLoading}
      onTabChange={(key) => navigate(key)}
    >
      <Row gutter={[16, 16]}>
        {statsData.map((stat, i) => (
          <Col key={i} {...responsiveProps}>
            <StatisticCard style={dashboardCardStyle} statistic={stat} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <NodeValueChart
            title="集群资源监控"
            cpuValues={board?.cpuNodeValues}
            memoryValues={board?.memoryNodeValues}
            loadValues={board?.loadNodeValues}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <TrafficTrendChart hourlyTrafficStats={board?.hourlyTrafficStats} dailyTrafficStats={board?.dailyTrafficStats} />
        </Col>
        <Col xs={24} lg={12}>
          <RequestTrendChart hourlyTrafficStats={board?.hourlyTrafficStats} dailyTrafficStats={board?.dailyTrafficStats} showDailyIPs={false} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TopRankingChart tabs={rankingTabs} />
        </Col>
      </Row>

      <MetricChartGrid metricDataCharts={board?.metricDataCharts} />
    </PageContainer>
  );
}
