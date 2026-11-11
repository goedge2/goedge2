import { Col, Row } from "antd";
import type { MetricDataChart } from "@/pb/service_server_stat_board_pb";
import { MetricChartCard } from "./MetricChartCard";
import { prepareMetricChart } from "./metricChartUtils";

export interface MetricChartGridProps {
  metricDataCharts?: MetricDataChart[];
}

export const MetricChartGrid = ({ metricDataCharts }: MetricChartGridProps) => {
  const items = metricDataCharts?.map((chartData) => prepareMetricChart(chartData.metricChart, chartData.metricStats)) || [];

  if (!items.length) {
    return null;
  }

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      {items.map((item) => (
        <Col xs={24} lg={12} key={Number(item.id)}>
          <MetricChartCard item={item} />
        </Col>
      ))}
    </Row>
  );
};
