import { useState, useEffect } from "react";
import { Card, Form, Input, InputNumber, Select, Switch, Button, message } from "antd";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request, useLocation, useNavigate } from "@umijs/max";
import { TimeZoneSelector } from "@/components/SharedInput";
import FileUploadInput from "@/components/FileUploadInput";
import { settingQueryKeys, shellQueryKeys } from "@/queries/keys";
import { readAdminUIConfig } from "@/services/settings";
import { settingTabList } from "./_shared/settingTabList";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";

const CODE = "adminUIConfig";

interface AdminUIConfigData {
  productName?: string;
  adminSystemName?: string;
  showOpenSourceInfo?: boolean;
  showVersion?: boolean;
  version?: string;
  showFinance?: boolean;
  faviconFileId?: number;
  logoFileId?: number;
  defaultPageSize?: number;
  timeZone?: string;
  dnsResolver?: {
    type?: string;
  };
}

const AdminUIConfig = () => {
  const [form] = Form.useForm<AdminUIConfigData>();
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery<{ valueJSON?: string }>({
    queryKey: settingQueryKeys.adminUI(),
    queryFn: readAdminUIConfig,
  });
  const data = query.data;
  const pageContainerLoading = query.isPending && !query.data;

  useEffect(() => {
    if (data?.valueJSON) {
      form.setFieldsValue(JSON.parse(data.valueJSON) as AdminUIConfigData);
    }
  }, [data, form]);

  const onFinish = async (values: AdminUIConfigData) => {
    setSubmitting(true);
    try {
      await request(`/api/sys/settings/${CODE}`, {
        method: "PUT",
        data: {
          code: CODE,
          valueJSON: JSON.stringify(values),
        },
      });
      await queryClient.invalidateQueries({ queryKey: shellQueryKeys.uiConfig() });
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
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="界面设置" style={{ marginBottom: 16 }}>
          <Form.Item name="productName" label="产品名称" help="可以使用变量 ${product.name} 在网页里展示此名称，建议仅包含英文和数字字符。">
            <Input maxLength={100} placeholder="请输入产品名称" />
          </Form.Item>

          <Form.Item name="adminSystemName" label="管理员系统名称" help="当前管理系统界面上显示的名称。">
            <Input maxLength={100} placeholder="请输入管理员系统名称" />
          </Form.Item>

          <Form.Item name="showOpenSourceInfo" hidden label="显示底部开源信息" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="showVersion" hidden label="显示版本号" valuePropName="checked" help="选中后，在界面中显示系统版本号。">
            <Switch />
          </Form.Item>

          <Form.Item name="version" hidden label="定制版本号" help="定制自己的版本号，留空表示使用系统自带的版本号。">
            <Input maxLength={100} placeholder="留空使用系统自带版本号" />
          </Form.Item>

          <Form.Item name="showFinance" hidden label="显示财务相关功能" valuePropName="checked" help="选中后，表示在菜单中显示财务管理功能。">
            <Switch />
          </Form.Item>

          <Form.Item name="faviconFileId" label="浏览器图标">
            <FileUploadInput accept="image/x-icon,image/png,image/svg+xml,image/ico" hint="上传图标" />
          </Form.Item>

          <Form.Item name="logoFileId" label="Logo">
            <FileUploadInput accept="image/*" hint="上传Logo" />
          </Form.Item>
        </Card>

        <Card title="其他设置" style={{ marginBottom: 16 }}>
          <Form.Item name="defaultPageSize" label="每页显示数" help="在有分页的地方每页显示数量；不能超过100。">
            <InputNumber min={1} max={100} style={{ width: 120 }} placeholder="默认20" />
          </Form.Item>

          <Form.Item name="timeZone" label="时区" help="当前管理系统显示时间使用的时区。">
            <TimeZoneSelector />
          </Form.Item>

          <Form.Item
            name={["dnsResolver", "type"]}
            label="使用的DNS解析库"
            help="当前管理系统使用的DNS解析库；修改此项配置后，需要重启管理系统进程才会生效；通常不需要修改；如要修改，请在专家指导下进行。"
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

export default AdminUIConfig;
