import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request, useLocation, useNavigate, useParams } from "@umijs/max";
import { CheckCircleFilled, CopyOutlined, PauseCircleFilled } from "@ant-design/icons";
import { serverQueryKeys } from "@/queries/keys";
import { getServerSettings } from "@/services/servers";
import { CustomFormItemProps, formatErrorMessage, randomString } from "@/utils";
import {
  Button,
  Card,
  Alert,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from "antd";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

import type { FindEnabledServerResponse } from "@/pb/service_server_pb";
import type { Server } from "@/pb/models/model_server_pb";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Origin } from "@/pb/models/model_origin_pb";
import type { TableProps } from "antd/lib";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import OriginSettingsForm from "@/components/form/OriginSettingsForm";
import { MultiListenPortInput } from "@/components/MultiListenPortInput";
import { ServerGroupSelector } from "@/components/ServerGroupSelector";
import UAMFormInput from "@/components/UAMFormInput";
import CCFormInput from "@/components/CCFormInput";
import { FirewallPolicyFormInput, FirewallRefFormInput } from "@/components/WafFormInput";
import { CacheRefsInput } from "@/components/CacheRefsInput";
import { buildCacheSettingsValues } from "@/components/form/cacheSettings";
import { ContentOptimizationSettings } from "./_components/ContentOptimizationSettings";
import { buildContentOptimizationValues } from "./_shared/contentOptimization";
import { HostRedirectInput } from "@/components/HostRedirectInput";
import { RewriteRuleInput } from "@/components/RewriteRuleInput";
import { HeaderPolicyInput } from "@/components/HeaderPolicyInput";
import { RemoteAddrFormInput } from "@/components/RemoteAddrFormInput";
import { WebSocketFormInput } from "@/components/WebSocketFormInput";
import { getServerTabList } from "./_shared/serverTabList";
import { CertsSelector } from "@/components/CertsSelector";
import { OriginConnectionFields } from "@/components/form/OriginConnectionFields";
import { buildOriginValues, buildOriginSettingsValues } from "@/components/form/originSettings";
import { buildHTTPSFirstEnableDefaults } from "./_shared/httpsDefaults";

const cardStyles = {
  header: { borderBottom: 0 },
};

