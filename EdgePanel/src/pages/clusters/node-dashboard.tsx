import { PageContainer, StatisticCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Badge, Col, Row, Space, theme } from "antd";
import { useLocation, useNavigate, useParams } from "@umijs/max";
import { getNodeTabList } from "./_shared/nodeTabList";
import type { ComposeServerStatNodeBoardResponse } from "@/pb/service_server_stat_board_pb";
import type { Node } from "@/pb/models/model_node_pb";
import { clusterQueryKeys } from "@/queries/keys";
import { getNodeBoard } from "@/services/clusters";
import { formatBytesSimple } from "@/utils";
import {
  dashboardCardStyle,
  dashboardStatisticStyles,
  dashboardStatisticValueStyle,
  NodeValueChart,
  TrafficTrendChart,
  RequestTrendChart,
  MetricChartGrid,
} from "@/components/dashboard";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const responsiveProps = { xs: 24, sm: 12, md: 8, lg: 6, xl: { flex: 1 } };
const firstRowResponsiveProps = { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 };

export default function NodeDashboard() {
  const { nodeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const query = useQuery<{
    node?: Node;
    board: ComposeServerStatNodeBoardResponse;
  }>({
    queryKey: clusterQueryKeys.nodeBoard(nodeId),
    queryFn: () => getNodeBoard(nodeId),
    enabled: Boolean(nodeId),
  });
  const data = query.data;
  const pageContainerLoading = query.isPending && !query.data;

  const node = data?.node;
  const board = data?.board;

  if (!node || !board) {
    return null;
  }

  const {
    isActive,
    cpuUsage,
    memoryUsage,
    memoryTotalSize,
    load,
    trafficInBytes,
    trafficOutBytes,
    countRequests,
    countAttackRequests,
    countConnections,
    cacheDiskSize,
    cacheMemorySize,
    monthlyTrafficBytes,
    dailyTrafficBytes,
    lastDailyTrafficBytes,
  } = board;

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: node?.name,
        fallbackEntityLabel: "节点",
        tabList: getNodeTabList(nodeId!),
      })}
      header={{ title: node?.name || "节点看板" }}
      tabList={getNodeTabList(nodeId!)}
      tabActiveKey={location.pathname}
      loading={pageContainerLoading}
      onTabChange={(key) => navigate(key)}
    >
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col {...firstRowResponsiveProps}>
            <StatisticCard
              style={dashboardCardStyle}
              statistic={{
                title: "节点状态",
                value: isActive ? "运行中" : "离线",
                styles: dashboardStatisticStyles,
                valueRender: (val) => (
                  <Space>
                    <Badge status={isActive ? "success" : "error"} />
                    <span style={{ color: isActive ? "#52c41a" : "#ff4d4f" }}>{val}</span>
                  </Space>
                ),
              }}
            />
          </Col>
          <Col {...firstRowResponsiveProps}>
            <StatisticCard
              style={dashboardCardStyle}
              statistic={{ title: "CPU", value: `${(Number(cpuUsage || 0) * 100).toFixed(2)}%`, styles: dashboardStatisticStyles }}
            />
          </Col>
          <Col {...firstRowResponsiveProps}>
            <StatisticCard
              style={dashboardCardStyle}
              statistic={{
                title: "内存",
                value: `${(Number(memoryUsage || 0) * 100).toFixed(2)}%`,
                styles: dashboardStatisticStyles,
                valueRender: (val) => (
                  <Space size={6} align="baseline">
                    <span>{val}</span>
                    {memoryTotalSize ? (
                      <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>总内存 {formatBytesSimple(memoryTotalSize)}</span>
                    ) : null}
                  </Space>
                ),
              }}
            />
          </Col>
          <Col {...firstRowResponsiveProps}>
            <StatisticCard
              style={dashboardCardStyle}
              statistic={{ title: "负载", value: load ? load.toFixed(2) : "0.00", styles: dashboardStatisticStyles }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {[
            ["总请求量", Number(countRequests || 0).toLocaleString()],
            ["攻击请求", Number(countAttackRequests || 0).toLocaleString()],
            ["并发连接", Number(countConnections || 0).toLocaleString()],
            ["接收流量", formatBytesSimple(trafficInBytes || 0)],
            ["发送流量", formatBytesSimple(trafficOutBytes || 0)],
          ].map(([title, value]) => (
            <Col key={title} {...responsiveProps}>
              <StatisticCard
                style={dashboardCardStyle}
                statistic={{
                  title,
                  value,
                  styles: {
                    content: {
                      ...dashboardStatisticValueStyle,
                      ...(title === "攻击请求" && (countAttackRequests || 0) > 0 ? { color: "#cf1322" } : {}),
                    },
                  },
                }}
              />
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          {[
            ["当月流量", formatBytesSimple(monthlyTrafficBytes || 0)],
            ["当日流量", formatBytesSimple(dailyTrafficBytes || 0)],
            ["昨日流量", formatBytesSimple(lastDailyTrafficBytes || 0)],
            ["缓存磁盘", formatBytesSimple(cacheDiskSize || 0)],
            ["缓存内存", formatBytesSimple(cacheMemorySize || 0)],
          ].map(([title, value]) => (
            <Col key={title} {...responsiveProps}>
              <StatisticCard style={dashboardCardStyle} statistic={{ title, value, styles: dashboardStatisticStyles }} />
            </Col>
          ))}
        </Row>

        <NodeValueChart title="资源监控" cpuValues={board.cpuNodeValues} memoryValues={board.memoryNodeValues} loadValues={board.loadNodeValues} />

        <TrafficTrendChart hourlyTrafficStats={board.hourlyTrafficStats} dailyTrafficStats={board.dailyTrafficStats} />

        <RequestTrendChart hourlyTrafficStats={board.hourlyTrafficStats} dailyTrafficStats={board.dailyTrafficStats} showDailyIPs={false} />

        <MetricChartGrid metricDataCharts={board.metricDataCharts} />
      </Space>
    </PageContainer>
  );
}
