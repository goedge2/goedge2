import React, { useMemo, useState } from "react";
import { Chart } from "../Chart";
import { EChartsOption } from "echarts";
import { formatBytesSimple } from "../../utils";
import { DashboardChartCard, dashboardChartHeight } from "./DashboardChartCard";
export interface TrafficTrendChartProps {
  hourlyTrafficStats?: Array<{
    hour: string;
    bytes: bigint | number;
    cachedBytes: bigint | number;
  }>;
  dailyTrafficStats?: Array<{
    day: string;
    bytes: bigint | number;
    cachedBytes: bigint | number;
  }>;
}

export const TrafficTrendChart: React.FC<TrafficTrendChartProps> = ({ hourlyTrafficStats, dailyTrafficStats }) => {
  const [trafficTab, setTrafficTab] = useState("24h");

  const hourlyTrafficChartOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => formatBytesSimple(Number(value)),
      },
      grid: { left: 60, right: 20, top: 40, bottom: 20 },
      xAxis: {
        type: "category",
        data: hourlyTrafficStats?.map((s) => s.hour.substring(8, 10) + "时") || [],
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatBytesSimple(value),
        },
      },
      series: [
        {
          name: "流量",
          type: "line",
          smooth: true,
          areaStyle: { opacity: 0.1 },
          data: hourlyTrafficStats?.map((s) => Number(s.bytes)) || [],
        },
        {
          name: "缓存流量",
          type: "line",
          smooth: true,
          areaStyle: { opacity: 0.1 },
          data: hourlyTrafficStats?.map((s) => Number(s.cachedBytes)) || [],
        },
      ],
      legend: {
        data: ["流量", "缓存流量"],
        top: 0,
        right: 10,
      },
    }),
    [hourlyTrafficStats],
  );

  const trafficChartOption: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => formatBytesSimple(Number(value)),
      },
      grid: { left: 60, right: 20, top: 40, bottom: 20 },
      xAxis: {
        type: "category",
        data: dailyTrafficStats?.map((s) => s.day.substring(4, 6) + "-" + s.day.substring(6)) || [],
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatBytesSimple(value),
        },
      },
      series: [
        {
          name: "流量",
          type: "line",
          smooth: true,
          areaStyle: { opacity: 0.1 },
          data: dailyTrafficStats?.map((s) => Number(s.bytes)) || [],
        },
        {
          name: "缓存流量",
          type: "line",
          smooth: true,
          areaStyle: { opacity: 0.1 },
          data: dailyTrafficStats?.map((s) => Number(s.cachedBytes)) || [],
        },
      ],
      legend: {
        data: ["流量", "缓存流量"],
        top: 0,
        right: 10,
      },
    }),
    [dailyTrafficStats],
  );

  return (
    <DashboardChartCard
      title="流量趋势"
      headerBordered
      tabs={{
        activeKey: trafficTab,
        onChange: setTrafficTab,
        items: [
          { label: "24小时", key: "24h", children: <Chart option={hourlyTrafficChartOption} style={{ height: dashboardChartHeight }} /> },
          { label: "15日", key: "15d", children: <Chart option={trafficChartOption} style={{ height: dashboardChartHeight }} /> },
        ],
      }}
    />
  );
};
