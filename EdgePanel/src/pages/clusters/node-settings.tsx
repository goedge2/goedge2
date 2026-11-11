import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request, useLocation, useNavigate, useParams, useSearchParams } from "@umijs/max";
import { Button, Card, Divider, Empty, Form, Input, InputNumber, Radio, Select, Spin, Switch, Tabs, message } from "antd";
import { FooterToolbar, PageContainer, ProFormDependency } from "@ant-design/pro-components";
import { FormInstance } from "antd/es/form";
import type { Node } from "@/pb/models/model_node_pb";
import { clusterQueryKeys } from "@/queries/keys";
import { getNodeSettings } from "@/services/clusters";
import { NodeGrantSelector, NodeRegionSelector, NodeGroupSelector } from "@/components/BusinessSelectors";
import { ClusterSelector } from "@/components/ClusterSelector";
import type { NetworkAddress } from "@/pb/models/model_network_address_pb";
import { SizeCapacityInput } from "@/components/SharedInput";
import { NodeIPAddressesInput } from "@/components/NodeIPAddressesInput";
import { getNodeLevel, normalizeNodeLnAddrs } from "@/components/nodeLevel";
import { getNodeTabList } from "./_shared/nodeTabList";
import { ScheduleSettingsPanel } from "./_shared/ScheduleSettingsPanel";
import { ThresholdSettingsPanel } from "./_shared/ThresholdSettingsPanel";
import { NodeDNSSettingsFields } from "./_shared/NodeDNSSettingsFields";
import { findNodeDNS } from "@/services/nodeDNS";
import {
  buildNodeDNSUpdate,
  isNodeDNSAddressAvailable,
  nodeDNSFormValues,
  syncNodeDNSIPAddress,
  type NodeDNSFormValues,
  type NodeDNSIPAddress,
} from "@/services/nodeDNSForm";
import { findSettingsTabByKey, shouldForceRenderSettingsTab } from "./settingsHelpers";
import { nodeSettingsTabItems } from "./settingsTabItems";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const cardStyles = {
  header: { borderBottom: 0 },
};

interface NodeSettingsLoaderData {
  node: Node;
}

type NodeClusterSummary = {
  id: bigint;
  name: string;
};

type NodeSettingsFormValues = Record<string, unknown> & {
  nodeClusterId?: string;
  nodeGroupId?: string;
  nodeRegionId?: string;
  secondaryNodeClusterIds?: string[];
  ipAddresses?: NodeDNSIPAddress[];
  dns?: NodeDNSFormValues;
  level?: number;
  lnAddrs?: { addrs?: string[] };
  nodeLogin?: {
    sshParams?: {
      grantId?: string;
    } & Record<string, unknown>;
  } & Record<string, unknown>;
};

const BasicSettings = () => {
  return (
    <Card title="基础设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="节点名称" name="name" rules={[{ required: true, message: "请输入节点名称" }]}>
        <Input placeholder="比如 '节点1'" />
      </Form.Item>

      <Form.Item label="所属集群" name="nodeClusterId" rules={[{ required: true, message: "请选择所属集群" }]}>
        <ClusterSelector />
      </Form.Item>

      <Form.Item label="从集群" name="secondaryNodeClusterIds" help="节点可以属于多个集群，这些集群共享该节点">
        <LocalClusterMultiSelect />
      </Form.Item>

      <ProFormDependency name={["nodeClusterId"]}>
        {({ nodeClusterId }) => (
          <Form.Item label="所属分组" name="nodeGroupId" help="用来筛选节点，同时可以在分组中设置二级缓存节点">
            <NodeGroupSelector nodeClusterId={nodeClusterId} />
          </Form.Item>
        )}
      </ProFormDependency>

      <Form.Item label="所属区域" name="nodeRegionId" help="设置区域后可以根据区域进行流量统计和计费">
        <NodeRegionSelector />
      </Form.Item>

      <Form.Item label="IP地址" name="ipAddresses" rules={[{ required: true, message: "请填写 IP 地址" }]} help="用于访问节点和域名解析等">
        <NodeIPAddressesInput />
      </Form.Item>

      <Divider />

      <Form.Item label="节点级别" name="level" initialValue={1} help="边缘节点处理用户请求；L2节点同时负责同组边缘节点的回源">
        <Radio.Group
          options={[
            { label: "边缘节点", value: 1 },
            { label: "L2节点", value: 2 },
          ]}
        />
      </Form.Item>

      <ProFormDependency name={["level"]}>
        {({ level }) => (
          <Form.Item
            label="L2级别访问地址"
            name={["lnAddrs", "addrs"]}
            hidden={getNodeLevel(level) <= 1}
            help="支持多个IP地址。边缘节点访问当前L2节点时优先使用这些地址；留空则使用上方填写的节点IP地址"
          >
            <Select mode="tags" placeholder="输入IP地址，按回车添加" tokenSeparators={[",", " ", "\n", "\r"]} allowClear />
          </Form.Item>
        )}
      </ProFormDependency>

      <Form.Item
        label="同步IP名单"
        name="enableIPLists"
        valuePropName="checked"
        help="选中后表示启用IP名单同步，包括来自管理员、用户添加的IP名单，以及其他节点系统自动拦截的IP名单"
      >
        <Switch />
      </Form.Item>

      <Form.Item label="启用节点" name="isOn" valuePropName="checked" help="如果不启用此节点，此节点上的所有网站将不能访问">
        <Switch />
      </Form.Item>
    </Card>
  );
};

