import { useState, useEffect } from "react";
import { Card, Form, Input, Select, Switch, Button, message } from "antd";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { request, useLocation, useNavigate } from "@umijs/max";
import { TimeZoneSelector } from "@/components/SharedInput";
import FileUploadInput from "@/components/FileUploadInput";
import { settingQueryKeys } from "@/queries/keys";
import { readUserUIConfig } from "@/services/settings";
import { settingTabList } from "./_shared/settingTabList";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const CODE = "userUIConfig";

interface UserUIConfigData {
  productName?: string;
  userSystemName?: string;
  showVersion?: boolean;
  version?: string;
  faviconFileId?: number;
  logoFileId?: number;
  theme?: {
    backgroundColor?: string;
  };
  showPageFooter?: boolean;
  pageFooterHTML?: string;
  showFinance?: boolean;
  server?: {
    checkCNAME?: boolean;
  };
  showTrafficCharts?: boolean;
  showCacheInfoInTrafficCharts?: boolean;
  showBandwidthCharts?: boolean;
  portal?: {
    isOn?: boolean;
  };
  timeZone?: string;
  dnsResolver?: {
    type?: string;
  };
  clientIPHeaderNames?: string;
  uniqueKey?: string;
}

const UserUIConfig = () => {
  const [form] = Form.useForm<UserUIConfigData>();
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery<{ valueJSON?: string }>({
    queryKey: settingQueryKeys.userUI(),
    queryFn: readUserUIConfig,
  });
  const data = query.data;
  const pageContainerLoading = query.isPending && !query.data;

  // const showVersion = Form.useWatch("showVersion", form);
  // const showPageFooter = Form.useWatch("showPageFooter", form);
  const clientIPHeaderNames = Form.useWatch("clientIPHeaderNames", form);

  useEffect(() => {
    if (data?.valueJSON) {
      form.setFieldsValue(JSON.parse(data.valueJSON) as UserUIConfigData);
    }
  }, [data, form]);

  const onFinish = async (values: UserUIConfigData) => {
    setSubmitting(true);
    try {
      await request(`/api/sys/settings/${CODE}`, {
        method: "PUT",
        data: {
          code: CODE,
          valueJSON: JSON.stringify(values),
        },
      });
      message.success("保存成功，修改在3分钟内生效。");
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
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* 用户系统设置 */}
        <Card title="用户系统设置" style={{ marginBottom: 16 }}>
          <Form.Item name="productName" label="产品名称">
            <Input maxLength={100} placeholder="请输入产品名称" />
          </Form.Item>

          <Form.Item name="userSystemName" label="用户系统名称">
            <Input maxLength={100} placeholder="请输入用户系统名称" />
          </Form.Item>

          <Form.Item name="faviconFileId" label="浏览器图标">
            <FileUploadInput accept="image/x-icon,image/png,image/svg+xml,image/ico" hint="上传图标" />
          </Form.Item>

          <Form.Item name="logoFileId" label="Logo图">
            <FileUploadInput accept="image/*" hint="上传Logo" />
          </Form.Item>

          {/*<Form.Item name="showVersion" label="显示版本号" valuePropName="checked" help="选中后，表示在系统名称后面加入版本号。">
            <Switch />
          </Form.Item>

          {showVersion && (
            <Form.Item name="version" label="定制版本号" help="定制自己的版本号，留空表示使用系统自带的版本号。">
              <Input maxLength={100} placeholder="留空使用系统自带版本号" />
            </Form.Item>
          )}

          <Form.Item
            name={["theme", "backgroundColor"]}
            label="页面背景颜色"
            help="整个页面框架的背景颜色，留空表示使用默认颜色。填写16进制色值，例如：276AC6"
          >
            <Input maxLength={7} placeholder="16进制色值，例如：276AC6" addonBefore="#" style={{ width: 240 }} />
          </Form.Item>

          <Form.Item name="showPageFooter" label="显示页脚" valuePropName="checked">
            <Switch />
          </Form.Item>

          {showPageFooter && (
            <Form.Item
              name="pageFooterHTML"
              label="自定义页脚HTML"
              help={
                <>
                  类似于：
                  <code>{`<a class="item">内容1</a><a class="item">内容2</a>`}</code>
                </>
              }
            >
              <Input.TextArea rows={3} placeholder="请输入页脚HTML" />
            </Form.Item>
          )}

          <Form.Item name="showFinance" hidden label="显示财务相关功能" valuePropName="checked" help="选中后，表示在菜单中显示财务管理功能。">
            <Switch />
          </Form.Item>*/}
        </Card>

        {/* 网站相关设置 */}
        <Card title="网站相关设置" style={{ marginBottom: 16, display: "none" }}>
          <Form.Item
            name={["server", "checkCNAME"]}
            label="自动检查CNAME"
            valuePropName="checked"
            help="选中后，表示自动在网站列表中检查网站域名是否已正确解析到对应的CNAME。"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* 数据看板设置 */}
        <Card title="数据看板设置" style={{ marginBottom: 16, display: "none" }}>
          <Form.Item name="showTrafficCharts" label="显示流量相关数据和图表" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="showCacheInfoInTrafficCharts"
            label="在流量图表中显示缓存相关信息"
            valuePropName="checked"
            help="选中后，表示在流量图表中显示缓存流量、缓存命中率等信息。"
          >
            <Switch />
          </Form.Item>

          <Form.Item name="showBandwidthCharts" label="显示带宽相关数据和图表" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Card>

        {/* 其他设置 */}
        <Card title="其他设置" style={{ marginBottom: 16 }}>
          <Form.Item name="timeZone" label="时区" help="用户系统显示时间使用的时区。">
            <TimeZoneSelector />
          </Form.Item>

          <Form.Item
            name={["dnsResolver", "type"]}
            label="使用的DNS解析库"
            help="用户系统使用的DNS解析库；修改此项配置后，需要重启用户系统进程才会生效；通常不需要修改；如要修改，请在专家指导下进行。"
          >
            <Select
              style={{ width: 160 }}
              options={[
                { label: "默认", value: "default" },
                { label: "CGO", value: "cgo" },
                { label: "Go原生", value: "goNative" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="clientIPHeaderNames"
            label="自定义客户端IP报头"
            help="可以通过此报头获取客户端IP，类似于 X-Forwarded-For X-Real-IP True-Client-IP Client-IP，用于使用反向代理访问用户系统的情形；如果有多个报头可以使用空格隔开。"
          >
            <Input placeholder="例如：X-Forwarded-For X-Real-IP" />
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

export default UserUIConfig;
