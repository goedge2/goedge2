import type { ComposeAdminDashboardResponse } from "@/pb/service_admin_pb";
import type { SumAllNodeValueStatsResponse } from "@/pb/service_node_value_pb";
import { Card, Col, Row, Button, Tooltip, theme } from "antd";
import { StatisticCard, PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { request } from "@umijs/max";
import dayjs from "dayjs";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
const { Statistic } = StatisticCard;
import {
  ClusterOutlined,
  CloudServerOutlined,
  ApiOutlined,
  GlobalOutlined,
  LineChartOutlined,
  HistoryOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { dashboardQueryKeys } from "@/queries/keys";
import { getDashboardData } from "@/services/dashboard";
import { formatBytesSimple } from "@/utils";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Chart } from "@/components/Chart";
import { EChartsOption } from "echarts";
import {
  dashboardCardStyle,
  dashboardStatisticStyles,
  TrafficTrendChart,
  RequestTrendChart,
  TopRankingChart,
  MetricChartGrid,
} from "@/components/dashboard";

const responsiveProps = { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 };

const formatLastUpdated = (lastUpdated: Date | null, now: number) => {
  if (!lastUpdated) return "-";

  const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdated.getTime()) / 1000));
  if (elapsedSeconds <= 30 * 60) {
    if (elapsedSeconds < 60) return `${elapsedSeconds} 秒前`;
    return `${Math.floor(elapsedSeconds / 60)} 分钟前`;
  }

  return dayjs(lastUpdated).format("HH:mm:ss");
};

const LastUpdated = ({ lastUpdated }: { lastUpdated: Date | null }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lastUpdated) return;

    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  return <span>{formatLastUpdated(lastUpdated, now)}</span>;
};

