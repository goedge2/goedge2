import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request, useNavigate, useParams } from "@umijs/max";
import { serverQueryKeys } from "@/queries/keys";
import { getWafPolicySettings } from "@/services/servers";
import type { FindEnabledHTTPFirewallPolicyResponse } from "@/pb/service_http_firewall_policy_pb";
import { App, Form, Input, Tabs, Card, Button, Switch, Collapse, InputNumber, Radio, type FormInstance } from "antd";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { FirewallGroupsInput } from "@/components/WafFormInput";
import WafRegionFormInput from "@/components/WafRegionFormInput";
import WafIPListsForm from "./_shared/WafIPListsForm";
import { useEffect, useState } from "react";
import type { HTTPFirewallPolicy } from "@/pb/models/model_http_firewall_pb";
import { formatErrorMessage } from "@/utils";
import { buildPageBreadcrumb, getCurrentBreadcrumbPathname } from "@/runtime/breadcrumbs";
import WafActionOptionsForm from "./_shared/WafActionOptionsForm";
import { buildWafPolicySettingsValues } from "./_shared/wafPolicySettings";

const { TextArea } = Input;
const { Panel } = Collapse;

function WafBasicInfoForm({ form }: { form: FormInstance }) {
  const mode = Form.useWatch("mode", form);

  const modeHelp =
    {
      defend: "执行正常的防御规则和相应动作。默认模式",
      observe: "仅记录日志，不执行防御规则和相应动作。适用于测试新策略或监控攻击情况。",
      bypass: "不执行任何规则，所有的请求都将会直接通过。",
    }[mode as string] || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 1. Basic Settings (基础设置) */}
      <Card title="基础设置" size="small" variant="borderless">
        <Form.Item label="策略名称" name="name" rules={[{ required: true, message: "请输入策略名称" }]}>
          <Input placeholder="输入WAF策略名称" maxLength={100} />
        </Form.Item>
        <Form.Item label="模式" name="mode" rules={[{ required: true, message: "请选择模式" }]} help={modeHelp}>
          <Radio.Group>
            <Radio value="defend">防御</Radio>
            <Radio value="observe">观察</Radio>
            <Radio value="bypass">放行</Radio>
          </Radio.Group>
        </Form.Item>
      </Card>

      {/* 2. Action Configuration (动作配置) */}
      <Card title="动作配置" size="small" variant="borderless">
        <WafActionOptionsForm form={form} />
      </Card>

      {/* 3. Log Configuration (日志配置) */}
      <Card title="日志配置" size="small" variant="borderless">
        <Form.Item
          label="记录访问日志"
          name={["log", "isOn"]}
          valuePropName="checked"
          help="选中后，总是记录WAF相关访问日志，即使服务中没有开启访问日志。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="记录请求体"
          name={["log", "requestBody"]}
          valuePropName="checked"
          help="选中后，表示在访问日志中记录匹配的请求内容。注意：此选项会明显增加访问日志占用空间，请谨慎开启。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="记录区域封禁"
          name={["log", "regionDenying"]}
          valuePropName="checked"
          help="选中后，表示在访问日志中记录区域封禁（地区和省份）事件。"
        >
          <Switch />
        </Form.Item>
      </Card>

      {/* 4. Region Block Settings (区域封禁设置) */}
      <Card title="区域封禁设置" size="small" variant="borderless">
        <Form.Item
          label="国家/地区封禁提示"
          name="denyCountryHTML"
          help="当客户端所在区域被封禁时提示页面的HTML内容；不填则表示使用默认的提示内容；支持请求变量。"
        >
          <TextArea rows={4} placeholder="Default: Access Denied" />
        </Form.Item>
        <Form.Item
          label="省份封禁提示"
          name="denyProvinceHTML"
          help="当客户端所在省份被封禁时提示页面的HTML内容；不填则表示使用默认的提示内容；支持请求变量。"
        >
          <TextArea rows={4} placeholder="Default: Access Denied" />
        </Form.Item>
      </Card>

      {/* 5. General Configuration (基本配置) */}
      <Card title="基本配置" size="small" variant="borderless">
        <Form.Item label="启用当前策略" name="isOn" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          label="使用本机防火墙"
          name="useLocalFirewall"
          valuePropName="checked"
          help="开启后，可以在合适的时候自动使用系统自带防火墙进行防御；建议在每个边缘节点都安装nftables以提升封禁性能。"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="最多检查内容尺寸(字节)"
          name="maxRequestBodySize"
          help="WAF能够分析的最大文件内容尺寸，0表示默认，默认为256KiB；此值越大，对应使用的系统内存越多，请谨慎修改。"
        >
          <InputNumber style={{ width: "100%" }} min={0} placeholder="0表示使用默认值" />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <TextArea rows={2} />
        </Form.Item>

        <Collapse ghost>
          <Panel header="SYN Flood防御配置" key="synflood">
            <Form.Item label="启用" name={["synFlood", "isOn"]} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="最小尝试次数/分" name={["synFlood", "minAttempts"]} initialValue={10}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item label="拦截超时(秒)" name={["synFlood", "timeoutSeconds"]} initialValue={60}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item label="忽略本地IP" name={["synFlood", "ignoreLocal"]} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
}

