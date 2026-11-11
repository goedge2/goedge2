import { Tag, Button, theme, Popover, message, Space } from "antd";
import { request } from "@umijs/max";
import type { Node } from "../pb/models/model_node_pb";
import { ReloadOutlined } from "@ant-design/icons";
import { useState } from "react";

const { useToken } = theme;

interface NodeStatusTagProps {
  node: Node;
  onUpdate?: () => void;
}

export default function NodeStatusTag({ node, onUpdate }: NodeStatusTagProps) {
  const { token } = useToken();
  const [loading, setLoading] = useState(false);

  const handleUpdateUp = async () => {
    try {
      setLoading(true);
      await request(`/api/node/${node.id}/up`, {
        method: "PUT",
        data: {
          nodeId: node.id,
          isUp: true,
        },
      });
      message.success("已强制上线");
      if (onUpdate) onUpdate();
    } catch {
      message.error("操作失败");
    } finally {
      setLoading(false);
    }
  };

  // 1. isUp false
  if (!node.isUp) {
    return (
      <Space size={8}>
        <Tag color={token.colorError}>健康问题下线</Tag>
        <Button type="link" size="small" onClick={handleUpdateUp} loading={loading} style={{ padding: 0, fontSize: 12 }}>
          [上线]
        </Button>
      </Space>
    );
  }

  // 2. isOn false
  if (!node.isOn) {
    return (
      <Tag color="default" style={{ color: token.colorTextDisabled }}>
        已停用
      </Tag>
    );
  }

  // 3. isInstalled true
  if (node.isInstalled) {
    if (node.isActive) {
      return <Tag color={token.colorSuccess}>运行中</Tag>;
    }
    const updatedAt = Number(node.status?.updatedAt || 0);
    if (updatedAt > 0) {
      return <Tag color={token.colorError}>已断开</Tag>;
    }
    return <Tag color={token.colorWarning}>未连接</Tag>;
  }

  // 4. isInstalled false
  const installStatus = node.installStatus;
  if (installStatus?.isRunning) {
    return (
      <Tag color={token.colorPrimary} icon={<ReloadOutlined spin />}>
        安装中
      </Tag>
    );
  }
  if (installStatus?.isFinished && !installStatus.isOk) {
    return (
      <Popover
        content={
          <div style={{ maxWidth: 300, wordBreak: "break-all" }}>
            <div>
              <span style={{ fontWeight: "bold" }}>Code:</span> {installStatus.errorCode}
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontWeight: "bold" }}>Error:</span> {installStatus.error}
            </div>
          </div>
        }
        title="安装出错"
      >
        <Tag color={token.colorError} style={{ cursor: "pointer" }}>
          安装出错
        </Tag>
      </Popover>
    );
  }

  return (
    <Tag color="default" style={{ color: token.colorTextDisabled }}>
      未安装
    </Tag>
  );
}