const LocalClusterMultiSelect = ({ value, onChange }: { value?: string[]; onChange?: (val: string[]) => void }) => {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClusters = async (keyword: string) => {
    setLoading(true);
    try {
      const response = await request<{ nodeClusters?: NodeClusterSummary[] }>("/api/clusters", { params: { size: 20, keyword } });
      if (response?.nodeClusters) {
        setOptions(response.nodeClusters.map((c) => ({ label: c.name, value: String(c.id) })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialClusters = async () => {
      setLoading(true);
      try {
        const response = await request<{ nodeClusters?: NodeClusterSummary[] }>("/api/clusters", { params: { size: 20, keyword: "" } });
        if (!ignore && response?.nodeClusters) {
          setOptions(response.nodeClusters.map((c) => ({ label: c.name, value: String(c.id) })));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadInitialClusters();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      loading={loading}
      options={options}
      showSearch={{ onSearch: (val) => loadClusters(val), filterOption: false }}
      allowClear
      placeholder="选择从集群"
    />
  );
};

const CacheSettings = () => {
  return (
    <Card title="缓存设置" variant="borderless" size="small" styles={cardStyles}>
      <Card title="硬盘缓存" size="small" variant="borderless" styles={cardStyles}>
        <Form.Item
          label="缓存硬盘容量"
          name="maxCacheDiskCapacity"
          help="缓存所在硬盘的最大用量，超出此用量或硬盘接近用尽时将自动尝试清理旧数据，0表示不限制"
        >
          <SizeCapacityInput />
        </Form.Item>
        <Form.Item label="硬盘缓存主目录" name="cacheDiskDir" help="存放文件缓存的主目录，通常填写绝对路径。不填则表示使用集群缓存策略中定义的目录">
          <Input placeholder="/opt/cache" />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="内存缓存" size="small" variant="borderless" styles={cardStyles}>
        <Form.Item label="缓存内存容量" name="maxCacheMemoryCapacity" help="缓存能使用的内存的最大容量，0表示不限制">
          <SizeCapacityInput />
        </Form.Item>
      </Card>
    </Card>
  );
};

const DDoSSettings = ({ form }: { form: FormInstance }) => {
  const isOn = Form.useWatch(["ddosProtection", "tcp", "isOn"], form);
  const fieldsetStyle: CSSProperties = {
    opacity: isOn ? 1 : 0.5,
    pointerEvents: isOn ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };

  return (
    <Card title="DDoS防护" variant="borderless" size="small" styles={cardStyles}>
      <Card title="TCP防护" size="small" variant="borderless" styles={cardStyles}>
        <Form.Item label="启用" name={["ddosProtection", "tcp", "isOn"]} valuePropName="checked">
          <Switch />
        </Form.Item>

        <div aria-disabled={!isOn} style={fieldsetStyle}>
          <Form.Item label="最大连接数" name={["ddosProtection", "tcp", "maxConnections"]} help="节点允许的TCP最大并发连接数，0表示不限制">
            <InputNumber disabled={!isOn} min={0} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item label="单IP最大连接数" name={["ddosProtection", "tcp", "maxConnectionsPerIP"]} help="单个IP允许的TCP最大并发连接数，0表示不限制">
            <InputNumber disabled={!isOn} min={0} style={{ width: 180 }} />
          </Form.Item>
        </div>
      </Card>
    </Card>
  );
};

const SSHSettings = ({ form }: { form: FormInstance }) => {
  const [sshTestLoading, setSshTestLoading] = useState(false);

  const handleTestSSH = async () => {
    const host = form.getFieldValue(["nodeLogin", "sshParams", "host"]) as string;
    const port = form.getFieldValue(["nodeLogin", "sshParams", "port"]) as string;
    const grantId = form.getFieldValue(["nodeLogin", "sshParams", "grantId"]) as string;

    if (!host || !port || !grantId) {
      message.error("请填写SSH地址、端口和登录认证");
      return;
    }

    setSshTestLoading(true);
    try {
      const response = await request<{ isOk?: boolean; error?: string }>(`/api/node-grants/${grantId}/test-connection`, {
        method: "POST",
        data: {
          host,
          port: Number(port),
        },
      });
      if (response.isOk) {
        message.success("SSH连接测试成功");
      } else {
        message.error(response.error || "SSH连接测试失败");
      }
    } catch (error) {
      console.error(error);
      message.error(formatErrorMessage("测试连接失败", error));
    } finally {
      setSshTestLoading(false);
    }
  };

  return (
    <Card title="SSH设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item name={["nodeLogin", "sshParams", "host"]} label="SSH主机" help="比如 192.168.1.100">
        <Input placeholder="SSH主机" />
      </Form.Item>

      <Form.Item name={["nodeLogin", "sshParams", "port"]} label="SSH端口号" help="比如 22" wrapperCol={{ span: 6 }}>
        <InputNumber min={1} max={65535} style={{ width: "100%" }} placeholder="22" />
      </Form.Item>

      <Form.Item name={["nodeLogin", "sshParams", "grantId"]} label="SSH登录认证">
        <NodeGrantSelector />
      </Form.Item>

      <Form.Item shouldUpdate noStyle>
        {() => {
          const host = form.getFieldValue(["nodeLogin", "sshParams", "host"]);
          const port = form.getFieldValue(["nodeLogin", "sshParams", "port"]);
          const grantId = form.getFieldValue(["nodeLogin", "sshParams", "grantId"]);
          return (
            <Button loading={sshTestLoading} disabled={!host || !port || !grantId} onClick={handleTestSSH}>
              测试连接
            </Button>
          );
        }}
      </Form.Item>
    </Card>
  );
};

const SystemSettings = () => {
  return (
    <Card title="系统设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="CPU线程数" name="maxCPU" help="当前节点可以使用的最多的CPU线程数，0表示使用全部CPU线程数">
        <InputNumber min={0} style={{ width: 180 }} />
      </Form.Item>

      <Form.Item label="API节点地址" name="apiNodeAddrs" help="当前节点单独使用的API节点地址设置">
        <APINodeAddrInput />
      </Form.Item>
    </Card>
  );
};

const APINodeAddrInput = ({ value, onChange }: { value?: NetworkAddress[]; onChange?: (val: NetworkAddress[]) => void }) => {
  const triggerChange = (newVal: string[]) => {
    const addrs: NetworkAddress[] = newVal.map((v) => {
      const parts = v.split(":");
      const portRange = parts.length > 1 ? parts[parts.length - 1] : "";
      const host = parts.length > 1 ? parts.slice(0, parts.length - 1).join(":") : v;
      return { protocol: "tcp", host, portRange } as unknown as NetworkAddress;
    });
    onChange?.(addrs);
  };

  const selectedValues = (value || []).map((v) => `${v.host}:${v.portRange}`);

  return (
    <Select mode="tags" value={selectedValues} onChange={triggerChange} placeholder="输入API节点地址 (host:port)" tokenSeparators={[",", " "]} />
  );
};

export default function NodeSettings() {
  const navigate = useNavigate();
  const { nodeId } = useParams();
  const query = useQuery<NodeSettingsLoaderData>({
    queryKey: clusterQueryKeys.nodeSettings(nodeId),
    queryFn: () => getNodeSettings(nodeId),
    enabled: Boolean(nodeId),
  });
  const data = query.data;
  const queryClient = useQueryClient();
  const pageContainerLoading = query.isPending && !query.data;
  const [form] = Form.useForm();
  const initializedNodeId = useRef<string | undefined>(undefined);
  const selectedClusterId = String(Form.useWatch("nodeClusterId", form) ?? data?.node?.nodeCluster?.id ?? 0);
  const currentAddresses = Form.useWatch("ipAddresses", form) as NodeDNSIPAddress[] | undefined;
  const dnsQuery = useQuery({
    queryKey: clusterQueryKeys.nodeDNS(nodeId!, selectedClusterId),
    queryFn: async () => (await findNodeDNS(nodeId!, selectedClusterId)).node,
    enabled: Boolean(data?.node) && selectedClusterId !== "0",
  });
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "basic";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  const initialNodeValues = useMemo(() => {
    if (data && data.node) {
      return {
        ...data.node,
        level: getNodeLevel(data.node.level),
        lnAddrs: { addrs: normalizeNodeLnAddrs(data.node.lnAddrs?.addrs) },
        secondaryNodeClusterIds: data.node.secondaryNodeClusters?.map((c) => String(c.id)) || [],
        nodeClusterId: String(data.node.nodeCluster?.id),
        nodeGroupId: data.node.nodeGroup?.id ? String(data.node.nodeGroup.id) : undefined,
        nodeRegionId: data.node.nodeRegion?.id ? String(data.node.nodeRegion.id) : undefined,
        ipAddresses: data.node.ipAddresses,
        nodeLogin: data.node.nodeLogin
          ? {
              ...data.node.nodeLogin,
              sshParams: {
                ...data.node.nodeLogin.sshParams,
                grantId: String(data.node.nodeLogin.sshParams?.grantId || ""),
              },
            }
          : undefined,
      };
    }
    return undefined;
  }, [data]);

  const initialValues = useMemo(
    () => ({ ...initialNodeValues, dns: dnsQuery.data ? nodeDNSFormValues(dnsQuery.data) : undefined }),
    [initialNodeValues, dnsQuery.data],
  );

  useEffect(() => {
    if (!initialNodeValues) return;
    const isNewNode = initializedNodeId.current !== String(initialNodeValues.id);
    if (isNewNode) form.resetFields();
    // Independent scheduling saves can refetch the node while the main form has unsaved edits.
    if (isNewNode || !form.isFieldsTouched()) {
      form.setFields(Object.entries(initialNodeValues).map(([name, value]) => ({ name, value, touched: false })));
    }
    initializedNodeId.current = String(initialNodeValues.id);
  }, [initialNodeValues, form]);

  useEffect(() => {
    if (!dnsQuery.isSuccess) return;
    const dns = dnsQuery.data ? nodeDNSFormValues(dnsQuery.data) : undefined;
    if (
      String(form.getFieldValue(["dns", "dnsDomainId"])) === String(dns?.dnsDomainId) &&
      form.isFieldsTouched([
        ["dns", "ipAddr"],
        ["dns", "routes"],
      ])
    )
      return;
    const values = { dns, ipAddresses: form.getFieldValue("ipAddresses") as NodeDNSIPAddress[] | undefined };
    const synced = form.isFieldTouched("ipAddresses") ? syncNodeDNSIPAddress({ ipAddresses: values.ipAddresses }, values) : undefined;
    form.setFieldValue("dns", synced?.dns ?? dns);
  }, [dnsQuery.data, dnsQuery.isSuccess, form]);

  const handleSave = async (values: NodeSettingsFormValues) => {
    if (dnsQuery.isFetching || dnsQuery.isError) {
      message.error("请等待 DNS 设置加载完成后再保存");
      return;
    }
    setSubmitting(true);
    try {
      const {
        nodeClusterId,
        nodeGroupId,
        nodeRegionId,
        secondaryNodeClusterIds,
        nodeCluster: _nodeCluster,
        nodeGroup: _nodeGroup,
        nodeRegion: _nodeRegion,
        dnsRoutes: _dnsRoutes,
        dns,
        ...nodeValues
      } = values;
      const dnsUpdate = dns && selectedClusterId !== "0" ? buildNodeDNSUpdate(dns, values.ipAddresses) : undefined;
      const payload = {
        ...nodeValues,
        ...dnsUpdate,
        level: getNodeLevel(values.level),
        lnAddrs: { addrs: normalizeNodeLnAddrs(values.lnAddrs?.addrs) },
        nodeCluster: { id: Number(nodeClusterId), ...dnsUpdate?.nodeCluster },
        nodeGroup: { id: nodeGroupId ? Number(nodeGroupId) : 0 },
        nodeRegion: { id: nodeRegionId ? Number(nodeRegionId) : 0 },
        secondaryNodeClusters: (secondaryNodeClusterIds || []).map((id: string) => ({ id: Number(id) })),
        nodeLogin: values.nodeLogin?.type
          ? {
              ...values.nodeLogin,
              sshParams: {
                ...values.nodeLogin.sshParams,
                grantId: Number(values.nodeLogin.sshParams?.grantId),
              },
            }
          : undefined,
      };

      await request(`/api/node/${data?.node?.id}`, {
        method: "PUT",
        data: {
          node: payload,
        },
      });
      message.success("保存成功");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeSettings(nodeId) }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeDNS(nodeId!, selectedClusterId) }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodeDetail(nodeId) }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.nodesBase() }),
        queryClient.invalidateQueries({ queryKey: clusterQueryKeys.clusterNodesBase() }),
      ]);
      navigate("/clusters/nodes");
    } catch (error) {
      console.error(error);
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const itemChildren = {
    basic: <BasicSettings />,
    dns: (
      <Card title="DNS设置" variant="borderless" size="small" styles={cardStyles}>
        {dnsQuery.isPending && selectedClusterId !== "0" ? (
          <Spin />
        ) : dnsQuery.data ? (
          <NodeDNSSettingsFields
            namePrefix="dns"
            dnsDomainId={String(dnsQuery.data.dnsDomainId ?? 0)}
            dnsDomainName={dnsQuery.data.dnsDomainName}
            requireIPAddress={(currentAddresses ?? data?.node?.ipAddresses ?? []).some(isNodeDNSAddressAvailable)}
          />
        ) : (
          <Empty description="当前节点没有可用的 DNS 配置" />
        )}
      </Card>
    ),
    cache: <CacheSettings />,
    ddos: <DDoSSettings form={form} />,
    schedule: <ScheduleSettingsPanel scope="node" clusterId={String(data?.node?.nodeCluster?.id ?? 0)} nodeId={nodeId!} />,
    threshold: <ThresholdSettingsPanel scope="node" clusterId={String(data?.node?.nodeCluster?.id ?? 0)} nodeId={nodeId!} />,
    ssh: <SSHSettings form={form} />,
    system: <SystemSettings />,
  } as const;
  const activeTabConfig = findSettingsTabByKey(nodeSettingsTabItems, activeTab);
  const items = nodeSettingsTabItems.map((item) => ({
    key: item.key,
    label: item.label,
    forceRender: shouldForceRenderSettingsTab(item),
    children: itemChildren[item.key as keyof typeof itemChildren],
  }));

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.node?.name,
        fallbackEntityLabel: "节点",
        tabList: getNodeTabList(nodeId!),
      })}
      header={{ title: data?.node?.name || "节点设置" }}
      tabList={getNodeTabList(nodeId!)}
      tabActiveKey={location.pathname}
      loading={pageContainerLoading}
      onTabChange={(key) => navigate(key)}
    >
      <Card style={{ marginBottom: "80px" }}>
        <Form
          form={form}
          name="nodeSettings"
          initialValues={initialValues}
          onFinish={handleSave}
          onValuesChange={(changed, values) => {
            const synced = syncNodeDNSIPAddress(changed, values);
            if (synced) form.setFieldsValue(synced);
          }}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} tabPlacement="top" />
          {!activeTabConfig?.independent ? (
            <FooterToolbar>
              <Button onClick={() => form.resetFields()}>重置</Button>
              <Button type="primary" onClick={() => form.submit()} loading={submitting} disabled={dnsQuery.isFetching || dnsQuery.isError}>
                保存
              </Button>
            </FooterToolbar>
          ) : null}
        </Form>
      </Card>
    </PageContainer>
  );
}
