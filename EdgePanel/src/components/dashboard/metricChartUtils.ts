import type { EChartsOption } from "echarts";
import type { MetricChart } from "@/pb/models/model_metric_chart_pb";
import type { MetricStat } from "@/pb/models/model_metric_stat_pb";

export type FormatMetricChartBytes = (bytes: number) => string;

const metricValueNames: Record<string, { name: string; isTraffic: boolean }> = {
  "${countRequest}": { name: "请求数", isTraffic: false },
  "${countConnection}": { name: "连接数", isTraffic: false },
  "${countTrafficOut}": { name: "下行流量", isTraffic: true },
  "${countTrafficIn}": { name: "上行流量", isTraffic: true },
};

export interface MetricChartViewModel {
  id: bigint | number | string | undefined;
  chart: MetricChart | undefined;
  title: string;
  metricItemName: string;
  type: string;
  stats: MetricStat[];
  valueName: string;
  isTraffic: boolean;
}

export const formatMetricChartTime = (time: string, periodUnit: string) => {
  if (!time) return "";
  if (periodUnit === "month" || periodUnit === "week") return `${time.substring(0, 4)}-${time.substring(4, 6)}`;
  if (periodUnit === "day") return `${time.substring(0, 4)}-${time.substring(4, 6)}-${time.substring(6, 8)}`;
  if (periodUnit === "hour") return `${time.substring(0, 4)}-${time.substring(4, 6)}-${time.substring(6, 8)} ${time.substring(8, 10)}`;
  if (periodUnit === "minute")
    return `${time.substring(0, 4)}-${time.substring(4, 6)}-${time.substring(6, 8)} ${time.substring(8, 10)}:${time.substring(10, 12)}`;
  return time;
};

export const prepareMetricChart = (metricChart: MetricChart | undefined, metricStats: MetricStat[] | undefined): MetricChartViewModel => {
  const limit = Number(metricChart?.maxItems || 0);
  const stats = [...(metricStats || [])];
  const valueDefinition = metricValueNames[metricChart?.metricItem?.value || ""];

  return {
    id: metricChart?.id,
    chart: metricChart,
    title: metricChart?.name || "",
    metricItemName: metricChart?.metricItem?.name || "",
    type: metricChart?.type || "bar",
    stats: limit > 0 ? stats.slice(0, limit) : stats.slice(0, 10),
    valueName: valueDefinition?.name || "",
    isTraffic: valueDefinition?.isTraffic || false,
  };
};

export const buildMetricChartOption = (
  metricChart: MetricChartViewModel,
  colorPrimary: string,
  formatBytes: FormatMetricChartBytes,
): EChartsOption => {
  const { chart, isTraffic, stats, title, type } = metricChart;
  const valueFormatter = (value: unknown) => (isTraffic ? formatBytes(Number(value)) : String(value ?? ""));

  if (type === "pie") {
    const data = stats.map((stat) => ({ name: stat.keys[0] || "其他", value: Number(stat.value) }));
    const total = Number(stats[0]?.sumTotal || 0);
    const currentSum = data.reduce((sum, item) => sum + item.value, 0);
    if (total > currentSum) data.push({ name: "其他", value: total - currentSum });

    return {
      tooltip: { trigger: "item", valueFormatter },
      legend: { orient: "vertical", left: "left" },
      series: [
        {
          name: title,
          type: "pie",
          radius: "50%",
          data,
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0, 0, 0, 0.5)" } },
        },
      ],
    };
  }

  if (type === "timeBar" || type === "timeLine") {
    const sortedStats = [...stats].sort((left, right) => left.time.localeCompare(right.time));
    return {
      tooltip: { trigger: "axis", valueFormatter },
      grid: { left: 30, right: 20, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: sortedStats.map((stat) => formatMetricChartTime(stat.time, chart?.metricItem?.periodUnit || "day")),
        axisLabel: { interval: "auto", rotate: 0 },
        axisLine: { lineStyle: { color: "#ddd" } },
        axisTick: { show: false },
      },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "#eee" } }, axisLabel: isTraffic ? { formatter: formatBytes } : undefined },
      series: [
        {
          name: title,
          type: type === "timeLine" ? "line" : "bar",
          data: sortedStats.map((stat) => Number(stat.value)),
          itemStyle: { color: type === "timeLine" ? "#ff8a00" : colorPrimary },
          ...(type === "timeLine" ? { smooth: true, symbol: "circle", symbolSize: 6, areaStyle: { opacity: 0.3 } } : { barWidth: "60%" }),
        },
      ],
    };
  }

  return {
    tooltip: { trigger: "axis", valueFormatter },
    grid: { left: 30, right: 20, bottom: 20, containLabel: true },
    xAxis: { type: "category", data: stats.map((stat) => stat.keys[0] || "其他"), axisLabel: { interval: 0, rotate: 30 } },
    yAxis: { type: "value", axisLabel: isTraffic ? { formatter: formatBytes } : undefined },
    series: [{ name: title, type: "bar", data: stats.map((stat) => Number(stat.value)), itemStyle: { color: colorPrimary } }],
  };
};
