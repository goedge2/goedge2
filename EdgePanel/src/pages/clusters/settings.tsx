import { useState, useEffect, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { request, useLocation, useNavigate, useParams } from "@umijs/max";
import { App, Button, Card, Divider, Form, Input, InputNumber, Radio, Select, Spin, Switch, Tabs, Tag } from "antd";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { FormInstance } from "antd/es/form";
import type { FindEnabledNodeClusterResponse } from "@/pb/service_node_cluster_pb";
import type { HealthCheckConfig, NodeCluster } from "@/pb/models/model_node_cluster_pb";
import { clusterQueryKeys } from "@/queries/keys";
import { getClusterSettings } from "@/services/clusters";
import { NodeGrantSelector, DNSDomainSelector, CachePolicySelector, WafPolicySelector } from "@/components/BusinessSelectors";
import { CompactField, SizeCapacityInput, TimeDurationInput, TimeZoneSelector } from "@/components/SharedInput";
import { getClusterTabList } from "./_shared/clusterTabList";
import { ClusterMessageSettingsPanel } from "./_shared/ClusterMessageSettingsPanel";
import { ClusterDNSNameField } from "./_shared/ClusterDNSNameField";
import { ScheduleSettingsPanel } from "./_shared/ScheduleSettingsPanel";
import { ThresholdSettingsPanel } from "./_shared/ThresholdSettingsPanel";
import { findSettingsTabByKey, normalizeEmptyRootObjectsForSubmit, shouldForceRenderSettingsTab } from "./settingsHelpers";
import { clusterSettingsTabItems } from "./settingsTabItems";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const cardStyles = {
  header: { borderBottom: 0 },
};

const healthCheckDefaultConfig = {
  isOn: true,
  url: "http://${host}/",
  interval: { count: "60", unit: "second" },
  statusCodes: [200],
  timeout: { count: "10", unit: "second" },
  countTries: "3",
  tryDelay: { count: "100", unit: "ms" },
  autoDown: true,
  countUp: 1,
  countDown: 3,
  userAgent: "",
  onlyBasicRequest: true,
  accessLogIsOn: true,
} as HealthCheckConfig;

const BasicSettings = () => {
  return (
    <Card title="基础设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="集群名称" name="name" rules={[{ required: true, message: "请输入集群名称" }]}>
        <Input placeholder="比如 '美国西海岸集群'" />
      </Form.Item>
      <Form.Item label="安装目录" name="installDir" help="节点上的安装父目录，未设置时使用登录用户的 $HOME/goedge2-node">
        <Input placeholder="$HOME/goedge2-node" />
      </Form.Item>
      <Form.Item label="SSH认证" name="nodeGrantId" help="用于SSH远程安装节点的认证信息">
        <NodeGrantSelector />
      </Form.Item>
      <Form.Item label="时区" name="timeZone" help="节点服务器所在时区，比如 'Asia/Shanghai'">
        <TimeZoneSelector />
      </Form.Item>
      <Form.Item label="最大线程数" name="nodeMaxThreads" help="0表示自动识别">
        <InputNumber min={0} />
      </Form.Item>

      <Divider />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 400px))", columnGap: 24 }}>
        <Form.Item
          label="自动开放端口"
          name="autoOpenPorts"
          valuePropName="checked"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          help="自动尝试在防火墙中开放必要的端口"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动远程启动"
          name="autoRemoteStart"
          valuePropName="checked"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          help="尝试通过SSH自动启动节点"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动安装Nftables"
          name="autoInstallNftables"
          valuePropName="checked"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          help="自动尝试安装nftables工具"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动系统优化"
          name="autoSystemTuning"
          valuePropName="checked"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          help="自动调整系统内核参数以优化性能"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动清理磁盘"
          name="autoTrimDisks"
          valuePropName="checked"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          help="自动尝试清理磁盘空间"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动添加到systemd"
          name="enableSystemdService"
          valuePropName="checked"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          help="加入后可以利用systemd对节点进程进行管理，并可自动随开机启动。"
        >
          <Switch />
        </Form.Item>
      </div>

      <Divider />

      <Form.Item label="节点I/O最大读并发数" name="maxConcurrentReads" help="0表示根据系统资源自动计算；通常不需要修改，请在专业人士指导下操作。">
        <InputNumber min={0} />
      </Form.Item>
      <Form.Item label="节点I/O最大写并发数" name="maxConcurrentWrites" help="0表示根据系统资源自动计算；通常不需要修改，请在专业人士指导下操作。">
        <InputNumber min={0} />
      </Form.Item>

      <Divider />

      <Card title="时钟同步" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="自动同步" name={["clock", "autoSync"]} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="NTP服务器" name={["clock", "server"]} help="NTP服务器地址">
          <Input />
        </Form.Item>
        <Form.Item label="检查Chrony" name={["clock", "checkChrony"]} valuePropName="checked" help="检查是否安装了Chrony服务">
          <Switch />
        </Form.Item>
      </Card>
    </Card>
  );
};

