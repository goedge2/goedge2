import { useRef, useState, useEffect, useCallback } from "react";
import { request, useNavigate } from "@umijs/max";
import { PageContainer } from "@ant-design/pro-components";
import { StepsForm, ProCard, ProFormText, ProFormDigit, ProFormDependency, ProFormGroup } from "@ant-design/pro-components";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { ProFormInstance } from "@ant-design/pro-components";
import { Button, Form, Typography, Timeline, Flex, message, Alert, theme } from "antd";
import { CopyOutlined, ReloadOutlined } from "@ant-design/icons";
import { ClusterSelector } from "@/components/ClusterSelector";
import { NodeGrantSelector, NodeRegionSelector, NodeGroupSelector } from "@/components/BusinessSelectors";
import type { Node } from "@/pb/models/model_node_pb";
import type { NodeIPAddress } from "@/pb/models/model_node_ip_address_pb";
import type { NodeInstallStatus } from "@/pb/models/model_node_install_status_pb";
import type { APINode } from "@/pb/models/model_api_node_pb";
import LazySyntaxHighlighter, { type SyntaxThemeName } from "@/components/LazySyntaxHighlighter";
import { NodeIPAddressesInput, isValidIPFormat, parseIPInput } from "@/components/NodeIPAddressesInput";
import useThemeStore from "@/stores/themeStore";
import { formatErrorMessage } from "@/utils";

const { Text } = Typography;

const generateYamlConfig = (apiNodes: APINode[], node: Node): string => {
  const endpoints = apiNodes.filter((n) => n.isOn).flatMap((n) => n.accessAddrs || []);

  const endpointsYaml = endpoints.map((addr) => `  - "${addr}"`).join("\n");

  return `rpc.endpoints:
${endpointsYaml || '  - ""'}
nodeId: "${node.uniqueId}"
secret: "${node.secret}"`;
};

interface NodeInfoFormValues {
  nodeClusterId: string;
  nodeGroupId?: string;
  name?: string;
  nodeRegionId?: string;
  ipAddresses: NodeIPAddress[];
  sshHost: string;
  sshPort: number;
  nodeGrantId: string;
}

