import { App, Button, Card, Checkbox, Form, Input, Menu, Space, Switch } from "antd";
import { PageContainer } from "@ant-design/pro-components";
import { useNavigate } from "@umijs/max";
import { useState } from "react";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import { ClusterSelector } from "@/components/ClusterSelector";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import { MultiListenPortInput } from "@/components/MultiListenPortInput";
import { createServer } from "@/services/servers";
import { formatErrorMessage } from "@/utils";
import { CertsSelector } from "@/components/CertsSelector";
import {
  type CreateServerFormValues,
  type ServerCreateType,
  SERVER_CREATE_TYPES,
  DEFAULT_ENABLE_CONFIG_OPTIONS,
  defaultPorts,
  usesOrigins,
  buildCreateServerPayloadFromForm,
  validateCreateServerForm,
} from "./createForm";

const ServerCreate = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateServerFormValues>();
  const [serverType, setServerType] = useState<ServerCreateType>("httpProxy");
  const [loading, setLoading] = useState(false);
  const tlsListen = Form.useWatch("tlsListen", form);
  const automaticCert = Form.useWatch("automaticCert", form);

  const changeServerType = (nextType: ServerCreateType) => {
    setServerType(nextType);
    form.resetFields([
      "domains",
      "originAddrs",
      "webRoot",
      "httpListen",
      "httpsListen",
      "tcpListen",
      "tlsListen",
      "udpListen",
      "httpsCerts",
      "automaticCert",
      "tlsCerts",
      "defaultEnableKeys",
    ]);
    form.setFieldsValue(defaultPorts[nextType]);
  };

  const onFinish = async (values: CreateServerFormValues) => {
    try {
      validateCreateServerForm(serverType, values);
      setLoading(true);
      const response = await createServer(buildCreateServerPayloadFromForm(serverType, values), { skipErrorHandler: true });
      const serverId = response.serverId == null ? "" : String(response.serverId);
      if (serverId.length === 0 || serverId === "0") {
        throw new Error("创建网站未返回有效ID");
      }
      navigate(`/servers/${serverId}/settings`);
    } catch (error) {
      message.error(formatErrorMessage("创建网站失败", error));
    } finally {
      setLoading(false);
    }
  };

  const selectedDescription = SERVER_CREATE_TYPES.find((item) => item.key === serverType)?.description;
  const httpType = serverType === "httpProxy" || serverType === "httpWeb";
  const tlsEnabled = Boolean(tlsListen?.length);

  return (
    <PageContainer breadcrumb={buildPageBreadcrumb({ pathname: getCurrentBreadcrumbPathname() })} header={{ title: "创建网站" }}>
      <Card>
        <Menu
          mode="horizontal"
          selectedKeys={[serverType]}
          items={SERVER_CREATE_TYPES.map(({ key, label }) => ({ key, label }))}
          onClick={({ key }) => changeServerType(key as ServerCreateType)}
          style={{ marginBottom: 24 }}
        />
        <p style={{ color: "#666", marginBottom: 24 }}>{selectedDescription}</p>
        <Form<CreateServerFormValues>
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          initialValues={defaultPorts.httpProxy}
          onFinish={onFinish}
        >
          <Form.Item required label="集群" name="nodeClusterId" rules={[{ required: true, message: "请选择需要部署到的集群" }]}>
            <ClusterSelector />
          </Form.Item>
          <Form.Item label="网站名称" name="name">
            <Input placeholder="可选，默认使用第一个域名或服务类型名称" />
          </Form.Item>
          {httpType ? (
            <Form.Item required label="域名" name="domains" rules={[{ required: true, message: "请输入至少一个域名" }]}>
              <MultiLineArrayTextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder={"example.com\n*.example.com"} />
            </Form.Item>
          ) : null}
          {serverType === "httpWeb" ? (
            <Form.Item label="Web目录" name="webRoot" help="可选，留空时使用节点默认目录。">
              <Input placeholder="/var/www/html" />
            </Form.Item>
          ) : null}
          {httpType ? (
            <>
              <Form.Item required label="HTTP端口" name="httpListen">
                <MultiListenPortInput protocol="http" />
              </Form.Item>
              <Form.Item required label="HTTPS端口" name="httpsListen">
                <MultiListenPortInput protocol="https" />
              </Form.Item>
              <Form.Item label="自动申请证书" name="automaticCert" valuePropName="checked" help="使用填写的域名自动申请证书，申请成功后自动更新。">
                <Switch />
              </Form.Item>
              {automaticCert ? null : (
                <Form.Item label="HTTPS证书" name="httpsCerts">
                  <CertsSelector />
                </Form.Item>
              )}
            </>
          ) : null}
          {serverType === "tcpProxy" ? (
            <>
              <Form.Item label="TCP端口" name="tcpListen">
                <MultiListenPortInput protocol="tcp" />
              </Form.Item>
              <Form.Item label="TLS端口" name="tlsListen">
                <MultiListenPortInput protocol="tls" />
              </Form.Item>
              {tlsEnabled ? (
                <Form.Item required label="TLS证书" name="tlsCerts">
                  <CertsSelector />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          {serverType === "udpProxy" ? (
            <Form.Item required label="UDP端口" name="udpListen">
              <MultiListenPortInput protocol="udp" />
            </Form.Item>
          ) : null}
          {usesOrigins(serverType) ? (
            <Form.Item required label="源站" name="originAddrs" help="每行一个源站地址，需包含协议和端口。">
              <MultiLineArrayTextArea
                autoSize={{ minRows: 2, maxRows: 5 }}
                placeholder={serverType === "udpProxy" ? "udp://1.1.1.1:53" : "http://1.1.1.1:80"}
              />
            </Form.Item>
          ) : null}
          {serverType === "httpProxy" ? (
            <Form.Item label="默认开启配置" name="defaultEnableKeys">
              <Checkbox.Group options={DEFAULT_ENABLE_CONFIG_OPTIONS} />
            </Form.Item>
          ) : null}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建
              </Button>
              <Button onClick={() => navigate("/servers")}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default ServerCreate;