const LiveMonitor = () => {
  const { token } = theme.useToken();
  const [stats, setStats] = useState<SumAllNodeValueStatsResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [bandwidthBytes, setBandwidthBytes] = useState({ current: 0, previous: 0 });

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await request<SumAllNodeValueStatsResponse>("/api/node-values/all-node-stats");
      setStats(res);
      const nextBandwidth = Number(res.totalTrafficBytesPerSecond || 0);
      setBandwidthBytes((current) => ({
        current: nextBandwidth,
        previous: current.current,
      }));
      setLastUpdated(new Date());
    } finally {
      if (isManual) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const res = await request<SumAllNodeValueStatsResponse>("/api/node-values/all-node-stats");
        setStats(res);
        const nextBandwidth = Number(res.totalTrafficBytesPerSecond || 0);
        setBandwidthBytes((current) => ({
          current: nextBandwidth,
          previous: current.current,
        }));
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to load node stats:", error);
      }
    };

    void loadInitialData();
    const timer = setInterval(() => {
      void fetchData();
    }, 1000 * 30); // 每30秒刷新一次
    return () => clearInterval(timer);
  }, [fetchData]);

  const { bandwidthOption, cpuOption, memoryOption, loadOption } = useMemo(() => {
    const cpuUsage = Number(stats?.avgCPUUsage || 0) * 100;
    const cpuMax = Number(stats?.maxCPUUsage || 0) * 100;
    const memoryUsage = Number(stats?.avgMemoryUsage || 0) * 100;
    const memoryMax = Number(stats?.maxMemoryUsage || 0) * 100;
    const load = Number(stats?.avgLoad1min || 0);
    const maxLoad = Number(stats?.maxLoad1min || 0);
    const cores = Number(stats?.totalCPUCores || 1);
    const totalMemory = Number(stats?.totalMemoryBytes || 0);

    // Load normalized for Gauge (assuming max reasonable load is 20 or core count based,
    // but index.js logic caps visual max at 20 or 10)
    let avgLoadDisplay = Math.round(load * 100) / 100;
    let maxLoadDisplay = Math.round(maxLoad * 100) / 100;

    // Logic from index.js renderLoadGauge
    if (avgLoadDisplay > 10) avgLoadDisplay = 10;
    if (maxLoadDisplay > 20) maxLoadDisplay = 20; // Visual cap

    // Bandwidth handling
    const currentBandwidthBytes = Number(stats?.totalTrafficBytesPerSecond || 0);
    const bandwidthBits = currentBandwidthBytes * 8;

    const bandwidthMax = Math.max(1_000_000, Math.ceil((bandwidthBits * 1.2) / 1_000_000) * 1_000_000);

    const formatBits = (bits: number) => {
      if (bits < 1000) return bits + " bps";
      if (bits < 1000 * 1000) return (bits / 1000).toFixed(1) + " Kbps";
      if (bits < 1000 * 1000 * 1000) return (bits / 1000 / 1000).toFixed(1) + " Mbps";
      return (bits / 1000 / 1000 / 1000).toFixed(1) + " Gbps";
    };

    // Color logic from index.js
    const getChartColor = (colorName: string) => {
      if (colorName === "red") return token.colorError;
      if (colorName === "yellow") return token.colorWarning;
      if (colorName === "green") return token.colorSuccess;
      return token.colorPrimary;
    };

    // Bandwidth Color
    let bandwidthColorName = ""; // Default
    const lastBandwidth = bandwidthBytes.previous;
    if (lastBandwidth > 0 && lastBandwidth !== currentBandwidthBytes) {
      const delta = (Math.abs(lastBandwidth - currentBandwidthBytes) * 100) / lastBandwidth;
      if (delta > 20) bandwidthColorName = "red";
      else if (delta > 10) bandwidthColorName = "yellow";
    }
    const bandwidthColor = bandwidthColorName ? getChartColor(bandwidthColorName) : token.colorPrimary;

    // CPU Color
    let cpuColorName = "green";
    if (cpuUsage > 50) cpuColorName = "red";
    else if (cpuUsage > 20) cpuColorName = "yellow";
    const cpuColor = getChartColor(cpuColorName);

    let cpuMaxColorName = "green";
    if (cpuMax > 50) cpuMaxColorName = "red";
    else if (cpuMax > 20) cpuMaxColorName = "yellow";
    const cpuMaxColor = getChartColor(cpuMaxColorName);

    // Memory Color
    let memColorName = "green";
    if (memoryUsage > 80) memColorName = "red";
    else if (memoryUsage > 60) memColorName = "yellow";
    const memColor = getChartColor(memColorName);

    let memMaxColorName = "green";
    if (memoryMax > 80) memMaxColorName = "red";
    else if (memoryMax > 60) memMaxColorName = "yellow";
    const memMaxColor = getChartColor(memMaxColorName);

    // Load Color
    // index.js: avg > 20 red, > 5 yellow.
    let loadColorName = "green";
    if (load > 20) loadColorName = "red";
    else if (load > 5) loadColorName = "yellow";
    const loadColor = getChartColor(loadColorName);

    let loadMaxColorName = "green";
    if (maxLoad > 20) loadMaxColorName = "red";
    else if (maxLoad > 5) loadMaxColorName = "yellow";
    const loadMaxColor = getChartColor(loadMaxColorName);

    const percentGaugeOption = (
      name: string,
      val: number,
      maxVal: number,
      color: string,
      maxColor: string,
      unit: string,
      total: number,
      detailFormatter: (v: number) => string,
    ): EChartsOption => {
      return {
        series: [
          {
            type: "gauge",
            name: "平均",
            radius: "100%",
            startAngle: 270,
            endAngle: -89.9,
            min: 0,
            max: total,
            splitNumber: 10,
            pointer: { show: false },
            progress: { show: true, width: 6, itemStyle: { color: color } },
            axisLine: { show: true, lineStyle: { width: 6, color: [[1, token.colorBorderSecondary]] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { valueAnimation: true, fontSize: 16, offsetCenter: [0, "0%"], color: token.colorText, formatter: () => detailFormatter(val) },
            data: [{ value: val, name: name }],
            title: { show: false },
          },
          {
            type: "gauge",
            name: "最大",
            radius: "100%",
            startAngle: 270,
            endAngle: -89.9,
            min: 0,
            max: total,
            pointer: { show: false },
            progress: { show: true, width: 6, itemStyle: { color: maxColor, opacity: 0.3 } },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { show: false },
            data: [{ value: maxVal, name: "最大" }],
            title: { show: false },
          },
        ],
        tooltip: {
          trigger: "item",
          formatter: (params) => {
            const item = Array.isArray(params) ? params[0] : params;
            return `${item?.seriesName}: ${String(item?.value ?? "")}${unit}`;
          },
        },
      };
    };

    return {
      bandwidthOption: {
        series: [
          {
            type: "gauge",
            startAngle: 240,
            endAngle: -60,
            min: 0,
            max: bandwidthMax,
            splitNumber: 5,
            radius: "90%",
            center: ["50%", "60%"],
            axisLine: { lineStyle: { width: 4, color: [[1, token.colorBorder]] } },
            progress: { show: true, width: 4, itemStyle: { color: bandwidthColor } },
            pointer: { show: true, width: 2, length: "60%", itemStyle: { color: token.colorTextSecondary } },
            axisTick: { show: true, distance: -4, length: 4, lineStyle: { width: 1, color: token.colorBorder } },
            splitLine: { show: true, distance: -4, length: 8, lineStyle: { width: 1, color: token.colorBorder } },
            axisLabel: {
              distance: 12,
              color: token.colorTextSecondary,
              fontSize: 10,
              formatter: (value: number) => {
                if (value >= 1e9) return Number((value / 1e9).toFixed(1)) + "G";
                if (value >= 1e6) return Number((value / 1e6).toFixed(1)) + "M";
                if (value >= 1e3) return Number((value / 1e3).toFixed(1)) + "K";
                return value + "";
              },
            },
            detail: {
              valueAnimation: true,
              formatter: () => formatBits(bandwidthBits),
              color: token.colorText,
              fontSize: 14,
              offsetCenter: [0, "40%"],
            },
            data: [{ value: bandwidthBits, name: "" }],
          },
        ],
      } as EChartsOption,

      cpuOption: percentGaugeOption("CPU", cpuUsage, cpuMax, cpuColor, cpuMaxColor, "%", 100, (v) => v.toFixed(1) + "%\n" + cores + "核"),

      memoryOption: percentGaugeOption(
        "内存",
        memoryUsage,
        memoryMax,
        memColor,
        memMaxColor,
        "%",
        100,
        () => formatBytesSimple(Number(stats?.totalMemoryBytes || 0) * (memoryUsage / 100)) + "\n" + formatBytesSimple(totalMemory),
      ),

      loadOption: percentGaugeOption("负载", avgLoadDisplay, maxLoadDisplay, loadColor, loadMaxColor, "", 20, (v) => v.toFixed(2)),
    };
  }, [bandwidthBytes.previous, stats, token]);

  return (
    <Card
      title="实时监控"
      // bordered={false}
      style={{ marginTop: 16 }}
      styles={{
        header: { borderBottom: 0, paddingLeft: 16, paddingRight: 16 },
        body: { padding: 16, paddingTop: 0 },
      }}
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            上次更新: <LastUpdated lastUpdated={lastUpdated} />
          </span>
          <Tooltip title="立即刷新">
            <Button type="text" icon={<ReloadOutlined spin={loading} />} onClick={() => fetchData(true)} />
          </Tooltip>
        </div>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ textAlign: "center", marginBottom: 8, color: token.colorTextSecondary }}>带宽使用</div>
          <Chart option={bandwidthOption} style={{ height: 180 }} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ textAlign: "center", marginBottom: 8, color: token.colorTextSecondary }}>CPU使用率</div>
          <Chart option={cpuOption} style={{ height: 180 }} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ textAlign: "center", marginBottom: 8, color: token.colorTextSecondary }}>内存使用率</div>
          <Chart option={memoryOption} style={{ height: 180 }} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ textAlign: "center", marginBottom: 8, color: token.colorTextSecondary }}>系统负载</div>
          <Chart option={loadOption} style={{ height: 180 }} />
        </Col>
      </Row>
    </Card>
  );
};

