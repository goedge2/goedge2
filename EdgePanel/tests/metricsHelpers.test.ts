import assert from "node:assert/strict";
import test from "node:test";
import { decodeMetricChartParams, encodeMetricChartParams, getMetricChartTypeName, getMetricPeriodUnitName } from "../src/pages/servers/metrics/metricsHelpers.ts";

test("maps metric period units to Chinese labels", () => {
  assert.equal(getMetricPeriodUnitName("minute"), "分钟");
  assert.equal(getMetricPeriodUnitName("week"), "周");
  assert.equal(getMetricPeriodUnitName("unknown"), "unknown");
});

test("maps all supported metric chart types to Chinese labels", () => {
  assert.deepEqual(
    ["bar", "pie", "timeBar", "timeLine", "table"].map(getMetricChartTypeName),
    ["柱图", "饼图", "时间柱图", "时间线图", "表格"],
  );
});

test("round trips metric chart params through protobuf bytes", () => {
  const params = { unit: "count", color: "#1677ff" };
  assert.deepEqual(decodeMetricChartParams(encodeMetricChartParams(params)), params);
  assert.deepEqual(decodeMetricChartParams(undefined), {});
});
