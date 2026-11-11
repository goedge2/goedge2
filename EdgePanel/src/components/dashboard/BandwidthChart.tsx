import React, { useMemo } from "react";
import { Chart } from "../Chart";
import { EChartsOption } from "echarts";
import { formatBytesSimple } from "../../utils";
import { DashboardChartCard, dashboardChartHeight } from "./DashboardChartCard";
import type { ServerBandwidthStat } from "../../pb/models/model_server_bandwidth_stat_pb";

export interface BandwidthChartProps {
  bandwidthStats?: ServerBandwidthStat[];
  nthBandwidthStat?: ServerBandwidthStat;
  percentile?: number;
}

export const BandwidthChart: React.FC<BandwidthChartProps> = ({ bandwidthStats, nthBandwidthStat, percentile = 95 }) => {
  const option = useMemo<EChartsOption>(() => {
    if (!bandwidthStats || bandwidthStats.length === 0) {
      return {};
    }

    const sortedStats = [...bandwidthStats].sort((a, b) => {
      const timeA = a.day + (a.timeAt || "0000");
      const timeB = b.day + (b.timeAt || "0000");
      return timeA.localeCompare(timeB);
    });

    const times: string[] = [];
    const values: number[] = [];

    sortedStats.forEach((stat) => {
      const timeStr = stat.timeAt || "0000";
      const formattedTime = timeStr.length === 4 ? `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}` : timeStr;

      times.push(formattedTime);
      values.push(Number(stat.bytes || 0));
    });

    // Calculate percentile
    let percentileValue = 0;
    if (nthBandwidthStat) {
      percentileValue = Number(nthBandwidthStat.bytes || 0);
    } else if (values.length > 0) {
      const sortedValues = [...values].sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
      percentileValue = sortedValues[Math.max(0, index)];
    }

    return {
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => formatBytesSimple(Number(value)),
      },
      grid: { left: 60, right: 20, top: 40, bottom: 20 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: times,
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatBytesSimple(value),
        },
      },
      series: [
        {
          name: "峰值带宽",
          type: "line",
          smooth: true,
          areaStyle: { opacity: 0.1 },
          data: values,
          markLine:
            percentileValue > 0
              ? {
                  symbol: "none",
                  label: {
                    formatter: `${percentile}% 百分位: ${formatBytesSimple(percentileValue)}`,
                    position: "insideEndTop",
                  },
                  lineStyle: {
                    type: "dashed",
                    color: "#ff4d4f",
                  },
                  data: [
                    {
                      yAxis: percentileValue,
                      name: `${percentile}% 百分位`,
                    },
                  ],
                }
              : undefined,
        },
      ],
    };
  }, [bandwidthStats, nthBandwidthStat, percentile]);

  return (
    <DashboardChartCard title="带宽趋势">
      <Chart option={option} style={{ height: dashboardChartHeight }} />
    </DashboardChartCard>
  );
};
