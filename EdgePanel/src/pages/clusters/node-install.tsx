import { PageContainer } from "@ant-design/pro-components";
import { ProCard, ProFormText, ProFormDigit, ProFormGroup } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Timeline, Alert, Typography, Flex, message, theme } from "antd";
import { request, useLocation, useNavigate, useParams } from "@umijs/max";
import { getNodeTabList } from "./_shared/nodeTabList";
import { clusterQueryKeys } from "@/queries/keys";
import { getNodeInstall } from "@/services/clusters";
import { NodeGrantSelector } from "@/components/BusinessSelectors";
import type { Node } from "@/pb/models/model_node_pb";
import type { APINode } from "@/pb/models/model_api_node_pb";
import type { NodeInstallStatus } from "@/pb/models/model_node_install_status_pb";
import { useState, useEffect } from "react";
import { ReloadOutlined, CopyOutlined } from "@ant-design/icons";
import LazySyntaxHighlighter, { type SyntaxThemeName } from "@/components/LazySyntaxHighlighter";
import useThemeStore from "@/stores/themeStore";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const generateYamlConfig = (apiNodes: APINode[], node: Node) => {
  const endpoints = apiNodes.filter((n) => n.isOn).flatMap((n) => n.accessAddrs || []);

  const endpointsYaml = endpoints.map((addr) => `  - "${addr}"`).join("\n");

  return `rpc.endpoints:
${endpointsYaml || '  - ""'}
nodeId: "${node.uniqueId}"
secret: "${node.secret}"`;
};

