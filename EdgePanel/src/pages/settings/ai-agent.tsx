import { ApiOutlined, CheckCircleOutlined, DeleteOutlined, KeyOutlined, RobotOutlined } from "@ant-design/icons";
import { FooterToolbar, PageContainer } from "@ant-design/pro-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Switch, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@umijs/max";

import type { AIAgentAPIProtocol, AIAgentConfigForm, AIAgentProvider } from "@/components/AIAgent/model";
import { buildConfigInput, defaultContextWindowTokens, getProviderPreset } from "@/components/AIAgent/model";
import { buildPageBreadcrumb } from "@/runtime/breadcrumbs";
import { aiAgentQueryKeys, readAIAgentConfig, testAIAgentConfig, updateAIAgentConfig } from "@/services/aiAgent";
import { formatErrorMessage } from "@/utils";
import PasswordInput from "@/components/PasswordInput";

import { advSettingTabList } from "./_shared/advSettingTabList";

const providerOptions = [
  { label: "OpenAI 兼容", value: "openaiCompatible" },
  { label: "Anthropic Claude", value: "claude" },
  { label: "Google Gemini", value: "gemini" },
  { label: "火山方舟", value: "ark" },
  { label: "阿里云百炼 / Qwen", value: "qwen" },
];

const defaultValues: AIAgentConfigForm = {
  enabled: false,
  provider: "openaiCompatible",
  apiProtocol: "chatCompletions",
  endpoint: getProviderPreset("openaiCompatible").endpoint,
  apiKey: "",
  model: getProviderPreset("openaiCompatible").model,
  contextWindowTokens: defaultContextWindowTokens,
  maxOutputTokens: 4096,
  telegramEnabled: false,
  telegramToken: "",
  telegramProxyURL: "",
};