// WAF 策略
export default function WafPolicySettings() {
  const { message } = App.useApp();
  const { policyId } = useParams<{ policyId: string }>();
  const query = useQuery<FindEnabledHTTPFirewallPolicyResponse>({
    queryKey: serverQueryKeys.wafPolicyDetail(policyId),
    queryFn: () => getWafPolicySettings(policyId),
    enabled: Boolean(policyId),
  });
  const data = query.data;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pageContainerLoading = query.isPending && !query.data;

  const [form] = Form.useForm();
  const [submiting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data?.httpFirewallPolicy) return;

    form.resetFields();
    form.setFieldsValue(buildWafPolicySettingsValues(data.httpFirewallPolicy));
  }, [data, form]);

  const onFinish = async () => {
    try {
      setSubmitting(true);
      const wafPolicy: HTTPFirewallPolicy = form.getFieldsValue(true);
      await request(`/api/waf/policy/${policyId}`, { method: "PUT", data: { httpFirewallPolicy: wafPolicy }, skipErrorHandler: true });
      await queryClient.invalidateQueries({ queryKey: serverQueryKeys.wafPoliciesBase() });
      navigate("/servers/waf/policies"); // 保存成功后跳转回列表页
    } catch (error) {
      console.error("Failed to save WAF policy settings:", error);
      message.error(formatErrorMessage("保存WAF策略失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({
        pathname: getCurrentBreadcrumbPathname(),
        entityName: data?.httpFirewallPolicy?.name,
        fallbackEntityLabel: "WAF策略",
      })}
      header={{ title: data?.httpFirewallPolicy?.name || "WAF策略设置" }}
      loading={pageContainerLoading}
    >
      <Card>
        <Form
          form={form}
          name="wafPolicySettings"
          initialValues={data?.httpFirewallPolicy ? buildWafPolicySettingsValues(data.httpFirewallPolicy) : undefined}
          onFinish={onFinish}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
        >
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Tabs
            items={[
              {
                key: "basic",
                label: "基本信息",
                forceRender: true,
                children: <WafBasicInfoForm form={form} />,
              },
              {
                key: "inbound",
                label: "入站规则",
                forceRender: true,
                children: (
                  <>
                    <Form.Item name={["inbound", "groups"]} noStyle>
                      <FirewallGroupsInput />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "outbound",
                label: "出站规则",
                forceRender: true,
                children: (
                  <>
                    <Form.Item name={["outbound", "groups"]} noStyle>
                      <FirewallGroupsInput />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "region",
                label: "区域屏蔽",
                forceRender: true,
                children: (
                  <Form.Item name={["inbound", "region"]} noStyle>
                    <WafRegionFormInput />
                  </Form.Item>
                ),
              },
              {
                key: "allowList",
                label: "白名单",
                forceRender: true,
                children: <WafIPListsForm type="white" form={form} lists={data?.publicIPLists ?? []} />,
              },
              {
                key: "denyList",
                label: "黑名单",
                forceRender: true,
                children: <WafIPListsForm type="black" form={form} lists={data?.publicIPLists ?? []} />,
              },
            ]}
          />

          {/* 底部固定操作栏 */}
          <FooterToolbar>
            <Button
              onClick={() => {
                form.resetFields();
                if (data?.httpFirewallPolicy) form.setFieldsValue(buildWafPolicySettingsValues(data.httpFirewallPolicy));
              }}
            >
              重置
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={submiting}>
              保存
            </Button>
          </FooterToolbar>
        </Form>
      </Card>
    </PageContainer>
  );
}
