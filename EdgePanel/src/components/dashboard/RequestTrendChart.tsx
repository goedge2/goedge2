import React, { useMemo, useState } from "react";
import { Chart } from "../Chart";
import { EChartsOption, SeriesOption } from "echarts";
import { DashboardChartCard, dashboardChartHeight } from "./DashboardChartCard";

export interface RequestTrendChartProps {
  hourlyTrafficStats?: Array<{
    hour: string;
    countRequests: bigint | number;
    countAttackRequests: bigint | number;
  }>;
  dailyTrafficStats?: Array<{
    day: string;
    countRequests: bigint | number;
    countIPs?: bigint | number;
    countAttackRequests: bigint | number;
  }>;
  showDailyIPs?: boolean;
}

export const RequestTrendChart: React.FC<RequestTrendChartProps> = ({ hourlyTrafficStats, dailyTrafficStats, showDailyIPs }) => {
  const [visitTab, setVisitTab] = useState("24h");

  const hourlyRequestChartOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 20, top: 40, bottom: 20 },
      xAxis: {
        type: "category",
        data: hourlyTrafficStats?.map((s) => s.hour.substring(8, 10) + "时") || [],
      },
      yAxis: { type: "value" },
      series: [
        {
          name: "访问量",
          type: "bar",
          data: hourlyTrafficStats?.map((s) => Number(s.countRequests)) || [],
        },
        {
          name: "攻击",
          type: "bar",
          data: hourlyTrafficStats?.map((s) => Number(s.countAttackRequests)) || [],
        },
      ],
      legend: {
        data: ["访问量", "攻击"],
        top: 0,
        right: 10,
      },
    }),
    [hourlyTrafficStats],
  );

  const requestChartOption: EChartsOption = useMemo(() => {
    const series: SeriesOption[] = [
      {
        name: "访问量",
        type: "bar",
        data: dailyTrafficStats?.map((s) => Number(s.countRequests)) || [],
      },
    ];

    const legendData = ["访问量"];

    if (showDailyIPs) {
      series.push({
        name: "独立IP",
        type: "bar",
        data: dailyTrafficStats?.map((s) => Number(s.countIPs || 0)) || [],
      });
      legendData.push("独立IP");
    }

    series.push({
      name: "攻击",
      type: "bar",
      data: dailyTrafficStats?.map((s) => Number(s.countAttackRequests)) || [],
    });
    legendData.push("攻击");

    return {
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 20, top: 40, bottom: 20 },
      xAxis: {
        type: "category",
        data: dailyTrafficStats?.map((s) => s.day.substring(4, 6) + "-" + s.day.substring(6)) || [],
      },
      yAxis: { type: "value" },
      series,
      legend: {
        data: legendData,
        top: 0,
        right: 10,
      },
    };
  }, [dailyTrafficStats, showDailyIPs]);

  return (
    <DashboardChartCard
      title="访问量趋势"
      headerBordered
      tabs={{
        activeKey: visitTab,
        onChange: setVisitTab,
        items: [
          { label: "24小时", key: "24h", children: <Chart option={hourlyRequestChartOption} style={{ height: dashboardChartHeight }} /> },
          { label: "15日", key: "15d", children: <Chart option={requestChartOption} style={{ height: dashboardChartHeight }} /> },
        ],
      }}
    />
  );
};