const DNSSettings = ({ data }: { data?: FindEnabledNodeClusterResponse }) => {
  const [dnsDomainName, setDnsDomainName] = useState<string | undefined>(() => data?.nodeCluster?.dnsDomainName);

  return (
    <Card title="DNS设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="选择主域名" name="dnsDomainId" help="用于生成集群节点和网站的CNAME和DNS解析记录，修改后将自动删除旧域名中的相关记录。">
        <DNSDomainSelector onDomainNameChange={setDnsDomainName} />
      </Form.Item>
      <ClusterDNSNameField domainName={dnsDomainName} isEditing />

      <Form.Item label="自动设置CNAME" name={["clusterDNS", "cnameRecords"]} help="除集群已创建的网站之外，自动解析到集群的CNAME记录，比如www。">
        <Select mode="tags" placeholder="请输入记录" tokenSeparators={[",", " ", "\n"]} />
      </Form.Item>
      <Form.Item
        label="允许通过CNAME访问网站"
        name={["clusterDNS", "cnameAsDomain"]}
        valuePropName="checked"
        help="选中后，表示允许使用CNAME直接访问网站；如果取消选中，则表示CNAME只作为DNS解析记录使用。"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="包含L2节点"
        name={["clusterDNS", "includingLnNodes"]}
        valuePropName="checked"
        help="选中后，表示域名解析中包含L2及以上级别节点，也就意味着用户请求可能会被分配到这些节点。"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="解析记录TTL"
        name={["clusterDNS", "ttl"]}
        help="每个DNS服务商或者账号的TTL限制各有不同，请注意取值范围；修改后，只对新的解析记录生效。0表示使用默认。"
      >
        <CompactField addonAfter="秒">
          <InputNumber min={0} />
        </CompactField>
      </Form.Item>

      <Form.Item label="同步节点DNS状态" name={["clusterDNS", "nodesAutoSync"]} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item label="同步网站DNS状态" name={["clusterDNS", "serversAutoSync"]} valuePropName="checked">
        <Switch />
      </Form.Item>
    </Card>
  );
};

const HealthCheckSettings = ({ form, healthCheck }: { form: FormInstance; healthCheck?: HealthCheckConfig }) => {
  const isOn = Form.useWatch(["healthCheck", "isOn"], form);
  const fieldsetStyle: CSSProperties = {
    opacity: isOn ? 1 : 0.5,
    pointerEvents: isOn ? "auto" : "none",
    transition: "opacity 0.2s ease",
  };
  const onHealthCheckChange = (checked: boolean) => {
    if (checked && healthCheck == null) {
      form.setFieldsValue({ healthCheck: healthCheckDefaultConfig });
    }
  };

  return (
    <Card title="健康检查" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="启用健康检查" name={["healthCheck", "isOn"]} valuePropName="checked" help="通过访问节点上的检测 URL 判断节点是否健康。">
        <Switch onChange={onHealthCheckChange} />
      </Form.Item>

      <div aria-disabled={!isOn} style={fieldsetStyle}>
        <Form.Item
          label="检查URL"
          name={["healthCheck", "url"]}
          rules={isOn ? [{ required: true }] : []}
          help={
            <span>
              填写完整的检测地址，例如 <code>{"http://${host}/health"}</code>。地址包括协议（http 或
              https）、主机、可选端口、路径和查询参数。主机可以填写已部署到当前集群的网站域名，也可以使用 <code>{"${host}"}</code>
              ，系统会将其替换为当前被检测节点的 IP。使用 HTTPS 时，请填写已配置 SSL 证书的域名；端口、路径和查询参数按需填写。
            </span>
          }
        >
          <Input disabled={!isOn} placeholder="http://${host}/" />
        </Form.Item>
        <Form.Item label="检测间隔" name={["healthCheck", "interval"]} help="两次健康检查开始之间的等待时间。">
          <TimeDurationInput disabled={!isOn} />
        </Form.Item>
        <Form.Item label="超时时间" name={["healthCheck", "timeout"]} help="单次请求等待响应的最长时间；超过后，本次检查视为失败。">
          <TimeDurationInput disabled={!isOn} />
        </Form.Item>
        <Form.Item
          label="期望状态码"
          name={["healthCheck", "statusCodes"]}
          help="填写允许的 HTTP 状态码；填写后，仅当检测 URL 返回的状态码在此列表中时，才认为本次检查成功。多个状态码用逗号或空格分隔，例如 200、301、302；留空时不限制状态码。"
        >
          <Select disabled={!isOn} mode="tags" tokenSeparators={[",", " "]} />
        </Form.Item>
        <Form.Item
          label="尝试次数"
          name={["healthCheck", "countTries"]}
          help="单次健康检查最多发起的请求次数；第一次失败后，会按“失败后尝试间隔”重新发起请求，最多支持 10 次。"
        >
          <InputNumber disabled={!isOn} min={1} />
        </Form.Item>
        <Form.Item label="失败后尝试间隔" name={["healthCheck", "tryDelay"]} help="单次请求失败后，重新发起下一次尝试前等待的时间。">
          <TimeDurationInput disabled={!isOn} />
        </Form.Item>
        <Form.Item
          label="自动下线"
          name={["healthCheck", "autoDown"]}
          valuePropName="checked"
          help="选中后，系统会根据健康检查结果自动将节点（或节点 IP）标记为上线或下线，并可能自动同步 DNS 设置；取消选中时只记录检查结果，不自动修改上线状态。"
        >
          <Switch disabled={!isOn} />
        </Form.Item>
        <Form.Item
          label="恢复阈值"
          name={["healthCheck", "countUp"]}
          help="启用自动下线后，连续健康检查成功达到此次数，才将节点（或节点 IP）恢复上线。"
        >
          <InputNumber disabled={!isOn} min={1} />
        </Form.Item>
        <Form.Item
          label="下线阈值"
          name={["healthCheck", "countDown"]}
          help="启用自动下线后，连续健康检查失败达到此次数，才将节点（或节点 IP）标记为下线。"
        >
          <InputNumber disabled={!isOn} min={1} />
        </Form.Item>
        <Form.Item label="User-Agent" name={["healthCheck", "userAgent"]} help="健康检查请求使用的 User-Agent；留空时使用系统默认值。">
          <Input disabled={!isOn} />
        </Form.Item>
        <Form.Item
          label="仅基础请求"
          name={["healthCheck", "onlyBasicRequest"]}
          valuePropName="checked"
          help="仅执行基础请求，不经过 WAF、反向代理等处理，也不会检查源站。"
        >
          <Switch disabled={!isOn} />
        </Form.Item>
        <Form.Item
          label="记录访问日志"
          name={["healthCheck", "accessLogIsOn"]}
          valuePropName="checked"
          help="选中后，健康检查产生的请求会记录在访问日志中。"
        >
          <Switch disabled={!isOn} />
        </Form.Item>
      </div>
    </Card>
  );
};

