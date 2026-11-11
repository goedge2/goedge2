import { ClusterOutlined } from "@ant-design/icons";
import { NavLink } from "@umijs/max";
import { Space, Tag, Tooltip, theme } from "antd";
import type { Node } from "@/pb/models/model_node_pb";
import { getNodeLevel } from "./nodeLevel";

export default function NodeName({ node }: { node: Node }) {
  const { token } = theme.useToken();

  return (
    <Space orientation="vertical" size={0}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <NavLink to={`/clusters/nodes/${node.id}/details`} style={{ fontWeight: 500 }}>
          {node.name}
        </NavLink>
        {getNodeLevel(node.level) > 1 ? (
          <Tooltip title="L2节点：负责同组边缘节点的回源">
            <span
              role="img"
              aria-label="L2节点"
              style={{
                position: "relative",
                top: -6,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                paddingInline: 4,
                border: `1px solid ${token.gold3}`,
                borderRadius: token.borderRadiusSM,
                background: token.gold1,
                color: token.gold9,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: "16px",
                whiteSpace: "nowrap",
              }}
            >
              <ClusterOutlined aria-hidden style={{ fontSize: 11 }} />
              L2
            </span>
          </Tooltip>
        ) : null}
      </span>
      <Space size={4} wrap style={{ maxWidth: 500 }}>
        {node.nodeCluster ? <Tag color="blue">{node.nodeCluster.name}</Tag> : null}
        {node.secondaryNodeClusters?.map((cluster) => {
          const clusterName = cluster.name ?? "";
          const name = clusterName.length > 20 ? `${clusterName.substring(0, 20)}...` : clusterName;
          return (
            <Tooltip key={String(cluster.id ?? 0n)} title={clusterName}>
              <Tag color="orange">{name}</Tag>
            </Tooltip>
          );
        })}
      </Space>
    </Space>
  );
}