export default function Dashboard() {
  const { token } = theme.useToken();
  const query = useQuery<ComposeAdminDashboardResponse>({
    queryKey: dashboardQueryKeys.summary(),
    queryFn: getDashboardData,
  });
  const data = query.data;
  const pageContainerLoading = query.isPending && !query.data;

  const { todayTraffic, todayCountIPs, yesterdayTraffic, weekTraffic, trafficTrend } = useMemo(() => {
    if (!data?.dailyTrafficStats) {
      return {
        todayTraffic: "",
        todayCountIPs: 0,
        yesterdayTraffic: "",
        weekTraffic: "",
        trafficTrend: { value: 0, direction: "flat" as "up" | "down" | "flat" },
      };
    }

    const dailyTrafficStats = data.dailyTrafficStats;

    // 今日流量
    const lastDailyTrafficState = dailyTrafficStats[dailyTrafficStats.length - 1];
    const todayBytes = Number(lastDailyTrafficState?.bytes || 0);
    const todayTraffic = formatBytesSimple(todayBytes);
    const todayCountIPs = lastDailyTrafficState ? Number(lastDailyTrafficState.countIPs) : 0;

    // 昨日流量
    const yesterdayTrafficState = dailyTrafficStats[dailyTrafficStats.length - 2];
    const yesterdayBytes = Number(yesterdayTrafficState?.bytes || 0);
    const yesterdayTraffic = formatBytesSimple(yesterdayBytes);

    // 近7日流量
    const last7DaysTraffic = dailyTrafficStats.slice(-7).reduce((sum, stat) => sum + Number(stat.bytes), 0);
    const weekTraffic = formatBytesSimple(last7DaysTraffic);

    // 计算环比
    let trendValue = 0;
    let trendDirection: "up" | "down" | "flat" = "flat";

    if (yesterdayBytes > 0) {
      const diff = todayBytes - yesterdayBytes;
      trendValue = Math.abs((diff / yesterdayBytes) * 100);
      trendDirection = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    } else if (todayBytes > 0) {
      trendDirection = "up";
      trendValue = 100;
    }

    return {
      todayTraffic,
      todayCountIPs,
      yesterdayTraffic,
      weekTraffic,
      trafficTrend: { value: trendValue, direction: trendDirection },
    };
  }, [data]);

  const rankingTabs = useMemo(() => {
    return [
      {
        key: "domain",
        label: "域名",
        data: data?.topDomainStats?.map((s) => ({ name: s.domain || "未知", bytes: s.bytes })) || [],
      },
      {
        key: "node",
        label: "节点",
        data: data?.topNodeStats?.map((s) => ({ name: s.nodeName || "未知", bytes: s.bytes })) || [],
      },
      {
        key: "country",
        label: "地区",
        data: data?.topCountryStats?.map((s) => ({ name: s.countryName || "未知", bytes: s.bytes })) || [],
      },
    ];
  }, [data]);

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })}
      header={{ title: "数据看板" }}
      loading={pageContainerLoading}
    >
      <Row gutter={[16, 16]} wrap>
        {[
          {
            title: "集群",
            value: Number(data?.countNodeClusters ?? 0),
            suffix: "个",
            styles: dashboardStatisticStyles,
            icon: <ClusterOutlined style={{ fontSize: "24px", color: token.colorPrimary }} />,
          },
          {
            title: "边缘节点",
            value: Number(data?.countNodes ?? 0),
            suffix: "个",
            styles: dashboardStatisticStyles,
            icon: <CloudServerOutlined style={{ fontSize: "24px", color: token.colorSuccess }} />,
          },
          {
            title: "API节点",
            value: Number(data?.countAPINodes ?? 0),
            suffix: "个",
            styles: dashboardStatisticStyles,
            icon: <ApiOutlined style={{ fontSize: "24px", color: token.colorPrimary }} />,
          },
          {
            title: "网站",
            value: Number(data?.countServers ?? 0),
            suffix: "个",
            styles: dashboardStatisticStyles,
            icon: <GlobalOutlined style={{ fontSize: "24px", color: token.colorInfo }} />,
          },
          {
            title: "近7日流量",
            value: weekTraffic,
            styles: dashboardStatisticStyles,
            icon: <LineChartOutlined style={{ fontSize: "24px", color: token.colorPrimary }} />,
          },
          {
            title: "昨日流量",
            value: yesterdayTraffic,
            styles: dashboardStatisticStyles,
            icon: <HistoryOutlined style={{ fontSize: "24px", color: token.colorInfo }} />,
          },
          {
            title: "当天独立IP",
            value: todayCountIPs,
            styles: dashboardStatisticStyles,
            icon: <EnvironmentOutlined style={{ fontSize: "24px", color: token.colorWarning }} />,
          },
        ].map((stat, i) => (
          <Col {...responsiveProps} key={i}>
            <StatisticCard style={dashboardCardStyle} statistic={stat} />
          </Col>
        ))}
        <Col {...responsiveProps}>
          <StatisticCard
            style={dashboardCardStyle}
            statistic={{
              title: "当天流量",
              value: todayTraffic,
              styles: dashboardStatisticStyles,
              icon: <ThunderboltOutlined style={{ fontSize: "24px", color: token.colorError }} />,
              description: (
                <Statistic
                  value={trafficTrend.value}
                  precision={2}
                  styles={{
                    content: {
                      color:
                        trafficTrend.direction === "up"
                          ? token.colorError
                          : trafficTrend.direction === "down"
                            ? token.colorSuccess
                            : token.colorTextSecondary,
                      fontSize: 12,
                      lineHeight: "20px",
                    },
                  }}
                  prefix={trafficTrend.direction === "up" ? <ArrowUpOutlined /> : trafficTrend.direction === "down" ? <ArrowDownOutlined /> : null}
                  suffix="%"
                />
              ),
            }}
          />
        </Col>
      </Row>

      <LiveMonitor />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <TrafficTrendChart hourlyTrafficStats={data?.hourlyTrafficStats} dailyTrafficStats={data?.dailyTrafficStats} />
        </Col>
        <Col xs={24} lg={12}>
          <RequestTrendChart hourlyTrafficStats={data?.hourlyTrafficStats} dailyTrafficStats={data?.dailyTrafficStats} showDailyIPs={true} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TopRankingChart tabs={rankingTabs} />
        </Col>
      </Row>

      <MetricChartGrid metricDataCharts={data?.metricDataCharts} />
    </PageContainer>
  );
}