const GlobalServerSettings = ({ form }: { form: FormInstance }) => {
  const matchDomainStrictly = Form.useWatch(["globalServerConfig", "httpAll", "matchDomainStrictly"], form);
  const allowNodeIP = Form.useWatch(["globalServerConfig", "httpAll", "allowNodeIP"], form);
  const nodeIPShowPage = Form.useWatch(["globalServerConfig", "httpAll", "nodeIPShowPage"], form);
  const domainMismatchActionCode = Form.useWatch(["globalServerConfig", "httpAll", "domainMismatchAction", "code"], form) ?? "page";
  const lnRequestSchedulingMethod = Form.useWatch(["globalServerConfig", "httpAll", "lnRequestSchedulingMethod"], form);

  return (
    <Card title="网站设置" variant="borderless" size="small" styles={cardStyles}>
      <Card title="域名绑定" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="禁止未绑定域名访问"
          name={["globalServerConfig", "httpAll", "matchDomainStrictly"]}
          valuePropName="checked"
          help="选中后，表示禁止未在网站绑定的域名和IP访问。"
        >
          <Switch />
        </Form.Item>

        <div hidden={!matchDomainStrictly}>
          <Form.Item
            label="处理未绑定域名方式"
            name={["globalServerConfig", "httpAll", "domainMismatchAction", "code"]}
            initialValue="page"
            help={
              domainMismatchActionCode === "page"
                ? "显示提示内容。"
                : domainMismatchActionCode === "redirect"
                  ? "跳转到一个特定URL。"
                  : "直接关闭网络连接，不提示任何内容。"
            }
          >
            <Radio.Group
              options={[
                { label: "显示提示页面", value: "page" },
                { label: "跳转到网址", value: "redirect" },
                { label: "关闭连接", value: "close" },
              ]}
            />
          </Form.Item>

          <div hidden={domainMismatchActionCode !== "page"}>
            <Form.Item
              label="提示页面状态码"
              name={["globalServerConfig", "httpAll", "domainMismatchAction", "options", "statusCode"]}
              help="访问未绑定域名时的提示页面状态码，默认404。"
            >
              <InputNumber min={100} max={999} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item
              label="提示页面内容"
              name={["globalServerConfig", "httpAll", "domainMismatchAction", "options", "contentHTML"]}
              help="访问未绑定的域名时提示页面内容，可以使用HTML；仅限于HTTP请求，不适于用HTTPS（HTTPS会提示证书错误）。"
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>

          <Form.Item
            hidden={domainMismatchActionCode !== "redirect"}
            label="跳转目标网址URL"
            name={["globalServerConfig", "httpAll", "domainMismatchAction", "options", "url"]}
            help="必须以http://或者https://开头，支持使用变量。"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            label="允许例外的域名"
            name={["globalServerConfig", "httpAll", "allowMismatchDomains"]}
            help="允许这些域名不经过绑定就可以直接访问网站。"
          >
            <Select mode="tags" placeholder="请输入域名" tokenSeparators={[",", " ", "\n"]} />
          </Form.Item>
          <Form.Item
            label="默认域名"
            name={["globalServerConfig", "httpAll", "defaultDomain"]}
            help="例外域名或使用节点IP访问时使用的默认域名；如果指定的域名在集群里已经绑定到某个网站，则相当于直接访问该网站。"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="允许使用节点IP访问"
            name={["globalServerConfig", "httpAll", "allowNodeIP"]}
            valuePropName="checked"
            help="选中后，表示允许直接使用节点IP访问网站。"
          >
            <Switch />
          </Form.Item>

          <div hidden={!allowNodeIP}>
            <Form.Item
              label="访问节点IP显示自定义内容"
              name={["globalServerConfig", "httpAll", "nodeIPShowPage"]}
              valuePropName="checked"
              help="选中后，表示用户访问节点IP时显示自定义内容。"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              hidden={!nodeIPShowPage}
              label="访问节点IP自定义内容"
              name={["globalServerConfig", "httpAll", "nodeIPPageHTML"]}
              help="访问节点IP时要显示的自定义内容，支持HTML。"
            >
              <Input.TextArea rows={3} placeholder="访问节点IP时要显示的自定义内容" />
            </Form.Item>
          </div>
        </div>
      </Card>

      <Divider />

      <Card title="Ln节点" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="强制Ln请求"
          name={["globalServerConfig", "httpAll", "forceLnRequest"]}
          valuePropName="checked"
          help="选中后，所有请求优先发送到L2或者更高级别节点。默认不开启的情况下，只有可以缓存的内容请求才会发送到L2或者更高级别节点。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Ln请求负载均衡方法"
          name={["globalServerConfig", "httpAll", "lnRequestSchedulingMethod"]}
          help={
            lnRequestSchedulingMethod === "random"
              ? "当存在多个Ln节点时，将请求随机发送到某个Ln节点。"
              : "当存在多个Ln节点时，将请求根据URL自动映射到某个固定的Ln节点。"
          }
        >
          <Select
            options={[
              { label: "URL映射", value: "urlMapping" },
              { label: "随机", value: "random" },
            ]}
          />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="TCP/UDP相关" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="允许的端口范围"
          style={{ marginBottom: 0 }}
          help="用户创建TCP/TLS负载均衡服务时可以随机选择的端口范围，最小不能小于1024，最大不能大于65534。"
        >
          <Form.Item name={["globalServerConfig", "tcpAll", "portRangeMin"]} style={{ display: "inline-block", width: "calc(50% - 12px)" }}>
            <InputNumber min={1024} max={65534} style={{ width: "100%" }} />
          </Form.Item>
          <span style={{ display: "inline-block", width: "24px", lineHeight: "32px", textAlign: "center" }}>-</span>
          <Form.Item name={["globalServerConfig", "tcpAll", "portRangeMax"]} style={{ display: "inline-block", width: "calc(50% - 12px)" }}>
            <InputNumber min={1024} max={65534} style={{ width: "100%" }} />
          </Form.Item>
        </Form.Item>
        <Form.Item label="禁止端口" name={["globalServerConfig", "tcpAll", "denyPorts"]} help="禁止使用的端口列表">
          <Select mode="tags" placeholder="请输入端口" tokenSeparators={[",", " "]} />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="访问日志" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="允许记录访问日志"
          name={["globalServerConfig", "httpAccessLog", "isOn"]}
          valuePropName="checked"
          help="选中后，表示允许当前集群下的网站记录访问日志，否则当前集群下的所有网站都不会记录访问日志。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="记录请求报头"
          name={["globalServerConfig", "httpAccessLog", "enableRequestHeaders"]}
          valuePropName="checked"
          help="选中后，表示在访问日志中记录请求报头。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="只记录通用请求报头"
          name={["globalServerConfig", "httpAccessLog", "commonRequestHeadersOnly"]}
          valuePropName="checked"
          help="选中后，表示访问日志中只记录通用的HTTP请求报头（比如User-Agent），其他自定义或非标准的（比如Test-Header）将不记录。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="记录响应报头"
          name={["globalServerConfig", "httpAccessLog", "enableResponseHeaders"]}
          valuePropName="checked"
          help="选中后，表示在访问日志中记录响应报头。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="记录Cookie"
          name={["globalServerConfig", "httpAccessLog", "enableCookies"]}
          valuePropName="checked"
          help="选中后，表示访问日志中记录Cookie内容。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="记录找不到网站日志"
          name={["globalServerConfig", "httpAccessLog", "enableServerNotFound"]}
          valuePropName="checked"
          help="选中后，表示如果访客访问的域名对应的网站不存在也会记录日志。"
        >
          <Switch />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="运行日志" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="记录网站错误"
          name={["globalServerConfig", "log", "recordServerError"]}
          valuePropName="checked"
          help="在节点运行日志中记录网站相关错误详细信息，比如无法连接源站等，建议仅用于调试。"
        >
          <Switch />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="性能设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="自动读数据超时"
          name={["globalServerConfig", "performance", "autoReadTimeout"]}
          valuePropName="checked"
          help="从客户端读取数据时自动设置超时时间，如果超时，则自动视为慢连接，并关闭网络连接；此为专业选项，请在专家指导下进行修改。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动写数据超时"
          name={["globalServerConfig", "performance", "autoWriteTimeout"]}
          valuePropName="checked"
          help="向客户端发送数据时自动设置超时时间，如果超时，则自动视为慢连接，并关闭网络连接；此为专业选项，请在专家指导下进行修改。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="调试模式"
          name={["globalServerConfig", "performance", "debug"]}
          valuePropName="checked"
          help="开启调试模式后，将在某些信息中包含调试信息。"
        >
          <Switch />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="其他" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item
          label="服务器旗标"
          name={["globalServerConfig", "httpAll", "serverName"]}
          help={
            <div>
              服务器旗标会以<Tag>Server: 旗标</Tag>的形式出现在响应报头中。
            </div>
          }
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="支持低版本HTTP"
          name={["globalServerConfig", "httpAll", "supportsLowVersionHTTP"]}
          valuePropName="checked"
          help={
            <div>
              选中后，表示支持<Tag>HTTP/1.0</Tag>、<Tag>HTTP/0.9</Tag>等低于<Tag>HTTP/1.1</Tag>
              版本的HTTP协议。低版本HTTP协议不支持分段传输内容，且无法保持连接，对系统性能有严重的负面影响。建议只有在你的用户正在使用非常老旧的设备时才启用此选项。
            </div>
          }
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动匹配证书"
          name={["globalServerConfig", "httpAll", "matchCertFromAllServers"]}
          valuePropName="checked"
          help="选中后，表示找不到证书时自动查找其他网站设置的证书。此功能仅仅为了兼容以往系统版本，可能会导致用户访问的网站混乱，所以请不要轻易启用。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="支持${serverAddr}变量"
          name={["globalServerConfig", "httpAll", "enableServerAddrVariable"]}
          valuePropName="checked"
          help={
            <div>
              选中后，表示支持在自定义页面中使用<Tag>{"${serverAddr}"}</Tag>变量，用来表示访客当前正在访问的服务器地址。
            </div>
          }
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="自动gzip回源"
          name={["globalServerConfig", "httpAll", "requestOriginsWithEncodings"]}
          valuePropName="checked"
          help={
            <div>
              选中后，表示自动使用<Tag>Accept-Encoding: gzip, ...</Tag>回源，可以用来节约源站流量。
            </div>
          }
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="XFF中最多地址数"
          name={["globalServerConfig", "httpAll", "xffMaxAddresses"]}
          help={
            <div>
              可以转发的<Tag>X-Forwarded-For</Tag>中最多的地址数，如果为0表示不限制；不要轻易修改此选项，避免无法获取真实的客户端地址。
            </div>
          }
        >
          <InputNumber min={0} />
        </Form.Item>
      </Card>
    </Card>
  );
};

