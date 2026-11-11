import assert from "node:assert/strict";
import test from "node:test";
import type { MetricChart } from "../src/pb/models/model_metric_chart_pb.ts";
import type { MetricStat } from "../src/pb/models/model_metric_stat_pb.ts";
import { buildMetricChartOption, formatMetricChartTime, prepareMetricChart } from "../src/components/dashboard/metricChartUtils.ts";

const metricChart = (type: string, maxItems = 0) =>
  ({
    id: 1n,
    name: "访问统计",
    type,
    maxItems,
    metricItem: { name: "请求量", value: "${countRequest}", periodUnit: "hour" },
  }) as MetricChart;

const metricStats = (...values: Array<[string, number, string]>) =>
  values.map(([key, value, time]) => ({ keys: [key], value, time, sumTotal: 100 }) as MetricStat);

test("prepares metric chart titles, traffic metadata, and default limits", () => {
  const item = prepareMetricChart(metricChart("bar"), metricStats(...Array.from({ length: 12 }, (_, index) => [`key-${index}`, index, "2026010100"])));
  assert.equal(item.title, "访问统计");
  assert.equal(item.metricItemName, "请求量");
  assert.equal(item.valueName, "请求数");
  assert.equal(item.stats.length, 10);
  assert.equal(prepareMetricChart(metricChart("bar", 2), item.stats).stats.length, 2);
});

test("formats metric chart periods", () => {
  assert.equal(formatMetricChartTime("202601", "month"), "2026-01");
  assert.equal(formatMetricChartTime("2026010213", "hour"), "2026-01-02 13");
  assert.equal(formatMetricChartTime("202601021359", "minute"), "2026-01-02 13:59");
});

test("builds pie, time bar, time line, and category bar options", () => {
  const stats = metricStats(["b", 30, "2026010102"], ["a", 20, "2026010101"]);
  const formatBytes = (bytes: number) => `${bytes} B`;
  const pie = buildMetricChartOption(prepareMetricChart(metricChart("pie"), stats), "#1677ff", formatBytes);
  const timeBar = buildMetricChartOption(prepareMetricChart(metricChart("timeBar"), stats), "#1677ff", formatBytes);
  const timeLine = buildMetricChartOption(prepareMetricChart(metricChart("timeLine"), stats), "#1677ff", formatBytes);
  const bar = buildMetricChartOption(prepareMetricChart(metricChart("bar"), stats), "#1677ff", formatBytes);

  assert.equal((pie.series as Array<{ type: string }>)[0].type, "pie");
  assert.equal((timeBar.series as Array<{ type: string }>)[0].type, "bar");
  assert.equal((timeLine.series as Array<{ type: string }>)[0].type, "line");
  assert.equal((bar.series as Array<{ type: string }>)[0].type, "bar");
  assert.deepEqual((timeLine.xAxis as { data: string[] }).data, ["2026-01-01 01", "2026-01-01 02"]);
});
