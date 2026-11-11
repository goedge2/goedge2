import { FieldTimeOutlined, LineChartOutlined, BarChartOutlined, HistoryOutlined, EnvironmentOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
import { PageContainer, StatisticCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row, theme } from "antd";
import { useLocation, useNavigate, useParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { getServerBoard } from "@/services/servers";
import { getServerTabList } from "./_shared/serverTabList";
import type { Server } from "@/pb/models/model_server_pb";
import type { ComposeServerStatBoardResponse } from "@/pb/service_server_stat_board_pb";
import { formatBytesSimple } from "@/utils";
import { useMemo } from "react";
import {
  BandwidthChart,
  dashboardCardStyle,
  dashboardStatisticStyles,
  TrafficTrendChart,
  RequestTrendChart,
  TopRankingChart,
  MetricChartGrid,
} from "@/components/dashboard";

export default function ServerDashboard() {
  const { serverId } = useParams<{ serverId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const query = useQuery<{ server: Server; board: ComposeServerStatBoardResponse }>({
    queryKey: serverQueryKeys.board(serverId),
    queryFn: () => getServerBoard(serverId),
    enabled: Boolean(serverId),
  });
  const pageContainerLoading = query.isPending && !query.data;

  const data = query.data;
  const board = data?.board;

  const formatBandwidth = (bytes?: bigint | number | string) => {
    if (!bytes) return "0 bps";
    const bits = Number(bytes) * 8;
    if (bits < 1000) return bits.toFixed(0) + " bps";
    if (bits < 1000 * 1000) return (bits / 1000).toFixed(2) + " Kbps";
    if (bits < 1000 * 1000 * 1000) return (bits / 1000 / 1000).toFixed(2) + " Mbps";
    if (bits < 1000 * 1000 * 1000 * 1000) return (bits / 1000 / 1000 / 1000).toFixed(2) + " Gbps";
    return (bits / 1000 / 1000 / 1000 / 1000).toFixed(2) + " Tbps";
  };

  const responsiveProps = { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 };
  const rankingTabs = useMemo(() => {
    return [
      {
        key: "country",
        label: "地区",
        data: board?.topCountryStats?.map((s) => ({ name: s.countryName || "未知", bytes: s.bytes })) || [],
      },
      {
        key: "node",
        label: "节点",
        data: board?.topNodeStats?.map((s) => ({ name: s.nodeName || "未知", bytes: s.bytes })) || [],
      },
    ];
  }, [board]);

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.server?.name,
        fallbackEntityLabel: "网站",
        tabList: getServerTabList(serverId!),
      })}
      header={{ title: data?.server?.name || "网站看板" }}
      tabList={getServerTabList(serverId!)}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
      loading={pageContainerLoading}
    >
      <Row gutter={[16, 16]} wrap>
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "当前带宽",
              value: formatBandwidth(board?.minutelyPeekBandwidthBytes),
              styles: dashboardStatisticStyles,
              icon: <FieldTimeOutlined style={{ fontSize: "24px", color: token.colorPrimary }} />,
            }}
          />
        </Col>
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "当天带宽峰值",
              value: formatBandwidth(board?.dailyPeekBandwidthBytes),
              styles: dashboardStatisticStyles,
              icon: <LineChartOutlined style={{ fontSize: "24px", color: token.colorSuccess }} />,
            }}
          />
        </Col>
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "当月带宽峰值",
              value: formatBandwidth(board?.monthlyPeekBandwidthBytes),
              styles: dashboardStatisticStyles,
              icon: <BarChartOutlined style={{ fontSize: "24px", color: token.colorInfo }} />,
            }}
          />
        </Col>
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "上个月带宽峰值",
              value: formatBandwidth(board?.lastMonthlyPeekBandwidthBytes),
              styles: dashboardStatisticStyles,
              icon: <HistoryOutlined style={{ fontSize: "24px", color: token.colorWarning }} />,
            }}
          />
        </Col>
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "当天独立IP",
              value: Number(board?.dailyCountIPs || 0),
              styles: dashboardStatisticStyles,
              icon: <EnvironmentOutlined style={{ fontSize: "24px", color: token.colorWarning }} />,
            }}
          />
        </Col>
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "当天流量",
              value: formatBytesSimple(board?.dailyTrafficBytes || 0),
              styles: dashboardStatisticStyles,
              icon: <ThunderboltOutlined style={{ fontSize: "24px", color: token.colorError }} />,
            }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <BandwidthChart
          bandwidthStats={board?.minutelyBandwidthStats}
          nthBandwidthStat={board?.minutelyNthBandwidthStat}
          percentile={Number(board?.bandwidthPercentile || 0) || undefined}
        />
      </div>

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

      {board?.metricDataCharts && board.metricDataCharts.length > 0 && <MetricChartGrid metricDataCharts={board.metricDataCharts} />}
    </PageContainer>
  );
}