const CacheAndWafSettings = ({ form }: { form: FormInstance }) => {
  return (
    <Card title="缓存与防火墙" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="HTTP缓存策略" name="httpCachePolicyId">
        <CachePolicySelector />
      </Form.Item>
      <Form.Item label="HTTP防火墙策略" name="httpFirewallPolicyId">
        <WafPolicySelector />
      </Form.Item>

      <Divider />
      <UAMSettings form={form} />
      <Divider />
      <CCSettings form={form} />
      <Divider />
      <DDoSSettings form={form} />
    </Card>
  );
};

// const WafActionsSettings = () => <div style={{ padding: 20 }}>TODO: WAF动作设置</div>;

const WebPSettings = ({ form }: { form: FormInstance }) => {
  const isOn = Form.useWatch(["webpPolicy", "isOn"], form);
  return (
    <Card title="WebP设置" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="启用WebP功能" name={["webpPolicy", "isOn"]} valuePropName="checked" help="选中后，表示当前集群下的网站可以使用WebP转换功能。">
        <Switch />
      </Form.Item>
      <div hidden={!isOn}>
        <Form.Item
          label="图片质量"
          name={["webpPolicy", "quality"]}
          help="取值在0到100之间，0表示自动调节；数值越大生成的图像越清晰，文件尺寸也会越大，同时消耗的系统资源越多（在低配置的边缘节点上建议不超过50%）。"
        >
          <CompactField addonAfter="%">
            <InputNumber min={0} max={100} />
          </CompactField>
        </Form.Item>
        <Form.Item
          label="需要满足缓存条件"
          name={["webpPolicy", "requireCache"]}
          valuePropName="checked"
          help="选中后，表示图片URL需要满足缓存条件后才会转换，防止实时转换消耗巨大的系统资源。"
        >
          <Switch />
        </Form.Item>
        <Form.Item label="可转换的最小尺寸" name={["webpPolicy", "minLength"]} help="不低于此尺寸的图像文件的才会转换。">
          <SizeCapacityInput />
        </Form.Item>
        <Form.Item label="可转换的最大尺寸" name={["webpPolicy", "maxLength"]} help="不高于此尺寸的图像文件的才会转换。">
          <SizeCapacityInput />
        </Form.Item>
      </div>
    </Card>
  );
};

