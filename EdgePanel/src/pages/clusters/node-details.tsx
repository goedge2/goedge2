import { PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Card, Descriptions, Typography, Space, Button, message, Popconfirm } from "antd";
import { request, useLocation, useNavigate, useParams } from "@umijs/max";
import { getNodeTabList } from "./_shared/nodeTabList";
import { clusterQueryKeys } from "@/queries/keys";
import { getNodeDetail } from "@/services/clusters";
import type { Node } from "@/pb/models/model_node_pb";
import { formatBytesSimple } from "@/utils";
import dayjs from "dayjs";
import NodeStatusTag from "@/components/NodeStatusTag";
import { useState } from "react";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const { Paragraph } = Typography;

export default function NodeDetails() {
  const { nodeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery<{ node: Node }>({
    queryKey: clusterQueryKeys.nodeDetail(nodeId),
    queryFn: () => getNodeDetail(nodeId),
    enabled: Boolean(nodeId),
  });
  const data = query.data;
  const node = data?.node;
  const pageContainerLoading = query.isPending && !query.data;

  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const handleStartNode = async () => {
    try {
      setStarting(true);
      await request(`/api/node/${nodeId}/start`, { method: "POST" });
      message.success("已发送启动命令");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("启动失败", error));
    } finally {
      setStarting(false);
    }
  };

  const handleStopNode = async () => {
    try {
      setStopping(true);
      await request(`/api/node/${nodeId}/stop`, { method: "POST" });
      message.success("已发送停止命令");
      void query.refetch();
    } catch (error) {
      message.error(formatErrorMessage("停止失败", error));
    } finally {
      setStopping(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: node?.name,
        fallbackEntityLabel: "节点",
        tabList: getNodeTabList(nodeId!),
      })}
      header={{ title: node?.name || "节点详情" }}
      tabList={getNodeTabList(nodeId!)}
      tabActiveKey={location.pathname}
      loading={pageContainerLoading}
      onTabChange={(key) => navigate(key)}
    >
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Card title="基本信息" variant="borderless">
          <Descriptions column={2}>
            <Descriptions.Item label="节点名称">{node?.name}</Descriptions.Item>
            <Descriptions.Item label="所属集群">{node?.nodeCluster?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="从集群">
              {node?.secondaryNodeClusters && node.secondaryNodeClusters.length > 0 ? node.secondaryNodeClusters.map((c) => c.name).join(", ") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">
              {node?.ipAddresses && node.ipAddresses.length > 0 ? node.ipAddresses.map((ip) => ip.ip).join(", ") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="所属分组">{node?.nodeGroup?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="所属区域">{node?.nodeRegion?.name || "-"}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="运行状态" variant="borderless">
          {node && (
            <Descriptions column={2}>
              <Descriptions.Item label="运行状态">
                <Space>
                  <NodeStatusTag node={node} onUpdate={() => void query.refetch()} />
                  {!node.isActive && (
                    <Button size="small" type="primary" onClick={handleStartNode} loading={starting}>
                      尝试通过SSH启动
                    </Button>
                  )}
                  {node.isActive && (
                    <Popconfirm title="确定要停止此节点吗？" onConfirm={handleStopNode} okText="确定" cancelText="取消">
                      <Button size="small" danger loading={stopping}>
                        通过SSH停止
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="CPU用量">
                {node.status?.cpuUsage?.toFixed(1)}% ({node.status?.cpuLogicalCount || 0} 核心)
              </Descriptions.Item>
              <Descriptions.Item label="内存用量">
                {node.status?.memoryUsage?.toFixed(1)}% ({formatBytesSimple(Number(node.status?.memoryTotal) || 0)})
              </Descriptions.Item>
              <Descriptions.Item label="连接数">{node.status?.connectionCount || 0}</Descriptions.Item>
              <Descriptions.Item label="负载">
                {node.status?.load1m?.toFixed(2)} / {node.status?.load5m?.toFixed(2)} / {node.status?.load15m?.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="缓存用量">
                硬盘: {formatBytesSimple(Number(node.status?.cacheTotalDiskSize) || 0)}
                {" / "}
                内存: {formatBytesSimple(Number(node.status?.cacheTotalMemorySize) || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="版本">{node.status?.buildVersion || "-"}</Descriptions.Item>
              <Descriptions.Item label="主程序位置">{node.status?.exePath || "-"}</Descriptions.Item>
              <Descriptions.Item label="API连接状况">
                成功率: {node.status?.apiSuccessPercent?.toFixed(1)}%{" / "}
                平均耗时: {node.status?.apiAvgCostSeconds?.toFixed(3)}s
              </Descriptions.Item>
              <Descriptions.Item label="上次更新时间">
                {node.status?.updatedAt ? dayjs.unix(Number(node.status.updatedAt)).format("YYYY-MM-DD HH:mm:ss") : "-"}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <Card title="安装信息" variant="borderless">
          <Descriptions column={2}>
            <Descriptions.Item label="节点ID">
              <Paragraph copyable>{node?.uniqueId || "-"}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="密钥">
              <Paragraph copyable>{node?.secret || "-"}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="安装目录">{node?.installDir || "使用集群设置"}</Descriptions.Item>
            <Descriptions.Item label="已安装状态">{node && <NodeStatusTag node={node} onUpdate={() => void query.refetch()} />}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </PageContainer>
  );
}