export default function AIAgentSettings() {
  const [form] = Form.useForm<AIAgentConfigForm>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearApiKey, setClearApiKey] = useState(false);
  const [clearTelegramToken, setClearTelegramToken] = useState(false);
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: aiAgentQueryKeys.config, queryFn: readAIAgentConfig });
  const provider = Form.useWatch("provider", form);
  const enabled = Form.useWatch("enabled", form);

  useEffect(() => {
    if (!query.data) {
      return;
    }
    form.setFieldsValue({
      enabled: query.data.enabled,
      provider: (query.data.provider === "openai" ? "openaiCompatible" : query.data.provider || "openaiCompatible") as AIAgentProvider,
      apiProtocol: (query.data.apiProtocol || "chatCompletions") as AIAgentAPIProtocol,
      endpoint: query.data.endpoint,
      apiKey: "",
      model: query.data.model,
      contextWindowTokens: Number(query.data.contextWindowTokens || defaultContextWindowTokens),
      maxOutputTokens: Number(query.data.maxOutputTokens || 4096),
      telegramEnabled: query.data.telegramEnabled,
      telegramToken: "",
      telegramProxyURL: query.data.telegramProxyURL || "",
    });
    setClearApiKey(false);
    setClearTelegramToken(false);
  }, [form, query.data]);

  const buildCurrentInput = async () => {
    const values = await form.validateFields();
    return buildConfigInput(values, Boolean(query.data?.hasApiKey), clearApiKey, Boolean(query.data?.hasTelegramToken), clearTelegramToken);
  };

  const handleProviderChange = (nextProvider: AIAgentProvider) => {
    const preset = getProviderPreset(nextProvider);
    form.setFieldsValue({ ...preset, apiProtocol: nextProvider === "openaiCompatible" ? form.getFieldValue("apiProtocol") : "chatCompletions" });
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await testAIAgentConfig(await buildCurrentInput());
      message.success("连接成功，模型可以正常响应");
    } catch (error) {
      message.error(formatErrorMessage("连接测试失败", error));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAIAgentConfig(await buildCurrentInput());
      await queryClient.invalidateQueries({ queryKey: aiAgentQueryKeys.config });
      message.success("AI Agent 设置已保存");
      setClearApiKey(false);
      setClearTelegramToken(false);
      form.setFieldValue("apiKey", "");
    } catch (error) {
      message.error(formatErrorMessage("保存失败", error));
    } finally {
      setSaving(false);
    }
  };

  const hasStoredKey = Boolean(query.data?.hasApiKey) && !clearApiKey;
  const hasStoredTelegramToken = Boolean(query.data?.hasTelegramToken) && !clearTelegramToken;

  return (
    <PageContainer
      breadcrumb={buildPageBreadcrumb({ pathname: location.pathname, tabList: advSettingTabList })}
      header={{ title: "系统设置" }}
      loading={query.isPending && !query.data}
      tabList={advSettingTabList}
      tabActiveKey={location.pathname}
      onTabChange={(key) => navigate(key)}
    >
      <Form form={form} layout="vertical" initialValues={defaultValues} requiredMark="optional">
        <Card
          title={
            <Space>
              <RobotOutlined />
              内置 AI Agent
            </Space>
          }
          extra={<Tag color={enabled ? "success" : "default"}>{enabled ? "已启用" : "未启用"}</Tag>}
        >
          <Typography.Paragraph type="secondary">
            AI Agent 可以通过对话申请证书和创建网站。所有变更操作都会先展示参数，并在你明确确认后执行。
          </Typography.Paragraph>
          <Form.Item name="enabled" label="启用 AI Agent" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="provider" label="模型服务商" rules={[{ required: true }]}>
                <Select options={providerOptions} onChange={handleProviderChange} />
              </Form.Item>
            </Col>
            {provider === "openaiCompatible" ? (
              <Col xs={24} md={8}>
                <Form.Item
                  name="apiProtocol"
                  label="API 协议"
                  rules={[{ required: true }]}
                  extra="Responses API 用于只支持 Responses 协议的模型端点。"
                >
                  <Select
                    options={[
                      { label: "Chat Completions（默认）", value: "chatCompletions" },
                      { label: "Responses API", value: "responses" },
                    ]}
                  />
                </Form.Item>
              </Col>
            ) : null}
            <Col xs={24} md={16}>
              <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true }, { type: "url", message: "请输入有效的 URL" }]}>
                <Input prefix={<ApiOutlined />} placeholder="https://api.example.com/v1" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="apiKey"
                label="API Key"
                extra={
                  hasStoredKey ? (
                    <Space size={8}>
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      已保存密钥 {query.data?.apiKeyMask}
                      <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => setClearApiKey(true)}>
                        清除
                      </Button>
                    </Space>
                  ) : clearApiKey ? (
                    "保存后会删除已有密钥；输入新密钥可直接替换。"
                  ) : (
                    "密钥会加密保存；留空时保留已有密钥。"
                  )
                }
              >
                <PasswordInput
                  prefix={<KeyOutlined />}
                  autoComplete="new-password"
                  placeholder={hasStoredKey ? "留空以保留现有密钥" : "请输入 API Key"}
                  onChange={(event) => {
                    if (event.target.value) {
                      setClearApiKey(false);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="model"
                label="模型"
                rules={[{ required: true }]}
                extra={provider === "ark" ? "方舟需要填写已部署的 Endpoint ID。" : undefined}
              >
                <Input placeholder="请输入模型名称" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="上下文与生成参数" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="contextWindowTokens"
                label="上下文窗口"
                rules={[{ required: true, message: "请输入上下文窗口大小" }]}
                extra="单位为 tokens；未知模型默认 200,000，达到约 70% 时自动压缩较早的对话。"
              >
                <InputNumber<number>
                  min={8192}
                  max={4_000_000}
                  step={8192}
                  style={{ width: "100%" }}
                  placeholder="200,000"
                  formatter={(value, info) => (info.userTyping ? info.input : value ? Number(value).toLocaleString("en-US") : "")}
                  parser={(value) => Number(value?.replace(/,/g, "") || 0)}
                  suffix="tokens"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="maxOutputTokens" label="最大输出长度" rules={[{ required: true }]}>
                <InputNumber min={256} max={131072} step={256} style={{ width: "100%" }} suffix="tokens" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Telegram BOT" style={{ marginTop: 16 }}>
          <Typography.Paragraph type="secondary">
            启用后，已绑定的 Telegram 私聊用户可以使用 AI Agent 查询和操作网站、集群与节点。BOT Token 会加密保存，留空时保留已有 Token。
          </Typography.Paragraph>
          <Form.Item name="telegramEnabled" label="启用 Telegram BOT" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="telegramToken"
                label="BOT Token"
                extra={
                  hasStoredTelegramToken ? (
                    <Space size={8}>
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      已保存 Token {query.data?.telegramTokenMask}
                      <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => setClearTelegramToken(true)}>
                        清除
                      </Button>
                    </Space>
                  ) : clearTelegramToken ? (
                    "保存后会删除已有 Token；输入新 Token 可直接替换。"
                  ) : (
                    "留空时保留已有 Token。"
                  )
                }
              >
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={hasStoredTelegramToken ? "留空以保留现有 Token" : "请输入 @BotFather 提供的 Token"}
                  onChange={(event) => {
                    if (event.target.value) setClearTelegramToken(false);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="telegramProxyURL"
                label="代理服务器（可选）"
                rules={[{ type: "url", message: "请输入有效的代理 URL" }]}
                extra="支持 http://、https:// 和 socks5://。"
              >
                <Input placeholder="socks5://127.0.0.1:1080" />
              </Form.Item>
            </Col>
          </Row>
          {query.data?.telegramBotUsername ? <Typography.Text type="secondary">Bot：@{query.data.telegramBotUsername}</Typography.Text> : null}
        </Card>

        <FooterToolbar>
          <Space>
            <Button onClick={() => void handleTest()} loading={testing} disabled={saving}>
              测试连接
            </Button>
            <Button type="primary" onClick={() => void handleSave()} loading={saving} disabled={testing}>
              保存
            </Button>
          </Space>
        </FooterToolbar>
      </Form>
    </PageContainer>
  );
}