const UAMSettings = ({ form }: { form: FormInstance }) => {
  const isOn = Form.useWatch(["uamPolicy", "isOn"], form);
  return (
    <Card title="5秒盾 (UAM)" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item label="启用5秒盾功能" name={["uamPolicy", "isOn"]} valuePropName="checked" help="选中后，表示当前集群下的网站可以使用5秒盾功能。">
        <Switch />
      </Form.Item>
      <div hidden={!isOn}>
        <Form.Item
          label="验证有效期"
          name={["uamPolicy", "keyLife"]}
          help="单个客户端验证通过后，在这个有效期内不再重复验证；如果为0则表示默认3600秒。"
        >
          <CompactField addonAfter="秒">
            <InputNumber min={0} />
          </CompactField>
        </Form.Item>
        <Form.Item label="拦截时长" name={["uamPolicy", "blockSeconds"]} help="验证失败后，系统拦截的时间。">
          <CompactField addonAfter="秒">
            <InputNumber min={0} />
          </CompactField>
        </Form.Item>
        <Form.Item label="最大失败次数" name={["uamPolicy", "maxFails"]} help="失败尝试达到此数字后，则认为验证失败。">
          <CompactField addonAfter="次">
            <InputNumber min={0} />
          </CompactField>
        </Form.Item>
        <Form.Item label="页面标题" name={["uamPolicy", "uiTitle"]} help="提示页面的标题。">
          <Input />
        </Form.Item>
        <Form.Item
          label="页面提示内容"
          name={["uamPolicy", "uiBody"]}
          help={
            <span>
              提示页面的HTML内容，支持请求变量（比如<code>{"${host}"}</code>表示正在访问的域名，<code>{"${product.name}"}</code>
              表示当前系统产品名称），留空表示使用默认提示内容；用&lt;span class=&quot;ui-counter&quot;&gt;5&lt;/span&gt;表示数字倒计时计数器。
            </span>
          }
        >
          <Input.TextArea rows={8} />
        </Form.Item>
        <Form.Item
          label="允许常见搜索引擎"
          name={["uamPolicy", "allowSearchEngines"]}
          valuePropName="checked"
          help="选中表示允许Google、Bing等常见搜索引擎直接跳过检查。"
        >
          <Switch />
        </Form.Item>
        <Form.Item label="拦截常见爬虫" name={["uamPolicy", "denySpiders"]} valuePropName="checked" help="选中表示自动拦截Python、Scrapy等常见爬虫。">
          <Switch />
        </Form.Item>
        <Form.Item label="包含子域名" name={["uamPolicy", "includeSubdomains"]} valuePropName="checked" help="选中后，表示子域名之间只需验证一次。">
          <Switch />
        </Form.Item>
        <Form.Item
          label="防火墙拦截范围"
          name={["uamPolicy", "firewall", "scope"]}
          help={
            <div>
              “所有网站”表示IP被拦截时，将被阻止访问所有网站；此时系统可以自动尝试利用本地防火墙提升拦截效率。
              <br />
              “当前网站”表示IP被拦截时，只会阻止访问当前网站；选择此选项会严重影响拦截效率，建议只有特殊情况下才使用。
            </div>
          }
        >
          <Select
            options={[
              { label: "所有网站", value: "global" },
              { label: "当前网站", value: "service" },
            ]}
          />
        </Form.Item>
      </div>
    </Card>
  );
};

