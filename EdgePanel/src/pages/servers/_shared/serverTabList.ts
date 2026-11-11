export const getServerTabList = (serverId: string) => [
  { tab: "网站看板", key: `/servers/${serverId}/dashboard` },
  { tab: "访问日志", key: `/servers/${serverId}/accesslogs` },
  { tab: "网站设置", key: `/servers/${serverId}/settings` },
];
