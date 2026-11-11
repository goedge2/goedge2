export type SettingsTabItem = {
  key: string;
  label: string;
  independent?: boolean;
};

export const clusterSettingsTabItems: SettingsTabItem[] = [
  { key: "basic", label: "基础设置" },
  { key: "dns", label: "DNS设置" },
  { key: "health", label: "健康检查" },
  { key: "global", label: "网站设置" },
  { key: "cache-waf", label: "缓存与防火墙" },
  { key: "webp-http3", label: "高级功能设置" },
  { key: "schedule", label: "智能调度", independent: true },
  { key: "threshold", label: "阈值设置", independent: true },
  { key: "msg", label: "消息通知", independent: true },
];

export const nodeSettingsTabItems: SettingsTabItem[] = [
  { key: "basic", label: "基础设置" },
  { key: "dns", label: "DNS设置" },
  { key: "cache", label: "缓存设置" },
  { key: "ddos", label: "DDoS防护" },
  { key: "schedule", label: "智能调度", independent: true },
  { key: "threshold", label: "阈值设置", independent: true },
  { key: "ssh", label: "SSH设置" },
  { key: "system", label: "系统设置" },
];