// 源站列表管理控制
const OriginsManager: React.FC<CustomFormItemProps<Origin[]>> = ({ value: origins, onChange }) => {
  const [form] = Form.useForm();
  const [showPopup, setShowPopup] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const originColumns: TableProps<Origin>["columns"] = [
    {
      title: "源站地址",
      key: "addr",
      render: (_, origin) => `${origin.addr?.protocol}://${origin.addr?.host}:${origin.addr?.portRange}`,
    },
    {
      title: "权重",
      dataIndex: "weight",
    },
    {
      title: "状态",
      dataIndex: "isOn",
      render: (isOn) => (
        <Tag color={isOn ? "success" : "error"} variant="filled" icon={isOn ? <CheckCircleFilled /> : <PauseCircleFilled />}>
          {isOn ? "已启用" : "已停用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, origin) => (
        <Space size="middle">
          <a onClick={() => createPopup(origin)}>修改</a>
          <a
            style={{ color: origin.isOn ? "var(--ant-color-error)" : "var(--ant-color-success)" }}
            onClick={(e) => {
              return onChange
                ? onChange(
                    origins?.map((o) => {
                      if (o.id === origin.id) {
                        o.isOn = !origin.isOn;
                      }
                      return o;
                    }),
                  )
                : e.preventDefault();
            }}
          >
            {origin.isOn ? "停用" : "启用"}
          </a>
          <Popconfirm title="确定删除吗？" onConfirm={() => onChange?.(origins?.filter((o) => o.id !== origin.id))}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 提交源站表单
  const handleOriginSave = () => {
    setConfirmLoading(true);
    form.submit();
  };
  const handleOriginSaveError = () => {
    setConfirmLoading(false);
  };
  // 保存源站到表单
  const handleSuccess = (saveResponse?: Origin) => {
    let isNew = true;
    const newOrigins = (origins ?? []).map((o) => {
      if (o.id === saveResponse?.id) {
        isNew = false;
        return saveResponse;
      }
      return o;
    });

    if (isNew && saveResponse) {
      newOrigins?.push(saveResponse);
    }

    if (onChange) onChange(newOrigins);
    setConfirmLoading(false);
    setShowPopup(false);
  };

  const createPopup = (origin?: Origin) => {
    form.resetFields();
    form.setFieldsValue(buildOriginValues(origin));
    setShowPopup(true);
  };

  return (
    <>
      <Space style={{ marginBottom: 10 }}>
        <Button onClick={() => createPopup()}>添加源站</Button>
      </Space>
      <Table<Origin> columns={originColumns} dataSource={origins} size="small" rowKey={(origin) => origin.id} pagination={false} />
      {showPopup ? (
        <Modal
          title={form.getFieldValue("id") ? "修改源站" : "添加源站"}
          open={true}
          onCancel={() => setShowPopup(false)}
          onOk={handleOriginSave}
          confirmLoading={confirmLoading}
          style={{ top: 24 }}
          styles={{ body: { maxHeight: "calc(100dvh - 200px)", overflowY: "auto", paddingInlineEnd: 8 } }}
          width={{
            xs: "90%",
            sm: "80%",
            md: "70%",
            lg: "60%",
            xl: "50%",
            xxl: "40%",
          }}
        >
          <OriginSettingsForm form={form} onError={handleOriginSaveError} onSuccess={handleSuccess} />
        </Modal>
      ) : null}
    </>
  );
};

const BasicSettings = ({ form }: { form: FormInstance<Server> }) => {
  const isHTTPEnabled = Form.useWatch(["http", "isOn"], form);
  const isHTTPSEnabled = Form.useWatch(["https", "isOn"], form);
  const httpsValue = Form.useWatch("https", form);
  const groupUserId = Form.useWatch("userId", { form, preserve: true });
  const userId = Number(form.getFieldValue(["user", "id"]) || 0);
  const previousHTTPSEnabledRef = useRef(Boolean(isHTTPSEnabled));

  useEffect(() => {
    if (!isHTTPSEnabled) {
      previousHTTPSEnabledRef.current = false;
      return;
    }

    const wasHTTPSEnabled = previousHTTPSEnabledRef.current;
    previousHTTPSEnabledRef.current = true;
    if (wasHTTPSEnabled) {
      return;
    }

    const defaults = buildHTTPSFirstEnableDefaults(httpsValue);
    if (defaults) {
      form.setFieldsValue({ https: defaults });
    }
  }, [form, httpsValue, isHTTPSEnabled]);

  const copyCNAME = async () => {
    const cname = form.getFieldValue("cname") as string | undefined;
    if (!cname) {
      return;
    }

    try {
      await navigator.clipboard.writeText(cname);
      message.success("CNAME已复制到剪贴板");
    } catch (error) {
      message.error(formatErrorMessage("复制CNAME失败", error));
    }
  };

  return (
    <>
      {userId > 0 ? (
        <Form.Item label="所属用户">
          <span>
            {form.getFieldValue(["user", "fullname"])}({form.getFieldValue(["user", "username"])})
          </span>
        </Form.Item>
      ) : null}

      <Card title="基本设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item<Server> label="网站名称" name="name" required>
          <Input />
        </Form.Item>
        <Form.Item<Server>
          required
          label="域名"
          name="serverNames"
          help="每行一个域名，比如example.com、www.example.com，不要包含http://或https://或端口号；也可以使用泛域名，比如*.example.com。"
        >
          <MultiLineArrayTextArea autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
        <Form.Item label="网站分组" name="serverGroupIds" help="一个网站可以加入多个分组。">
          <ServerGroupSelector mode="multiple" userId={String(groupUserId || 0)} />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="HTTP设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="启用HTTP" name={["http", "isOn"]} valuePropName="checked" help="如果关闭，网站将无法使用http访问">
          <Switch />
        </Form.Item>
        <Form.Item
          label="绑定端口"
          dependencies={[["http", "isOn"]]}
          name={["http", "listen"]}
          hidden={!isHTTPEnabled}
          help="输入后按回车添加，可粘贴多个端口。"
        >
          <MultiListenPortInput protocol="http" />
        </Form.Item>
        <Form.Item label="自动跳转到HTTPS" name={["web", "redirectToHTTPS", "isOn"]} valuePropName="checked" hidden={!isHTTPEnabled}>
          <Switch />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="HTTPS设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="启用HTTPS" name={["https", "isOn"]} valuePropName="checked" help="如果关闭，网站将无法使用https访问">
          <Switch />
        </Form.Item>
        <Form.Item name={["https", "sslPolicy", "id"]} hidden>
          <Input />
        </Form.Item>
        <Form.Item label="绑定端口" name={["https", "listen"]} hidden={!isHTTPSEnabled} help="输入后按回车添加，可粘贴多个端口。">
          <MultiListenPortInput protocol="https" />
        </Form.Item>
        <Form.Item label="设置证书" hidden={!isHTTPSEnabled} name={["https", "sslPolicy", "certs"]}>
          <CertsSelector />
        </Form.Item>
        <Form.Item label="HTTPS增强" hidden={!isHTTPSEnabled} help="选中表示启用对应能力">
          <Space size="large" wrap>
            <Space size="small">
              <span>TLS最低版本</span>
              <Form.Item name={["https", "sslPolicy", "minVersion"]} noStyle>
                <Select
                  options={[{ value: "TLS 1.0" }, { value: "TLS 1.1" }, { value: "TLS 1.2" }, { value: "TLS 1.3" }]}
                  defaultActiveFirstOption={true}
                  style={{ width: 132 }}
                />
              </Form.Item>
            </Space>
            <Space size="small">
              <span>启用HTTP/2</span>
              <Form.Item name={["https", "sslPolicy", "http2Enabled"]} valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Space>
            <Space size="small">
              <span>OCSP Stapling</span>
              <Form.Item name={["https", "sslPolicy", "ocspIsOn"]} valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Space>
          </Space>
        </Form.Item>
      </Card>

      <Divider />

      <Card title="源站设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["reverseProxy", "id"]} hidden>
          <Input />
        </Form.Item>
        <Form.Item label="主要源站" name={["reverseProxy", "primaryOrigins"]}>
          <OriginsManager />
        </Form.Item>
        <Form.Item label="备用源站" name={["reverseProxy", "backupOrigins"]}>
          <OriginsManager />
        </Form.Item>
      </Card>

      <Divider />

      <Form.Item label="当前网站CNAME" help="你需要为你的每个网站域名设置一个CNAME解析，值为上面内容。">
        <Space size="small">
          <span>{form.getFieldValue("cname")}</span>
          <Tooltip title="复制CNAME">
            <Button icon={<CopyOutlined />} type="text" onClick={() => void copyCNAME()} disabled={!form.getFieldValue("cname")} />
          </Tooltip>
        </Space>
      </Form.Item>
      <Form.Item label="创建时间">{dayjs.unix(form.getFieldValue("createdAt")).format("YYYY-MM-DD HH:mm:ss")}</Form.Item>
      <Form.Item label="启用当前网站" name="isOn" valuePropName="checked" help="可以使用此选项整体关闭当前网站。">
        <Switch />
      </Form.Item>
    </>
  );
};
const OriginSettings = ({ form }: { form: FormInstance<Server> }) => {
  const isReverseProxyEnabled = Form.useWatch(["reverseProxy", "isOn"], form);
  const requestHostType = Form.useWatch(["reverseProxy", "requestHostType"], form);

  const proxyProtocolEnabled = Form.useWatch(["reverseProxy", "proxyProtocol", "isOn"], form);

  return (
    <>
      <Card title="基础设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="启用源站" name={["reverseProxy", "isOn"]} valuePropName="checked" help="启用后，源站和回源设置才会生效。">
          <Switch />
        </Form.Item>
        <Form.Item label="调度算法" name={["reverseProxy", "scheduling", "code"]}>
          <Radio.Group>
            <Radio value="random">Random随机算法</Radio>
            <Radio value="hash">Hash算法</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="回源主机名"
          hidden={!isReverseProxyEnabled}
          name={["reverseProxy", "requestHostType"]}
          help="请求源站时的主机名（Host），用于修改源站接收到的域名 ，自定义Host内容中支持请求变量。"
        >
          <Radio.Group>
            <Radio value={0}>跟随CDN域名</Radio>
            <Radio value={1}>跟随源站</Radio>
            <Radio value={2}>自定义</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="自定义主机名"
          hidden={!isReverseProxyEnabled || requestHostType !== 2}
          name={["reverseProxy", "requestHost"]}
          help="比如 example.com"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="回源主机名移除端口"
          hidden={!isReverseProxyEnabled}
          name={["reverseProxy", "requestHostExcludingPort"]}
          valuePropName="checked"
          help="选中后表示移除回源主机名中的端口部分。"
        >
          <Switch />
        </Form.Item>
      </Card>
      <div hidden={!isReverseProxyEnabled}>
        <Divider />
        <Card title="请求处理" variant="borderless" size="small" styles={cardStyles}>
          <Form.Item
            label="回源跟随"
            name={["reverseProxy", "followRedirects"]}
            valuePropName="checked"
            help="自动读取源站跳转后的网页内容，而不是将跳转响应返回给客户端。"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="自动添加请求头"
            hidden={!isReverseProxyEnabled}
            name={["reverseProxy", "addHeaders"]}
            help="选中后，会自动向源站请求添加这些报头，以便于源站获取客户端信息。"
          >
            <Checkbox.Group>
              <Checkbox value="X-Real-IP">X-Real-IP</Checkbox>
              <Checkbox value="X-Forwarded-For">X-Forwarded-For</Checkbox>
              <Checkbox value="X-Forwarded-By">X-Forwarded-By</Checkbox>
              <Checkbox value="X-Forwarded-Host">X-Forwarded-Host</Checkbox>
              <Checkbox value="X-Forwarded-Proto">X-Forwarded-Proto</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item
            label="请求URI (Request URI)"
            hidden={!isReverseProxyEnabled}
            name={["reverseProxy", "requestURI"]}
            help='${requestURI}为完整的请求URI，可以使用类似于"${requestURI}?arg1=value1&arg2=value2"的形式添加你的参数。'
          >
            <Input placeholder="${requestURI}" />
          </Form.Item>
          <Form.Item
            label="去除URL前缀(StripPrefix)"
            hidden={!isReverseProxyEnabled}
            name={["reverseProxy", "stripPrefix"]}
            help="可以把请求的路径部分前缀去除后再查找文件，比如把 /web/app/index.html 去除前缀 /web 后就变成 /app/index.html。 "
          >
            <Input placeholder="/PREFIX" />
          </Form.Item>
          <Form.Item
            label="自动刷新缓存区(AutoFlush)"
            hidden={!isReverseProxyEnabled}
            name={["reverseProxy", "autoFlush"]}
            valuePropName="checked"
            help="开启后将自动刷新缓冲区数据到客户端，在类似于SSE(server-sent events)等场景下很有用。"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="自动重试50X"
            hidden={!isReverseProxyEnabled}
            name={["reverseProxy", "retry50X"]}
            valuePropName="checked"
            help="选中后，表示当源站返回状态码为50X（比如502、504等）时，自动重试其他源站。"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="自动重试40X"
            hidden={!isReverseProxyEnabled}
            name={["reverseProxy", "retry40X"]}
            valuePropName="checked"
            help="选中后，表示当源站返回状态码为40X（403或404）时，自动重试其他源站。"
          >
            <Switch />
          </Form.Item>
        </Card>
        <Divider />
        <Card title="连接与超时" variant="borderless" size="small" styles={cardStyles}>
          <Form.Item
            label="PROXY Protocol"
            name={["reverseProxy", "proxyProtocol", "isOn"]}
            valuePropName="checked"
            help="连接源站时先发送客户端地址信息；请确认源站支持 PROXY Protocol 后再启用。"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="PROXY Protocol 版本"
            name={["reverseProxy", "proxyProtocol", "version"]}
            hidden={!proxyProtocolEnabled}
            help="版本 1 使用文本格式，版本 2 使用二进制格式。"
          >
            <Radio.Group
              options={[
                { value: 1, label: "版本 1" },
                { value: 2, label: "版本 2" },
              ]}
            />
          </Form.Item>
          <OriginConnectionFields prefix={["reverseProxy"]} />
        </Card>
      </div>
    </>
  );
};
const SecuritySettings = ({ form }: { form: FormInstance<Server> }) => {
  const isWafEnabled = Form.useWatch(["web", "firewallRef", "isOn"], form);

  return (
    <>
      <Card title="5秒盾" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "uam"]} noStyle>
          <UAMFormInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="无感CC防护" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "cc"]} noStyle>
          <CCFormInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="Web防火墙 (WAF)" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="全局WAF策略" help="当前网站所在集群的设置。">
          "{form.getFieldValue(["httpFirewallPolicy", "name"])}"WAF策略
        </Form.Item>
        {/* WAF开关与配置 */}
        <Form.Item name={["web", "firewallRef"]} noStyle>
          <FirewallRefFormInput />
        </Form.Item>
        {/* WAF策略配置 */}
        <Form.Item name={["web", "firewallPolicy"]} noStyle hidden={!isWafEnabled}>
          <FirewallPolicyFormInput />
        </Form.Item>
      </Card>
    </>
  );
};
const CacheSettings = ({ form }: { form: FormInstance<Server> }) => {
  const isCacheEnabled = Form.useWatch(["web", "cache", "isOn"], form);
  const isPurgeEnabled = Form.useWatch(["web", "cache", "purgeIsOn"], form);
  const purgeKeyValue = Form.useWatch(["web", "cache", "purgeKey"], form);

  const generatePurgeKey = () => {
    const randomPurgeKey = randomString(15);
    form.setFieldValue(["web", "cache", "purgeKey"], randomPurgeKey);
  };

  return (
    <>
      <Form.Item label="启用缓存" name={["web", "cache", "isOn"]} valuePropName="checked" help="">
        <Switch />
      </Form.Item>
      <Form.Item
        label="添加X-Cache报头"
        hidden={!isCacheEnabled}
        name={["web", "cache", "addStatusHeader"]}
        valuePropName="checked"
        help="选中后自动在响应报头中增加X-Cache: BYPASS|MISS|HIT|PURGE"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="添加Age Header"
        hidden={!isCacheEnabled}
        name={["web", "cache", "addAgeHeader"]}
        valuePropName="checked"
        help="选中后自动在响应Header中增加Age: [存活时间秒数]。"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="按源站 Cache-Control 自动缓存"
        hidden={!isCacheEnabled}
        name={["web", "cache", "enableCacheControl"]}
        valuePropName="checked"
        help="默认开启。仅在未匹配缓存规则时，按源站 private/no-store/no-cache 和 s-maxage/max-age 决定是否缓存及有效期；已有缓存规则优先。"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="允许PURGE"
        hidden={!isCacheEnabled}
        name={["web", "cache", "purgeIsOn"]}
        valuePropName="checked"
        help="允许使用PURGE方法清除某个URL缓存。"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        label="PURGE Key"
        hidden={!isCacheEnabled || !isPurgeEnabled}
        name={["web", "cache", "purgeKey"]}
        help={
          <>
            [<a onClick={generatePurgeKey}>随机生成</a>
            ]。需要在PURGE方法调用时加入 Header <code>X-Edge-Purge-Key: {purgeKeyValue}</code>
            。只能包含字符、数字、下划线。
          </>
        }
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="禁用全局缓存条件"
        hidden={!isCacheEnabled}
        name={["web", "cache", "disablePolicyRefs"]}
        valuePropName="checked"
        help="选中后禁用系统全局缓存策略中定义的默认缓存条件，仅使用本网站设定的缓存条件。"
      >
        <Switch />
      </Form.Item>

      <Divider />

      <Form.Item label="缓存条件" hidden={!isCacheEnabled} name={["web", "cache", "cacheRefs"]} help="">
        <CacheRefsInput />
      </Form.Item>
    </>
  );
};
const AdvancedSettings = ({ form }: { form: FormInstance<Server> }) => {
  const isAccessLogEnabled = Form.useWatch(["web", "accessLog", "isOn"], form);

  const accessLogChanged = (checked: boolean) => {
    const accessLogFields = form.getFieldValue(["web", "accessLog", "fields"]);
    if ((!accessLogFields || (Array.isArray(accessLogFields) && accessLogFields.length <= 0)) && checked === true) {
      // 初始化 accessLog 配置
      form.setFieldValue(["web", "accessLog"], {
        isOn: true,
        fields: [1, 2, 6, 7],
        status1: true,
        status2: true,
        status3: true,
        status4: true,
        status5: true,

        firewallOnly: false,
        enableClientClosed: false,
      });
    }
  };

  return (
    <>
      <Card title="Websocket" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "websocket"]} noStyle>
          <WebSocketFormInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="访问日志" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="启用访问日志" name={["web", "accessLog", "isOn"]} valuePropName="checked">
          <Switch onChange={accessLogChanged} />
        </Form.Item>
        <Form.Item label="基础信息" hidden={!isAccessLogEnabled}>
          默认记录客户端IP、请求URL等基础信息。
        </Form.Item>
        <Form.Item label="高级信息" name={["web", "accessLog", "fields"]} hidden={!isAccessLogEnabled} help="在基础信息之外要存储的信息。">
          <Checkbox.Group>
            <Checkbox value={1}>请求Header列表</Checkbox>
            <Checkbox value={2}>响应Header列表</Checkbox>
            <Checkbox value={3}>参数列表</Checkbox>
            <Checkbox value={4}>Cookie列表</Checkbox>
            <Checkbox value={5}>位置和浏览器分析</Checkbox>
            <Checkbox value={6}>请求来源</Checkbox>
            <Checkbox value={7}>终端信息</Checkbox>
            <Checkbox value={8}>请求Body</Checkbox>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item label="状态码" hidden={!isAccessLogEnabled} help="要存储的访问日志状态码">
          <Form.Item name={["web", "accessLog", "status1"]} valuePropName="checked" noStyle>
            <Checkbox>1xx</Checkbox>
          </Form.Item>
          <Form.Item name={["web", "accessLog", "status2"]} valuePropName="checked" noStyle>
            <Checkbox>2xx</Checkbox>
          </Form.Item>
          <Form.Item name={["web", "accessLog", "status3"]} valuePropName="checked" noStyle>
            <Checkbox>3xx</Checkbox>
          </Form.Item>
          <Form.Item name={["web", "accessLog", "status4"]} valuePropName="checked" noStyle>
            <Checkbox>4xx</Checkbox>
          </Form.Item>
          <Form.Item name={["web", "accessLog", "status5"]} valuePropName="checked" noStyle>
            <Checkbox>5xx</Checkbox>
          </Form.Item>
        </Form.Item>
        <Form.Item
          label="记录客户端中断日志"
          name={["web", "accessLog", "enableClientClosed"]}
          valuePropName="checked"
          hidden={!isAccessLogEnabled}
          help="以499的状态码记录客户端主动中断日志。"
        >
          <Switch />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="URL跳转" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "hostRedirects"]} label="跳转规则" help="所有规则匹配顺序为从上到下，可以拖动左侧的排序。">
          <HostRedirectInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="重写规则" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "rewriteRules"]} label="重新规则" help="所有规则匹配顺序为从上到下，可以拖动左侧的排序。">
          <RewriteRuleInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="HTTP报头" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "responseHeaderPolicy"]} label="响应报头">
          <HeaderPolicyInput isResponse={true} />
        </Form.Item>
        <Form.Item name={["web", "requestHeaderPolicy"]} label="请求报头">
          <HeaderPolicyInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="访客IP地址" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item name={["web", "remoteAddr"]} noStyle>
          <RemoteAddrFormInput />
        </Form.Item>
      </Card>

      <Divider />

      <Card title="统计" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item label="启用统计" initialValue={false} name={["web", "stat", "isOn"]} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>
    </>
  );
};

