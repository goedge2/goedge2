const metricPeriodUnitNames: Record<string, string> = {
  minute: "分钟",
  hour: "小时",
  day: "天",
  week: "周",
  month: "月",
};

const metricChartTypeNames: Record<string, string> = {
  bar: "柱图",
  pie: "饼图",
  timeBar: "时间柱图",
  timeLine: "时间线图",
  table: "表格",
};

export function getMetricPeriodUnitName(unit: string): string {
  return metricPeriodUnitNames[unit] || unit;
}

export function getMetricChartTypeName(type: string): string {
  return metricChartTypeNames[type] || type;
}

export function encodeMetricChartParams(params: Record<string, unknown> = {}): string {
  const value = JSON.stringify(params);
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(value);
  }
  return Buffer.from(value, "utf-8").toString("base64");
}

export function decodeMetricChartParams(value?: string | Uint8Array): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    if (value instanceof Uint8Array) {
      const decoded = JSON.parse(new TextDecoder().decode(value));
      return decoded && typeof decoded === "object" && !Array.isArray(decoded) ? decoded : {};
    }

    try {
      const decoded = JSON.parse(value);
      return decoded && typeof decoded === "object" && !Array.isArray(decoded) ? decoded : {};
    } catch {
      const raw =
        typeof window !== "undefined" && typeof window.atob === "function" ? window.atob(value) : Buffer.from(value, "base64").toString("utf-8");
      const decoded = JSON.parse(raw);
      return decoded && typeof decoded === "object" && !Array.isArray(decoded) ? decoded : {};
    }
  } catch {
    return {};
  }
}
