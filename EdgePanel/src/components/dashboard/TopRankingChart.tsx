import React, { useMemo, useState } from "react";
import { Empty, theme } from "antd";
import { Chart } from "../Chart";
import { EChartsOption } from "echarts";
import { formatBytesSimple } from "../../utils";
import { DashboardChartCard } from "./DashboardChartCard";

const topRankingChartHeight = 460;

export interface TopRankingChartProps {
  tabs: Array<{
    key: string;
    label: string;
    data?: Array<{ name: string; bytes: bigint | number }>;
  }>;
}

export const TopRankingChart: React.FC<TopRankingChartProps> = ({ tabs }) => {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].key : "");

  const chartOptions = useMemo(() => {
    const options: Record<string, EChartsOption> = {};

    tabs.forEach((tab) => {
      const sortedData = [...(tab.data || [])].sort((a, b) => Number(b.bytes) - Number(a.bytes));

      options[tab.key] = {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          valueFormatter: (value) => formatBytesSimple(Number(value)),
        },
        grid: { left: 10, right: 30, top: 20, bottom: 16, containLabel: true },
        xAxis: {
          type: "category",
          data: sortedData.map((s) => s.name || "未知"),
          axisLabel: {
            interval: 0,
            margin: 8,
            formatter: (value: string) => (value.length > 16 ? `${value.slice(0, 16)}...` : value),
          },
        },
        yAxis: {
          type: "value",
          axisLabel: { formatter: (value: number) => formatBytesSimple(value) },
        },
        series: [
          {
            name: "流量",
            type: "bar",
            data: sortedData.map((s) => Number(s.bytes)),
          },
        ],
      };
    });

    return options;
  }, [tabs]);

  if (!tabs.length) return null;

  return (
    <DashboardChartCard
      title="流量排行"
      headerBordered
      tabs={{
        activeKey: activeTab || tabs[0].key,
        onChange: setActiveTab,
        items: tabs.map((tab) => ({
          label: tab.label,
          key: tab.key,
          children: (
            <div style={{ height: topRankingChartHeight, position: "relative" }}>
              {tab.data?.length ? (
                <Chart option={chartOptions[tab.key]} style={{ height: topRankingChartHeight }} />
              ) : (
                <div style={{ alignItems: "center", display: "flex", height: "100%", justifyContent: "center" }}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无统计数据。" />
                </div>
              )}
              {tab.key === "country" && (
                <span
                  style={{
                    background: token.colorBgContainer,
                    bottom: 4,
                    color: token.colorTextTertiary,
                    fontSize: 12,
                    paddingLeft: 8,
                    pointerEvents: "none",
                    position: "absolute",
                    right: 0,
                  }}
                >
                  只有开启了统计的网站才会有记录。
                </span>
              )}
            </div>
          ),
        })),
      }}
    />
  );
};
