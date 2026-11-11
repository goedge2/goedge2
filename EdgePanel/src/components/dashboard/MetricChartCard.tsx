import { Empty, Progress, Table, theme } from "antd";
import type { MetricStat } from "@/pb/models/model_metric_stat_pb";
import { Chart } from "@/components/Chart";
import { formatBytesSimple } from "@/utils";
import { DashboardChartCard, dashboardChartHeight } from "./DashboardChartCard";
import { buildMetricChartOption, type MetricChartViewModel } from "./metricChartUtils";

export interface MetricChartCardProps {
  item: MetricChartViewModel;
}

export const MetricChartCard = ({ item }: MetricChartCardProps) => {
  const { token } = theme.useToken();
  const option = buildMetricChartOption(item, token.colorPrimary, (bytes) => formatBytesSimple(bytes));
  const title = (
    <span>
      {item.title}
      {item.metricItemName && <span style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: "normal" }}> ({item.metricItemName})</span>}
    </span>
  );

  return (
    <DashboardChartCard
      title={title}
      extra={item.valueName && <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>{item.valueName}</span>}
    >
      {!item.stats.length ? (
        <div style={{ alignItems: "center", display: "flex", height: dashboardChartHeight, justifyContent: "center" }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无统计数据" />
        </div>
      ) : item.type === "table" ? (
        <Table<MetricStat>
          dataSource={item.stats}
          rowKey={(record) => record.keys[0] + record.time}
          pagination={false}
          size="small"
          columns={[
            { title: "对象", dataIndex: ["keys", 0], key: "name" },
            { title: "数值", dataIndex: "value", key: "value", render: (value) => (item.isTraffic ? formatBytesSimple(Number(value)) : value) },
            {
              title: "占比",
              key: "percent",
              render: (_, record) => {
                const total = Number(record.sumTotal) || 0;
                const value = Number(record.value) || 0;
                const percent = total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
                return (
                  <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
                    <Progress percent={percent} showInfo={false} size="small" style={{ width: 100 }} />
                    <span>{percent}%</span>
                  </div>
                );
              },
            },
          ]}
        />
      ) : (
        <Chart option={option} style={{ height: dashboardChartHeight }} />
      )}
    </DashboardChartCard>
  );
};