const SimpleSettings = ({ form, serverType }: { form: FormInstance<Server>; serverType: string }) => {
  const tlsListen = Form.useWatch(["tls", "listen"], form);
  const groupUserId = Form.useWatch("userId", { form, preserve: true });
  const copyCNAME = async () => {
    const cname = form.getFieldValue("cname") as string | undefined;
    if (!cname) return;
    try {
      await navigator.clipboard.writeText(cname);
      message.success("CNAME已复制到剪贴板");
    } catch (error) {
      message.error(formatErrorMessage("复制CNAME失败", error));
    }
  };

  return (
    <>
      <Card title="基础设置" variant="borderless" size="small" styles={cardStyles}>
        <Form.Item<Server> label="网站名称" name="name" required>
          <Input />
        </Form.Item>
        {serverType === "httpWeb" ? (
          <Form.Item<Server> label="域名" name="serverNames" required>
            <MultiLineArrayTextArea autoSize={{ minRows: 2, maxRows: 5 }} />
          </Form.Item>
        ) : null}
        <Form.Item label="网站分组" name="serverGroupIds" help="一个网站可以加入多个分组。">
          <ServerGroupSelector mode="multiple" userId={String(groupUserId || 0)} />
        </Form.Item>
        <Form.Item label="当前网站CNAME">
          <Space size="small">
            <span>{form.getFieldValue("cname") || "-"}</span>
            <Tooltip title="复制CNAME">
              <Button icon={<CopyOutlined />} type="text" onClick={() => void copyCNAME()} disabled={!form.getFieldValue("cname")} />
            </Tooltip>
          </Space>
        </Form.Item>
      </Card>
      <Divider />
      {serverType === "httpWeb" ? (
        <>
          <Card title="HTTP设置" variant="borderless" size="small" styles={cardStyles}>
            <Form.Item label="HTTP端口" name={["http", "listen"]}>
              <MultiListenPortInput protocol="http" />
            </Form.Item>
            <Form.Item label="HTTPS端口" name={["https", "listen"]}>
              <MultiListenPortInput protocol="https" />
            </Form.Item>
            <Form.Item label="HTTPS证书" name={["https", "sslPolicy", "certs"]}>
              <CertsSelector />
            </Form.Item>
          </Card>
          <Divider />
          <Card title="Web目录" variant="borderless" size="small" styles={cardStyles}>
            <Form.Item label="资源目录" name={["web", "root", "dir"]}>
              <Input placeholder="/var/www/html" />
            </Form.Item>
          </Card>
        </>
      ) : null}
      {serverType === "tcpProxy" ? (
        <Card title="TCP设置" variant="borderless" size="small" styles={cardStyles}>
          <Form.Item label="TCP端口" name={["tcp", "listen"]}>
            <MultiListenPortInput protocol="tcp" />
          </Form.Item>
          <Form.Item label="TLS端口" name={["tls", "listen"]}>
            <MultiListenPortInput protocol="tls" />
          </Form.Item>
          {tlsListen?.length ? (
            <Form.Item label="TLS证书" name={["tls", "sslPolicy", "certs"]}>
              <CertsSelector />
            </Form.Item>
          ) : null}
        </Card>
      ) : null}
      {serverType === "udpProxy" ? (
        <Card title="UDP设置" variant="borderless" size="small" styles={cardStyles}>
          <Form.Item label="UDP端口" name={["udp", "listen"]}>
            <MultiListenPortInput protocol="udp" />
          </Form.Item>
        </Card>
      ) : null}
      {serverType !== "httpWeb" ? (
        <>
          <Divider />
          <Card title="源站设置" variant="borderless" size="small" styles={cardStyles}>
            <Form.Item name={["reverseProxy", "id"]} hidden>
              <Input />
            </Form.Item>
            <Form.Item label="主要源站" name={["reverseProxy", "primaryOrigins"]}>
              <OriginsManager />
            </Form.Item>
            <Form.Item label="备用源站" name={["reverseProxy", "backupOrigins"]}>
              <OriginsManager />
            </Form.Item>
          </Card>
        </>
      ) : null}
    </>
  );
};

