import { Button, Card, Form, Input, InputNumber, Space, Switch, App, Tag } from "antd";
import { PageContainer } from "@ant-design/pro-components";
import { request, useNavigate } from "@umijs/max";
import { useMemo, useState } from "react";
import { NodeGrantSelector, CachePolicySelector, WafPolicySelector, DNSDomainSelector } from "@/components/BusinessSelectors";
import { CompactField } from "@/components/SharedInput";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { ClusterDNSNameField, generateClusterDNSName } from "./_shared/ClusterDNSNameField";

interface CreateClusterForm {
  name: string;
  dnsDomainId?: string;
  dnsName?: string;
  nodeGrantId?: string;
  installDir?: string;
  httpCachePolicyId?: string;
  httpFirewallPolicyId?: string;
  autoInstallNftables?: boolean;
  autoSystemTuning?: boolean;
  autoTrimDisks?: boolean;
  enableSystemdService?: boolean;
  globalServerConfig?: {
    httpAll?: {
      matchDomainStrictly?: boolean;
    };
  };
  clusterDNS?: {
    ttl?: number;
  };
}

const ClusterCreate = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateClusterForm>();
  const [loading, setLoading] = useState(false);
  const [dnsDomainName, setDnsDomainName] = useState<string>();

  const initialDnsName = useMemo(() => generateClusterDNSName(), []);

  const onFinish = async (values: CreateClusterForm) => {
    try {
      setLoading(true);
      const payload = {
        nodeCluster: {
          ...values,
          dnsDomainId: values.dnsDomainId ? Number(values.dnsDomainId) : 0,
          nodeGrantId: values.nodeGrantId ? Number(values.nodeGrantId) : 0,
          httpCachePolicyId: values.httpCachePolicyId ? Number(values.httpCachePolicyId) : 0,
          httpFirewallPolicyId: values.httpFirewallPolicyId ? Number(values.httpFirewallPolicyId) : 0,
        },
      };
      await request("/api/cluster", { method: "POST", data: payload });
      message.success("集群创建成功");
      navigate("/clusters");
    } catch (error) {
      console.error("创建集群失败:", error);
      message.error(formatErrorMessage("创建集群失败", error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })} header={{ title: "创建集群" }}>
      <Card>
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          onFinish={onFinish}
          initialValues={{
            dnsName: initialDnsName,
            installDir: "",
            autoInstallNftables: true,
            autoSystemTuning: true,
            autoTrimDisks: false,
            enableSystemdService: true,
            clusterDNS: {
              ttl: 0,
            },
            globalServerConfig: {
              httpAll: {
                matchDomainStrictly: true,
              },
            },
          }}
        >
          <Card title="基础设置" size="small" style={{ marginBottom: 16 }}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
              <Input placeholder="比如 '美国西海岸集群'" />
            </Form.Item>

            <Form.Item name="httpCachePolicyId" label="默认缓存策略" help="为可选项。集群中的网站可以自行设置是否启用此设置。">
              <CachePolicySelector />
            </Form.Item>

            <Form.Item name="httpFirewallPolicyId" label="默认WAF策略" help="为可选项。集群中的网站可以自行设置是否启用此设置。">
              <WafPolicySelector />
            </Form.Item>

            <Form.Item
              label="只允许绑定的域名访问"
              name={["globalServerConfig", "httpAll", "matchDomainStrictly"]}
              valuePropName="checked"
              help="选中后，表示只有已经绑定的域名才允许访问；不选中表示访问一个不存在的域名时默认选择第一个网站。"
            >
              <Switch />
            </Form.Item>
          </Card>

          <Card title="节点安装选项" size="small" style={{ marginBottom: 16 }}>
            <Form.Item name="nodeGrantId" label="SSH认证" help="当前集群下节点统一的登录设置；当节点没有单独设置SSH登录方式时，默认使用此设置。">
              <NodeGrantSelector />
            </Form.Item>

            <Form.Item
              name="installDir"
              label="安装目录"
              help="当节点没有单独设置安装目录时，默认使用此设置。如果集群和节点都没有设置安装目录，则使用'$HOME/goedge2-node'目录。"
            >
              <Input placeholder="~/goedge2-node/" />
            </Form.Item>

            <Form.Item
              name="autoInstallNftables"
              label="自动安装nftables"
              valuePropName="checked"
              help={
                <div>
                  选中后，表示在Linux系统中自动尝试安装<Tag>nftables</Tag>用于安全防御；此功能需要联网从Ubuntu、CentOS等软件库中下载安装包。
                </div>
              }
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="autoSystemTuning"
              label="自动调节系统参数"
              valuePropName="checked"
              help="选中后，表示自动调整Linux内核等参数，以便提升性能。"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="enableSystemdService"
              label="自动添加到systemd"
              valuePropName="checked"
              help="加入后可以利用systemd对节点进程进行管理，并可自动随开机启动。"
            >
              <Switch />
            </Form.Item>

            {/* <Form.Item name="autoTrimDisks" label="TRIM 硬盘" valuePropName="checked"> */}
            {/*   <Switch /> */}
            {/* </Form.Item> */}
          </Card>

          <Card title="DNS设置选项" size="small" style={{ marginBottom: 16 }}>
            <Form.Item label="主域名" name="dnsDomainId" help="用于生成集群节点和网站的CNAME和DNS解析记录，修改后将自动删除旧域名中的相关记录。">
              <DNSDomainSelector onDomainNameChange={setDnsDomainName} />
            </Form.Item>
            <ClusterDNSNameField domainName={dnsDomainName} />

            <Form.Item
              label="解析记录TTL"
              name={["clusterDNS", "ttl"]}
              help="生成解析记录时使用的TTL；每个DNS服务商或者套餐、账号限制各有不同，请注意允许的取值范围。0表示使用默认。"
            >
              <CompactField addonAfter="秒">
                <InputNumber min={0} />
              </CompactField>
            </Form.Item>
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建
              </Button>
              <Button onClick={() => navigate("/clusters")}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default ClusterCreate;