export default function NodeInstall() {
  const { nodeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery<{ node?: Node; apiNodes: APINode[] }>({
    queryKey: clusterQueryKeys.nodeInstall(nodeId),
    queryFn: () => getNodeInstall(nodeId),
    enabled: Boolean(nodeId),
  });
  const data = query.data;
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const pageContainerLoading = query.isPending && !query.data;

  const [installing, setInstalling] = useState(false);
  const [polling, setPolling] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installStatus, setInstallStatus] = useState<NodeInstallStatus | undefined>();
  const syntaxTheme: SyntaxThemeName = isDarkMode ? "oneDark" : "oneLight";
  const syntaxCustomStyle = {
    backgroundColor: isDarkMode ? token.colorBgElevated : token.colorBgLayout,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    fontSize: 14,
    margin: 0,
    padding: 16,
  };

  useEffect(() => {
    if (data?.node?.nodeLogin?.sshParams) {
      form.setFieldsValue({
        host: data.node.nodeLogin.sshParams.host,
        port: data.node.nodeLogin.sshParams.port,
        grantId: data.node.nodeLogin.sshParams.grantId ? String(data.node.nodeLogin.sshParams.grantId) : undefined,
        username: "root", // Keep default for form state even if hidden, or remove if unused
      });
    }
  }, [data?.node, form]);

  const handleInstall = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      setInstalling(true);
      setPolling(false);
      setInstallLogs(["正在准备安装..."]);
      setInstallStatus(undefined);

      const currentNode = data?.node;
      const currentLogin = currentNode?.nodeLogin?.sshParams;

      const hasChanged =
        values.host !== currentLogin?.host || values.port !== currentLogin?.port || String(values.grantId) !== String(currentLogin?.grantId || "");

      if (hasChanged) {
        await request(`/api/node/${nodeId}/login`, {
          method: "PUT",
          data: {
            nodeLogin: {
              id: currentNode?.nodeLogin?.id || 0,
              name: "SSH",
              type: "ssh",
              sshParams: {
                host: values.host,
                port: values.port,
                grantId: Number(values.grantId),
                username: "root", // Force root if not in UI
              },
            },
          },
        });
        setInstallLogs((prev) => [...prev, "SSH信息已更新"]);
      }

      await request(`/api/node/${nodeId}/install`, {
        method: "POST",
      });
      setInstallLogs((prev) => [...prev, "安装任务已提交", "正在连接服务器..."]);
      setPolling(true);
    } catch (error) {
      message.error(formatErrorMessage("安装失败", error));
      setInstalling(false);
    }
  };

  useEffect(() => {
    if (!polling) return;

    let active = true;
    let pending = false;
    const pollInterval = setInterval(async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await request<{ installStatus?: NodeInstallStatus }>(`/api/node/${nodeId}/install-status`);
        if (!active) return;
        const status = response.installStatus;
        if (!status || (!status.isRunning && !status.isFinished)) {
          throw new Error("安装任务状态为空，请刷新节点状态后重试");
        }

        setInstallStatus(status);

        if (status?.isRunning) {
          setInstallLogs((prev) => {
            if (prev[prev.length - 1] !== "正在安装中...") {
              return [...prev, "正在安装中..."];
            }
            return prev;
          });
        }

        if (status?.isFinished) {
          setPolling(false);
          setInstalling(false);
          clearInterval(pollInterval);
          if (status.isOk) {
            setInstallLogs((prev) => [...prev, "安装完成"]);
            message.success("安装成功");
          } else {
            setInstallLogs((prev) => [...prev, `安装失败: ${status.error}`]);
            message.error(status.error || "安装失败");
          }
        }
      } catch (error) {
        if (!active) return;
        console.error("Failed to poll install status:", error);
        setPolling(false);
        setInstalling(false);
        clearInterval(pollInterval);
        setInstallLogs((prev) => [...prev, formatErrorMessage("获取安装状态失败", error)]);
        message.error(formatErrorMessage("获取安装状态失败", error));
      } finally {
        pending = false;
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [polling, nodeId]);

  const handleCopyConfig = () => {
    if (!data?.node || !data?.apiNodes) return;
    const config = generateYamlConfig(data.apiNodes, data.node);
    navigator.clipboard.writeText(config);
    message.success("配置已复制到剪贴板");
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.node?.name,
        fallbackEntityLabel: "节点",
        tabList: getNodeTabList(nodeId!),
      })}
      header={{ title: data?.node?.name || "安装节点" }}
      loading={pageContainerLoading}
      tabList={getNodeTabList(nodeId!)}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
    >
      <Flex vertical gap="large" style={{ width: "100%" }}>
        <ProCard title="远程安装" variant="borderless">
          <Form form={form} layout="vertical">
            <ProFormGroup>
              <ProFormText
                name="host"
                label="主机地址"
                width="md"
                placeholder="192.168.1.100"
                rules={[{ required: true, message: "请输入主机地址" }]}
              />
              <ProFormDigit name="port" label="SSH端口" width="sm" fieldProps={{ precision: 0 }} initialValue={22} min={1} max={65535} />
            </ProFormGroup>
            <Form.Item name="grantId" label="SSH 授权">
              <NodeGrantSelector />
            </Form.Item>
            <Button type="primary" onClick={handleInstall} loading={installing} disabled={installing} icon={<ReloadOutlined spin={installing} />}>
              {installing ? "安装中..." : "开始安装"}
            </Button>
          </Form>

          {installLogs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Timeline
                items={installLogs.map((log, index) => ({
                  key: index,
                  children: log,
                  color: log.includes("失败") ? "red" : log.includes("完成") ? "green" : "blue",
                }))}
              />
            </div>
          )}

          {installStatus?.isFinished && (
            <Alert
              style={{ marginTop: 16 }}
              type={installStatus.isOk ? "success" : "error"}
              title={installStatus.isOk ? "安装成功" : "安装失败"}
              description={installStatus.error}
              showIcon
            />
          )}
        </ProCard>

        <ProCard title="手动安装" variant="borderless">
          <Typography.Paragraph>
            将以下配置保存为 <Typography.Text code>configs/api_node.yaml</Typography.Text>
          </Typography.Paragraph>

          <div style={{ position: "relative" }}>
            <LazySyntaxHighlighter
              language="yaml"
              theme={syntaxTheme}
              customStyle={syntaxCustomStyle}
              codeTagProps={{ style: { background: "transparent" } }}
            >
              {data?.node && data?.apiNodes ? generateYamlConfig(data.apiNodes, data.node) : ""}
            </LazySyntaxHighlighter>
          </div>

          <Button type="primary" onClick={handleCopyConfig} style={{ marginTop: 8 }} icon={<CopyOutlined />}>
            复制配置
          </Button>
        </ProCard>
      </Flex>
    </PageContainer>
  );
}