export default function NodeCreate() {
  const navigate = useNavigate();
  const formRef = useRef<ProFormInstance>(null);
  const { token } = theme.useToken();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const [createdNodeId, setCreatedNodeId] = useState<string>();
  const [nodeInfo, setNodeInfo] = useState<Node>();
  const [apiNodes, setApiNodes] = useState<APINode[]>([]);
  const [installing, setInstalling] = useState(false);
  const [polling, setPolling] = useState(false);
  const [installStatus, setInstallStatus] = useState<NodeInstallStatus>();
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const syntaxTheme: SyntaxThemeName = isDarkMode ? "oneDark" : "oneLight";
  const syntaxCustomStyle = {
    backgroundColor: isDarkMode ? token.colorBgElevated : token.colorBgLayout,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    fontSize: 14,
    margin: 0,
    padding: 16,
  };

  const loadNodeInfo = useCallback(async (nodeId: string) => {
    try {
      const [nodeRes, apiNodesRes] = await Promise.all([
        request<{ node?: Node }>(`/api/node/${nodeId}`),
        request<{ apiNodes?: APINode[] }>("/api/api-nodes"),
      ]);
      setNodeInfo(nodeRes.node);
      setApiNodes(apiNodesRes.apiNodes || []);
    } catch (error) {
      message.error(formatErrorMessage("加载节点信息失败", error));
    }
  }, []);

  // 当节点名称是合法 IP 时，自动添加到 IP 地址列表
  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const name = e.target.value?.trim();
    if (!name) return;

    // 检查是否为合法的 IP 格式
    if (!isValidIPFormat(name)) return;

    // 获取当前 IP 列表
    const currentIps: NodeIPAddress[] = formRef.current?.getFieldValue("ipAddresses") || [];

    // 解析输入的 IP（支持 CIDR 和 IP 范围）
    const parsedIps = parseIPInput(name);

    // 检查是否已存在
    const existingIps = new Set(currentIps.map((ip) => ip.ip));
    const newIps = parsedIps.filter((ip) => !existingIps.has(ip));

    if (newIps.length === 0) return;

    // 创建新的 IP 地址条目
    const newIPAddresses: NodeIPAddress[] = newIps.map(
      (ip) =>
        ({
          id: "0",
          ip,
          canAccess: true,
          isOn: true,
        }) as NodeIPAddress,
    );

    // 合并到现有列表
    const mergedIps = [...currentIps, ...newIPAddresses];
    formRef.current?.setFieldValue("ipAddresses", mergedIps);
  };

  useEffect(() => {
    if (nodeInfo?.nodeLogin?.sshParams) {
      formRef.current?.setFieldsValue({
        installSshHost: nodeInfo.nodeLogin.sshParams.host,
        installSshPort: nodeInfo.nodeLogin.sshParams.port,
        installNodeGrantId: nodeInfo.nodeLogin.sshParams.grantId ? String(nodeInfo.nodeLogin.sshParams.grantId) : undefined,
      });
    }
  }, [nodeInfo]);

  useEffect(() => {
    if (!createdNodeId || !polling) return;

    let active = true;
    let pending = false;
    const timer = setInterval(async () => {
      if (pending) return;
      pending = true;
      try {
        const res = await request<{ installStatus?: NodeInstallStatus }>(`/api/node/${createdNodeId}/install-status`);
        if (!active) return;
        const status = res.installStatus;
        if (!status || (!status.isRunning && !status.isFinished)) {
          throw new Error("安装任务状态为空，请刷新节点状态后重试");
        }
        setInstallStatus(status);

        if (status?.isFinished) {
          setPolling(false);
          clearInterval(timer);
          setInstalling(false);
          if (status.isOk) {
            message.success("节点安装成功");
            setInstallLogs((prev) => [...prev, "安装完成"]);
          } else {
            message.error(status.error || "安装失败");
            setInstallLogs((prev) => [...prev, `安装失败: ${status.error}`]);
          }
        } else if (status?.isRunning) {
          setInstallLogs((prev) => {
            if (prev[prev.length - 1] !== "正在安装中...") {
              return [...prev, "正在安装中..."];
            }
            return prev;
          });
        }
      } catch (error) {
        if (!active) return;
        clearInterval(timer);
        setPolling(false);
        setInstalling(false);
        setInstallLogs((prev) => [...prev, formatErrorMessage("获取安装状态失败", error)]);
        message.error(formatErrorMessage("获取安装状态失败", error));
      } finally {
        pending = false;
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [createdNodeId, polling]);

  const handleCreateNode = async (values: NodeInfoFormValues) => {
    const { name, ipAddresses } = values;

    try {
      const res = await request<{ nodeId?: string | number }>("/api/node", {
        method: "POST",
        data: {
          name: name || (ipAddresses?.length > 0 ? ipAddresses[0].ip : ""),
          nodeClusterId: Number(values.nodeClusterId),
          nodeGroupId: values.nodeGroupId ? Number(values.nodeGroupId) : 0,
          nodeRegionId: values.nodeRegionId ? Number(values.nodeRegionId) : 0,
          ipAddresses: ipAddresses,
          nodeLogin: values.sshHost
            ? {
                name: "SSH",
                type: "ssh",
                sshParams: {
                  host: values.sshHost,
                  port: values.sshPort || 22,
                  grantId: values.nodeGrantId ? Number(values.nodeGrantId) : 0,
                },
              }
            : undefined,
        },
      });

      const nodeId = String(res.nodeId);
      setCreatedNodeId(nodeId);
      await loadNodeInfo(nodeId);
      message.success("节点创建成功");
      return true;
    } catch (error) {
      message.error(formatErrorMessage("创建节点失败", error));
      return false;
    }
  };

  const handleInstall = async () => {
    if (!createdNodeId || !nodeInfo) return;

    try {
      setInstalling(true);
      setPolling(false);
      setInstallLogs(["开始安装..."]);
      setInstallStatus(undefined);

      // Check if SSH info has changed
      const sshForm = formRef.current?.getFieldsValue(["installSshHost", "installSshPort", "installNodeGrantId"]);
      const currentLogin = nodeInfo.nodeLogin?.sshParams;

      const hasChanged =
        sshForm.installSshHost !== currentLogin?.host ||
        sshForm.installSshPort !== currentLogin?.port ||
        String(sshForm.installNodeGrantId) !== String(currentLogin?.grantId || 0);

      if (hasChanged) {
        setInstallLogs((prev) => [...prev, "检测到 SSH 信息变更，正在更新..."]);
        await request(`/api/node/${createdNodeId}/login`, {
          method: "PUT",
          data: {
            nodeLogin: {
              id: nodeInfo.nodeLogin?.id || 0,
              name: "SSH",
              type: "ssh",
              sshParams: {
                host: sshForm.installSshHost,
                port: sshForm.installSshPort,
                grantId: Number(sshForm.installNodeGrantId),
              },
            },
          },
        });
        setInstallLogs((prev) => [...prev, "SSH 信息更新成功"]);
        // Refresh node info
        await loadNodeInfo(createdNodeId);
        // const nodeRes = await request(`/api/node/${createdNodeId}`);
        // setNodeInfo(nodeRes.data.node);
      }

      await request(`/api/node/${createdNodeId}/install`, {
        method: "POST",
      });
      setPolling(true);
    } catch (error) {
      setInstalling(false);
      setInstallLogs((prev) => [...prev, "启动安装失败"]);
      message.error(formatErrorMessage("启动安装失败", error));
    }
  };

  const handleCopyConfig = () => {
    if (!nodeInfo) return;
    const config = generateYamlConfig(apiNodes, nodeInfo);
    navigator.clipboard.writeText(config);
    message.success("配置已复制到剪贴板");
  };

  return (
    <PageContainer breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })} header={{ title: "添加节点" }}>
      <ProCard>
        <StepsForm
          formRef={formRef}
          onFinish={async () => {
            navigate("/clusters/nodes");
            return true;
          }}
          formProps={{
            validateMessages: { required: "${label}为必填项" },
          }}
          submitter={{
            render: (props) => {
              if (props.step === 0) {
                return (
                  <Button type="primary" onClick={() => props.onSubmit?.()}>
                    下一步
                  </Button>
                );
              }
              if (props.step === 1) {
                return (
                  <Button type="primary" onClick={() => props.onSubmit?.()}>
                    完成
                  </Button>
                );
              }
              return null;
            },
          }}
        >
          {/* Step 1: 节点信息 */}
          <StepsForm.StepForm<NodeInfoFormValues> name="nodeInfo" title="节点信息" onFinish={handleCreateNode}>
            <ProCard title="基础信息" style={{ marginBottom: 16 }} size="small" variant="borderless">
              <Form.Item name="nodeClusterId" label="节点集群" rules={[{ required: true, message: "请选择节点集群" }]}>
                <ClusterSelector />
              </Form.Item>

              <ProFormText
                name="name"
                label="节点名称"
                placeholder="若不填写则使用第一个 IP 作为名称"
                rules={[{ required: true, message: "请填写节点名称" }]}
                fieldProps={{ onBlur: handleNameBlur }}
              />

              <Form.Item name="nodeRegionId" label="节点区域">
                <NodeRegionSelector />
              </Form.Item>

              <ProFormDependency name={["nodeClusterId"]}>
                {({ nodeClusterId }) => (
                  <Form.Item name="nodeGroupId" label="节点分组">
                    <NodeGroupSelector nodeClusterId={nodeClusterId} />
                  </Form.Item>
                )}
              </ProFormDependency>

              <Form.Item name="ipAddresses" label="IP 地址" rules={[{ required: true, message: "请填写 IP 地址" }]}>
                <NodeIPAddressesInput />
              </Form.Item>
            </ProCard>

            <ProCard title="SSH 登录信息" size="small" variant="borderless">
              <ProFormGroup>
                <ProFormText name="sshHost" label="SSH 主机" placeholder="SSH 主机地址" width="md" />

                <ProFormDigit name="sshPort" label="SSH 端口" initialValue={22} min={1} max={65535} width="sm" />
              </ProFormGroup>

              <Form.Item name="nodeGrantId" label="SSH 授权">
                <NodeGrantSelector />
              </Form.Item>
            </ProCard>
          </StepsForm.StepForm>

          {/* Step 2: 安装节点 */}
          <StepsForm.StepForm name="install" title="安装节点">
            <Flex vertical gap="large" style={{ width: "100%" }}>
              <ProCard title="远程安装" variant="borderless">
                <Flex vertical gap="large" style={{ width: "100%" }}>
                  <ProCard title="SSH 登录信息" variant="borderless">
                    <ProFormGroup>
                      <ProFormText name="installSshHost" label="SSH 主机" width="md" />
                      <ProFormDigit name="installSshPort" label="SSH 端口" min={1} max={65535} width="sm" />
                    </ProFormGroup>
                    <Form.Item name="installNodeGrantId" label="SSH 授权">
                      <NodeGrantSelector />
                    </Form.Item>

                    <Flex vertical gap="small" style={{ width: "100%" }}>
                      <Button
                        type="primary"
                        icon={<ReloadOutlined spin={installing} />}
                        onClick={handleInstall}
                        loading={installing}
                        disabled={installing}
                      >
                        {installing ? "安装中..." : "远程安装"}
                      </Button>

                      {installLogs.length > 0 && (
                        <Timeline
                          style={{ marginTop: 16 }}
                          items={installLogs.map((log, index) => ({
                            key: index,
                            children: log,
                            color: log.includes("失败") ? "red" : log.includes("完成") ? "green" : "blue",
                          }))}
                        />
                      )}

                      {installStatus?.isFinished && !installStatus.isOk && (
                        <Alert type="error" title="安装失败" description={installStatus.error} showIcon />
                      )}

                      {installStatus?.isFinished && installStatus.isOk && <Alert type="success" title="安装成功" showIcon />}
                    </Flex>
                  </ProCard>
                </Flex>
              </ProCard>

              <ProCard title="手动安装" variant="borderless">
                <Flex vertical gap="small" style={{ width: "100%" }}>
                  <ProCard variant="borderless" size="small">
                    <Text strong>配置文件：</Text>
                    <Text code>configs/api_node.yaml</Text>
                  </ProCard>

                  <ProCard
                    title="配置内容"
                    variant="borderless"
                    size="small"
                    extra={
                      <Button icon={<CopyOutlined />} onClick={handleCopyConfig}>
                        复制
                      </Button>
                    }
                  >
                    {nodeInfo ? (
                      <LazySyntaxHighlighter
                        language="yaml"
                        theme={syntaxTheme}
                        customStyle={syntaxCustomStyle}
                        codeTagProps={{ style: { background: "transparent" } }}
                      >
                        {generateYamlConfig(apiNodes, nodeInfo)}
                      </LazySyntaxHighlighter>
                    ) : (
                      <Text type="secondary">加载配置中...</Text>
                    )}
                  </ProCard>
                </Flex>
              </ProCard>
            </Flex>
          </StepsForm.StepForm>
        </StepsForm>
      </ProCard>
    </PageContainer>
  );
}