const CCSettings = ({ form }: { form: FormInstance }) => {
  const isOn = Form.useWatch(["httpCCPolicy", "isOn"], form);
  return (
    <Card title="CC防护" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item
        label="启用CC防护功能"
        name={["httpCCPolicy", "isOn"]}
        valuePropName="checked"
        help="选中后，表示当前集群下的网站可以使用CC防护功能。"
      >
        <Switch />
      </Form.Item>
      <div hidden={!isOn}>
        <Form.List name={["httpCCPolicy", "thresholds"]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  size="small"
                  variant="borderless"
                  styles={cardStyles}
                  title={`检测阈值 ${index + 1}`}
                  key={key}
                  style={{ marginBottom: 16 }}
                  extra={
                    <Button danger size="small" onClick={() => remove(name)}>
                      删除
                    </Button>
                  }
                >
                  <Form.Item {...restField} label="计算周期" name={[name, "periodSeconds"]} help="0表示默认">
                    <CompactField addonAfter="秒">
                      <InputNumber min={0} />
                    </CompactField>
                  </Form.Item>
                  <Form.Item {...restField} label="最大请求数" name={[name, "maxRequests"]} help="0表示默认">
                    <InputNumber min={0} />
                  </Form.Item>
                  <Form.Item {...restField} label="拦截时间" name={[name, "blockSeconds"]} help="0表示默认">
                    <CompactField addonAfter="秒">
                      <InputNumber min={0} />
                    </CompactField>
                  </Form.Item>
                </Card>
              ))}
              <Form.Item label="检测阈值">
                <Button type="dashed" onClick={() => add()} block>
                  + 添加检测阈值
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item label="单IP最大并发连接数" name={["httpCCPolicy", "maxConnectionsPerIP"]} help="如果为0表示使用默认。">
          <InputNumber min={0} />
        </Form.Item>

        <Card variant="borderless" size="small" styles={cardStyles} title="跳转检测" style={{ marginBottom: 16 }}>
          <Form.Item
            label="跳转检测路径"
            name={["httpCCPolicy", "redirectsChecking", "validatePath"]}
            help="如果不填表示使用默认；必须是一个特殊的URL以避免用户访问异常。"
          >
            <Input />
          </Form.Item>
          <Form.Item label="跳转检测周期" name={["httpCCPolicy", "redirectsChecking", "durationSeconds"]} help="如果为0表示使用默认。">
            <CompactField addonAfter="秒">
              <InputNumber min={0} />
            </CompactField>
          </Form.Item>
          <Form.Item label="跳转检测最多次数" name={["httpCCPolicy", "redirectsChecking", "maxRedirects"]} help="如果为0表示使用默认。">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item label="跳转检测拦截时间" name={["httpCCPolicy", "redirectsChecking", "blockSeconds"]} help="如果为0表示使用默认。">
            <CompactField addonAfter="秒">
              <InputNumber min={0} />
            </CompactField>
          </Form.Item>
        </Card>

        <Form.Item
          label="防火墙拦截范围"
          name={["httpCCPolicy", "firewall", "scope"]}
          help={
            <div>
              “所有网站”表示IP被拦截时，将被阻止访问所有网站；此时系统可以自动尝试利用本地防火墙提升拦截效率。
              <br />
              “当前网站”表示IP被拦截时，只会阻止访问当前网站；选择此选项会严重影响拦截效率，建议只有特殊情况下才使用。
            </div>
          }
        >
          <Select
            options={[
              { label: "所有网站", value: "global" },
              { label: "当前网站", value: "service" },
            ]}
          />
        </Form.Item>
      </div>
    </Card>
  );
};

