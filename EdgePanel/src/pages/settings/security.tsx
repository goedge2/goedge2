import { useState, useEffect } from "react";
import { Alert, Card, Form, Input, Select, Switch, Button, message } from "antd";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { request, useLocation, useNavigate } from "@umijs/max";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import { CountryIdsInput, ProvinceIdsInput } from "@/components/WafRegionFormInput";
import { settingQueryKeys } from "@/queries/keys";
import { readAdminSecurityConfig } from "@/services/settings";
import { settingTabList } from "./_shared/settingTabList";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const CODE = "adminSecurityConfig";

interface SecurityConfigData {
  frame?: string;
  allowIPs?: string[];
  allowLocal?: boolean;
  allowRememberLogin?: boolean;
  clientIPHeaderNames?: string;
  clientIPHeaderOnly?: boolean;
  denySearchEngines?: boolean;
  denySpiders?: boolean;
  allowDomains?: string[];
  checkClientFingerprint?: boolean;
  checkClientRegion?: boolean;
  allowCountryIds?: number[];
  allowProvinceIds?: number[];
}

const SecurityConfig = () => {
  const [form] = Form.useForm<SecurityConfigData>();
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery<{ valueJSON?: string }>({
    queryKey: settingQueryKeys.security(),
    queryFn: readAdminSecurityConfig,
  });
  const data = query.data;
  const pageContainerLoading = query.isPending && !query.data;

  const clientIPHeaderNames = Form.useWatch("clientIPHeaderNames", form);

  useEffect(() => {
    if (data?.valueJSON) {
      form.setFieldsValue(JSON.parse(data.valueJSON) as SecurityConfigData);
    }
  }, [data, form]);

  const onFinish = async (values: SecurityConfigData) => {
    setSubmitting(true);
    try {
      await request(`/api/sys/settings/${CODE}`, {
        method: "PUT",
        data: {
          code: CODE,
          valueJSON: JSON.stringify(values),
        },
      });
      message.success("保存成功");
    } catch (err) {
      console.error("保存失败:", err);
      message.error(formatErrorMessage("保存失败", err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: location.pathname,
        tabList: settingTabList,
      })}
      header={{ title: "系统设置" }}
      loading={pageContainerLoading}
      tabList={settingTabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
    >
      <Alert title="当前安全设置只适用于管理系统，对用户网站没有任何影响。" type="info" showIcon style={{ marginBottom: 16 }} />

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* 安全设置 */}
        <Card title="安全设置" style={{ marginBottom: 16 }}>
          <Form.Item name="frame" label="Frame嵌套条件" help="当前服务被别的网页框架嵌套的条件限制。">
            <Select
              style={{ width: 200 }}
              options={[
                { label: "不限制", value: "" },
                { label: "仅限同域名", value: "SAMEORIGIN" },
              ]}
            />
          </Form.Item>

          <Form.Item name="allowCountryIds" label="允许访问的国家和地区" help="设置后，只有这些国家和地区才能访问管理界面，如果不设置表示没有限制。">
            <CountryIdsInput />
          </Form.Item>

          <Form.Item name="allowProvinceIds" label="允许访问的省份（中国大陆）" help="设置后，只有这些省份才能访问管理界面，如果不设置表示没有限制。">
            <ProvinceIdsInput />
          </Form.Item>

          <Form.Item
            name="allowIPs"
            label="允许访问的IP"
            help="如果不为空，则仅仅允许这些IP访问，其他的IP访问时会被拒绝。每行填写一个IP或CIDR IP段。"
          >
            <MultiLineArrayTextArea rows={4} placeholder="每行填写一个IP地址或CIDR，例如：192.168.1.0/24" />
          </Form.Item>

          <Form.Item name="allowLocal" label="允许局域网访问" valuePropName="checked" help="选中表示总是允许在本机和局域网访问，不需要其他限制条件。">
            <Switch />
          </Form.Item>

          <Form.Item name="allowRememberLogin" label="允许记住登录" valuePropName="checked" help="选中表示允许在登录界面可以选择记住登录。">
            <Switch />
          </Form.Item>
        </Card>

        {/* 更多选项 */}
        <Card title="更多选项" style={{ marginBottom: 16 }}>
          <Form.Item
            name="clientIPHeaderNames"
            label="自定义客户端IP报头"
            help="可以通过此报头获取客户端IP，类似于 X-Forwarded-For X-Real-IP True-Client-IP Client-IP，用于使用反向代理访问管理系统的情形；如果有多个报头可以使用空格隔开。"
          >
            <Input placeholder="例如：X-Forwarded-For X-Real-IP True-Client-IP Client-IP" />
          </Form.Item>

          {clientIPHeaderNames && (
            <Form.Item
              name="clientIPHeaderOnly"
              label="仅从自定义报头中获取IP"
              valuePropName="checked"
              help="选中后，表示仅从自定义报头中获取IP，意味着客户端必须使用反向代理访问当前系统，不允许直接访问。"
            >
              <Switch />
            </Form.Item>
          )}

          <Form.Item name="denySearchEngines" label="禁止搜索引擎" valuePropName="checked" help="禁止常见的搜索引擎访问。">
            <Switch />
          </Form.Item>

          <Form.Item name="denySpiders" label="禁止爬虫" valuePropName="checked" help="禁止常见的爬虫访问。">
            <Switch />
          </Form.Item>

          <Form.Item
            name="allowDomains"
            label="允许访问的域名"
            help="只允许通过这些域名（或者IP作为主机地址）访问当前管理系统，不填表示没有限制。每行填写一个域名。"
          >
            <MultiLineArrayTextArea rows={4} placeholder="每行填写一个域名，例如：admin.example.com" />
          </Form.Item>

          <Form.Item
            name="checkClientFingerprint"
            label="检查客户端指纹"
            valuePropName="checked"
            help={
              "选中后，表示每次管理员访问时都检查客户端相关信息是否跟登录时一致；如果客户端IP或User-Agent信息变化比较频繁，请不要启用此选项；如果当前系统下游有反向代理设置，请设置当前表单中的\u201c自定义客户端IP报头\u201d选项。"
            }
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="checkClientRegion"
            label="检查客户端区域"
            valuePropName="checked"
            help={
              "选中后，表示每次管理员访问时都检查客户端所在地理区域是否和登录时一致；如果客户端所处地理区域变化比较频繁，请不要启用此选项；如果当前系统下游有反向代理设置，请设置当前表单中的\u201c自定义客户端IP报头\u201d选项。"
            }
          >
            <Switch />
          </Form.Item>
        </Card>

        <FooterToolbar>
          <Button type="primary" onClick={() => form.submit()} loading={submitting}>
            保存
          </Button>
        </FooterToolbar>
      </Form>
    </PageContainer>
  );
};

export default SecurityConfig;
