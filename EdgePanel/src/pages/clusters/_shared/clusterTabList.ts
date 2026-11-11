export const getClusterTabList = (clusterId: string) => [
  { tab: "集群看板", key: `/clusters/${clusterId}/dashboard` },
  { tab: "节点列表", key: `/clusters/${clusterId}/nodes` },
  { tab: "集群设置", key: `/clusters/${clusterId}/settings` },
];