// const HTTPPagesSettings = () => {
//   return (
//     <Card title="自定义页面" variant="borderless" size="small" styles={cardStyles}>
//       <Form.Item label="启用" name={["httpPagesPolicy", "isOn"]} valuePropName="checked">
//         <Switch />
//       </Form.Item>
//       <div style={{ color: "#999" }}>页面列表配置待实现</div>
//     </Card>
//   );
// };

const HTTP3Settings = ({ form }: { form: FormInstance }) => {
  const isOn = Form.useWatch(["http3Policy", "isOn"], form);
  return (
    <Card title="HTTP/3" variant="borderless" size="small" styles={cardStyles}>
      <Form.Item
        label="启用HTTP/3功能"
        name={["http3Policy", "isOn"]}
        valuePropName="checked"
        help="选中后，表示当前集群下的网站可以使用HTTP/3功能；单个网站可以在HTTPS设置页面里启用HTTP/3。"
      >
        <Switch />
      </Form.Item>
      <div hidden={!isOn}>
        <Form.Item
          label="UDP端口"
          name={["http3Policy", "port"]}
          help="HTTP/3通讯使用的UDP端口，范围在1-1024，请在服务器安全策略或者防火墙中设置此端口为通过。"
        >
          <InputNumber min={1} max={1024} />
        </Form.Item>
        <Form.Item
          label="支持手机浏览器"
          name={["http3Policy", "supportMobileBrowsers"]}
          valuePropName="checked"
          help="在手机浏览器上也尝试开启HTTP/3；当下部分手机浏览器对HTTP/3支持的并不完善，请根据自己的需要决定是否启用。"
        >
          <Switch />
        </Form.Item>
      </div>
    </Card>
  );
};

const WebPAndHTTP3Settings = ({ form }: { form: FormInstance }) => {
  return (
    <>
      <WebPSettings form={form} />
      <Divider />
      <HTTP3Settings form={form} />
    </>
  );
};

// const MetricItemsSettings = () => <div style={{ padding: 20 }}>TODO: 统计指标设置</div>;

const DDoSSettings = ({ form }: { form: FormInstance }) => {
  const isOn = Form.useWatch(["ddosProtection", "tcp", "isOn"], form);
  return (
    <Card title="DDoS防护" variant="borderless" size="small" styles={cardStyles}>
      <div style={{ color: "#999", marginBottom: 16 }}>
        功能说明：此功能为<strong>试验性质</strong>，目前仅能防御简单的DDoS攻击，试验期间建议仅在被攻击时启用，仅支持已安装<code>nftables v0.9</code>
        以上的Linux系统。
      </div>
      <Card title="TCP设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="启用DDoS防护" name={["ddosProtection", "tcp", "isOn"]} valuePropName="checked">
          <Switch />
        </Form.Item>
        <div hidden={!isOn}>
          <Form.Item
            label="单节点TCP最大连接数"
            name={["ddosProtection", "tcp", "maxConnections"]}
            help="单个节点可以接受的TCP最大连接数。如果为0，则默认为默认配置。"
          >
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item
            label="单IP TCP最大连接数"
            name={["ddosProtection", "tcp", "maxConnectionsPerIP"]}
            help="单个IP可以连接到节点的TCP最大连接数。如果为0，则默认为默认配置。"
          >
            <InputNumber min={0} />
          </Form.Item>

          <Form.Item label="单IP TCP新连接速率（分钟）" style={{ marginBottom: 0 }}>
            <Form.Item
              name={["ddosProtection", "tcp", "newConnectionsMinutelyRate"]}
              style={{ display: "inline-block", width: "calc(50% - 12px)" }}
              help="单个IP每分钟可以创建TCP新连接的数量。如果为0，则默认为默认配置。如果没有填写屏蔽时间，则只丢弃数据包。"
            >
              <CompactField addonAfter="个新连接/每分钟" block>
                <InputNumber min={0} style={{ width: "100%" }} />
              </CompactField>
            </Form.Item>
            <span style={{ display: "inline-block", width: "24px", lineHeight: "32px", textAlign: "center" }}>屏蔽</span>
            <Form.Item
              name={["ddosProtection", "tcp", "newConnectionsMinutelyRateBlockTimeout"]}
              style={{ display: "inline-block", width: "calc(50% - 12px)" }}
              help="屏蔽时间。"
            >
              <CompactField addonAfter="秒" block>
                <InputNumber min={0} style={{ width: "100%" }} />
              </CompactField>
            </Form.Item>
          </Form.Item>

          <Form.Item label="单IP TCP新连接速率（秒钟）" style={{ marginBottom: 0 }}>
            <Form.Item
              name={["ddosProtection", "tcp", "newConnectionsSecondlyRate"]}
              style={{ display: "inline-block", width: "calc(50% - 12px)" }}
              help="单个IP每秒钟可以创建TCP新连接的数量。如果为0，则默认为默认配置。如果没有填写屏蔽时间，则只丢弃数据包。"
            >
              <CompactField addonAfter="个新连接/每秒钟" block>
                <InputNumber min={0} style={{ width: "100%" }} />
              </CompactField>
            </Form.Item>
            <span style={{ display: "inline-block", width: "24px", lineHeight: "32px", textAlign: "center" }}>屏蔽</span>
            <Form.Item
              name={["ddosProtection", "tcp", "newConnectionsSecondlyRateBlockTimeout"]}
              style={{ display: "inline-block", width: "calc(50% - 12px)" }}
              help="屏蔽时间。"
            >
              <CompactField addonAfter="秒" block>
                <InputNumber min={0} style={{ width: "100%" }} />
              </CompactField>
            </Form.Item>
          </Form.Item>
        </div>
      </Card>
    </Card>
  );
};

