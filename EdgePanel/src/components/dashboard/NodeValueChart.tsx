import React, { useMemo } from "react";
import { Chart } from "../Chart";
import { EChartsOption, TooltipComponentFormatterCallbackParams } from "echarts";
import dayjs from "dayjs";
import type { NodeValue } from "../../pb/models/model_node_value_pb";
import { DashboardChartCard, dashboardChartHeight } from "./DashboardChartCard";

export interface NodeValueChartProps {
  title: string;
  cpuValues?: NodeValue[];
  memoryValues?: NodeValue[];
  loadValues?: NodeValue[];
}

export const NodeValueChart: React.FC<NodeValueChartProps> = ({ title, cpuValues, memoryValues, loadValues }) => {
  const option = useMemo<EChartsOption>(() => {
    const parseUsage = (value: NodeValue): [number, number] => {
      return [Number(value.createdAt) * 1000, Math.round(value.value * 10000) / 100];
    };
    const parseLoad = (value: NodeValue): [number, number] => {
      return [Number(value.createdAt) * 1000, Math.round(value.value * 100) / 100];
    };

    const cpuData = (cpuValues || []).map(parseUsage);
    const memData = (memoryValues || []).map(parseUsage);
    const loadData = (loadValues || []).map(parseLoad);

    return {
      tooltip: {
        trigger: "axis",
        formatter: function (params: TooltipComponentFormatterCallbackParams) {
          if (!Array.isArray(params) || params.length === 0) return "";
          const firstParam = params[0];
          const firstParamVal = firstParam.value as [number, number];
          const axisValue = Number((firstParam as { axisValue?: string | number }).axisValue);
          const timeValue = Number.isFinite(axisValue) ? axisValue : firstParamVal[0];
          const nearestBySeries = new Map<string, (typeof params)[number]>();
          params.forEach((param) => {
            const seriesName = String(param.seriesName || "");
            const current = nearestBySeries.get(seriesName);
            const currentValue = current?.value as [number, number] | undefined;
            const paramValue = param.value as [number, number];
            if (!current || Math.abs(paramValue[0] - timeValue) < Math.abs(currentValue![0] - timeValue)) {
              nearestBySeries.set(seriesName, param);
            }
          });

          const time = dayjs(timeValue).format("HH:mm:ss");
          let html = `<div>${time}</div>`;
          nearestBySeries.forEach((param) => {
            const val = (param.value as [number, number])[1];
            html += `<div>${param.marker} ${param.seriesName}: ${val}${param.seriesName?.includes("%") ? " %" : ""}</div>`;
          });
          return html;
        },
      },
      legend: {
        data: ["CPU使用率(%)", "内存使用率(%)", "负载(1min)"],
        top: 0,
      },
      grid: {
        left: 40,
        right: 40,
        bottom: 20,
        containLabel: true,
      },
      xAxis: {
        type: "time",
        axisLabel: {
          formatter: (value: number) => dayjs(value).format("HH:mm:ss"),
        },
      },
      yAxis: [
        {
          type: "value",
          name: "使用率",
          min: 0,
          max: 100,
          axisLabel: {
            formatter: "{value} %",
          },
        },
        {
          type: "value",
          name: "负载",
          axisLabel: {
            formatter: "{value}",
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: "CPU使用率(%)",
          type: "line",
          smooth: true,
          data: cpuData.sort((a, b) => a[0] - b[0]),
          yAxisIndex: 0,
        },
        {
          name: "内存使用率(%)",
          type: "line",
          smooth: true,
          data: memData.sort((a, b) => a[0] - b[0]),
          yAxisIndex: 0,
        },
        {
          name: "负载(1min)",
          type: "line",
          smooth: true,
          data: loadData.sort((a, b) => a[0] - b[0]),
          yAxisIndex: 1,
        },
      ],
    };
  }, [cpuValues, memoryValues, loadValues]);

  return (
    <DashboardChartCard title={title}>
      <Chart option={option} style={{ height: dashboardChartHeight }} />
    </DashboardChartCard>
  );
};