export function buildServerUpdatePayload(server: Server): Partial<Server> {
  const payload = { ...server } as Partial<Server>;
  switch (server.type) {
    case "httpWeb":
      delete payload.reverseProxy;
      delete payload.tcp;
      delete payload.tls;
      delete payload.udp;
      break;
    case "tcpProxy":
      delete payload.http;
      delete payload.https;
      delete payload.udp;
      delete payload.web;
      break;
    case "udpProxy":
      delete payload.http;
      delete payload.https;
      delete payload.tcp;
      delete payload.tls;
      delete payload.web;
      break;
    default:
      break;
  }
  return payload;
}

function ServerSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { serverId } = useParams();
  const query = useQuery<FindEnabledServerResponse>({
    queryKey: serverQueryKeys.settings(serverId),
    queryFn: () => getServerSettings(serverId),
    enabled: Boolean(serverId),
  });
  const data = query.data;
  const initialValues = useMemo(
    () =>
      data?.server
        ? {
            ...buildCacheSettingsValues(buildOriginSettingsValues(buildContentOptimizationValues(data.server))),
            serverGroupIds: data.server.serverGroups?.groups.map((group) => String(group.id)) ?? [],
          }
        : undefined,
    [data?.server],
  );
  const pageContainerLoading = query.isPending && !query.data;
  //   const serverId = data?.server?.id;

  const [form] = Form.useForm();
  const initializedServerIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!serverId) return;
    initializedServerIdRef.current = undefined;
    form.resetFields();
  }, [form, serverId]);
  useEffect(() => {
    if (data?.server && String(data.server.id) === serverId && initializedServerIdRef.current !== serverId) {
      form.setFieldsValue(initialValues);
      initializedServerIdRef.current = serverId;
    }
  }, [data, form, serverId, initialValues]);

  const [submiting, setSubmiting] = useState(false);
  const submitingRef = useRef(false);
  const onFinish = async ({ serverGroupIds, ...server }: Server & { serverGroupIds?: string[] }) => {
    if (!serverId || query.isError || !data?.server || submitingRef.current) return;
    submitingRef.current = true;
    try {
      setSubmiting(true);
      const payload = server.type === "httpProxy" ? server : buildServerUpdatePayload(server);
      await request(`/api/server/${serverId}`, {
        method: "PUT",
        data: {
          server: {
            ...payload,
            serverGroups: { groups: (serverGroupIds ?? []).map((id) => ({ id })) },
          },
        },
      });
      await queryClient.invalidateQueries({ queryKey: serverQueryKeys.detailBase() });
      await queryClient.invalidateQueries({ queryKey: serverQueryKeys.listBase() });
      await queryClient.invalidateQueries({ queryKey: serverQueryKeys.groupsBase() });
      navigate(`/servers`);
    } catch (error) {
      message.error(formatErrorMessage("更新网站失败", error));
    } finally {
      submitingRef.current = false;
      setSubmiting(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        entityName: data?.server?.name,
        fallbackEntityLabel: "网站",
        tabList: getServerTabList(serverId!),
      })}
      header={{ title: data?.server?.name || "网站设置" }}
      loading={pageContainerLoading}
      tabList={getServerTabList(serverId!)}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
    >
      <Card style={{ marginBottom: "80px" }} key={serverId}>
        {query.isError ? <Alert type="error" showIcon message="网站配置加载失败，请刷新后重试" style={{ marginBottom: 16 }} /> : null}
        <Form form={form} name="serverSettings" initialValues={initialValues} onFinish={onFinish} labelCol={{ span: 4 }} wrapperCol={{ span: 14 }}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
          <Form.Item name={["web", "id"]} hidden>
            <Input />
          </Form.Item>
          <Form.Item name={["web", "isOn"]} hidden>
            <Input />
          </Form.Item>
          {data?.server?.type === "httpProxy" ? (
            <Tabs
              defaultActiveKey="basic"
              items={[
                {
                  key: "basic",
                  label: "基本设置",
                  forceRender: true,
                  children: <BasicSettings form={form} />,
                },
                {
                  key: "origin",
                  label: "回源设置",
                  forceRender: true,
                  children: <OriginSettings form={form} />,
                },
                {
                  key: "security",
                  label: "安全设置",
                  forceRender: true,
                  children: <SecuritySettings form={form} />,
                },
                {
                  key: "cache",
                  label: "缓存设置",
                  forceRender: true,
                  children: <CacheSettings form={form} />,
                },
                {
                  key: "optimization",
                  label: "内容优化",
                  forceRender: true,
                  children: <ContentOptimizationSettings clusterId={data.server.nodeCluster?.id ? String(data.server.nodeCluster.id) : undefined} />,
                },
                {
                  key: "advanced",
                  label: "高级设置",
                  forceRender: true,
                  children: <AdvancedSettings form={form} />,
                },
              ]}
            />
          ) : (
            <SimpleSettings form={form} serverType={data?.server?.type || "httpWeb"} />
          )}

          {/* 底部固定操作栏 */}
          <FooterToolbar>
            <Button
              onClick={() => {
                if (data?.server) {
                  form.resetFields();
                  form.setFieldsValue(initialValues);
                }
              }}
            >
              重置
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={submiting} disabled={query.isError || !data?.server}>
              保存
            </Button>
          </FooterToolbar>
        </Form>
      </Card>
    </PageContainer>
  );
}

export default ServerSettings;