// const ThresholdSettings = () => <div style={{ padding: 20 }}>TODO: 阈值设置</div>;

// const MessageSettings = () => <div style={{ padding: 20 }}>TODO: 消息通知设置</div>;

// const TOASettings = ({ form }: { form: FormInstance }) => {
//   const isOn = Form.useWatch(['toa', 'isOn'], form);
//   return (
//     <Card title="TOA设置" variant="borderless" size="small" styles={cardStyles}>
//       <Form.Item label="启用TOA" name={['toa', 'isOn']} valuePropName="checked">
//         <Switch />
//       </Form.Item>
//       {isOn && (
//         <>
//           <Form.Item label="调试模式" name={['toa', 'debug']} valuePropName="checked">
//             <Switch />
//           </Form.Item>
//           <Form.Item label="自动配置" name={['toa', 'autoSetup']} valuePropName="checked">
//             <Switch />
//           </Form.Item>
//           <Form.Item label="本地端口范围" style={{ marginBottom: 0 }}>
//             <Form.Item name={['toa', 'minLocalPort']} style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}>
//               <InputNumber placeholder="Min" style={{ width: '100%' }} />
//             </Form.Item>
//             <span style={{ display: 'inline-block', width: '16px', textAlign: 'center' }}>-</span>
//             <Form.Item name={['toa', 'maxLocalPort']} style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}>
//               <InputNumber placeholder="Max" style={{ width: '100%' }} />
//             </Form.Item>
//           </Form.Item>
//         </>
//       )}
//     </Card>
//   );
// };

export default function ClusterSettings() {
  const navigate = useNavigate();
  const { clusterId } = useParams();
  const location = useLocation();

  const query = useQuery<FindEnabledNodeClusterResponse>({
    queryKey: clusterQueryKeys.settings(clusterId),
    queryFn: () => getClusterSettings(clusterId),
    enabled: Boolean(clusterId),
  });
  const data = query.data;
  const loading = query.isPending || query.isFetching;
  const pageContainerLoading = loading && !data;
  const [form] = Form.useForm();
  const { message: messageApi } = App.useApp();

  const [activeTab, setActiveTab] = useState("basic");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      form.resetFields();
    }
  }, [data, form]);

  const handleSave = async (values: NodeCluster) => {
    const nodeCluster = normalizeEmptyRootObjectsForSubmit(values);

    setSubmitting(true);
    try {
      await request(`/api/cluster/${data?.nodeCluster?.id}`, {
        method: "PUT",
        data: {
          nodeCluster,
        },
      });
      messageApi.success("保存成功");
      navigate("/clusters");
    } catch (error) {
      console.error(error);
      messageApi.error(formatErrorMessage("保存失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return <Card loading />;
  }

  const itemChildren = {
    basic: <BasicSettings />,
    dns: <DNSSettings data={data} />,
    health: <HealthCheckSettings form={form} healthCheck={data.nodeCluster?.healthCheck} />,
    global: <GlobalServerSettings form={form} />,
    "cache-waf": <CacheAndWafSettings form={form} />,
    "webp-http3": <WebPAndHTTP3Settings form={form} />,
    schedule: <ScheduleSettingsPanel scope="cluster" clusterId={clusterId!} />,
    threshold: <ThresholdSettingsPanel scope="cluster" clusterId={clusterId!} />,
    msg: <ClusterMessageSettingsPanel clusterId={clusterId!} />,
  } as const;
  const activeTabConfig = findSettingsTabByKey(clusterSettingsTabItems, activeTab);
  const items = clusterSettingsTabItems.map((item) => ({
    key: item.key,
    label: item.label,
    forceRender: shouldForceRenderSettingsTab(item),
    children: itemChildren[item.key as keyof typeof itemChildren],
  }));

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.nodeCluster?.name,
        fallbackEntityLabel: "集群",
        tabList: getClusterTabList(clusterId!),
      })}
      header={{ title: data?.nodeCluster?.name || "集群设置" }}
      tabList={getClusterTabList(clusterId!)}
      tabActiveKey={location.pathname}
      loading={pageContainerLoading}
      onTabChange={(key) => navigate(key)}
    >
      <Card style={{ marginBottom: "80px" }}>
        {loading ? (
          <Spin size="large" />
        ) : (
          <Form
            form={form}
            name="clusterSettings"
            initialValues={data?.nodeCluster}
            onFinish={handleSave}
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
                <Button type="primary" onClick={() => form.submit()} loading={submitting}>
                  保存
                </Button>
              </FooterToolbar>
            ) : null}
          </Form>
        )}
      </Card>
    </PageContainer>
  );
}
