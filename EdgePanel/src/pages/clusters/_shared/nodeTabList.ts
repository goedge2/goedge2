export const getNodeTabList = (nodeId: string) => [
  { tab: "节点看板", key: `/clusters/nodes/${nodeId}/dashboard` },
  { tab: "节点详情", key: `/clusters/nodes/${nodeId}/details` },
  { tab: "运行日志", key: `/clusters/nodes/${nodeId}/logs` },
  { tab: "安装节点", key: `/clusters/nodes/${nodeId}/install` },
  { tab: "节点设置", key: `/clusters/nodes/${nodeId}/settings` },
];
