import { Form, Input, InputNumber, Select, Switch } from "antd";
import type { SearchAccessLogStorageSettings } from "@/pb/service_sys_setting_pb";
import type { SearchLogStorageInput } from "@/services/settings";
import PasswordInput from "@/components/PasswordInput";

export type SearchStorageFormValues = Omit<SearchLogStorageInput, "endpoints"> & { endpointsText: string };

export function searchStorageFormValues(settings?: SearchAccessLogStorageSettings): SearchStorageFormValues {
  return {
    endpointsText: settings?.endpoints.join("\n") ?? "",
    indexPrefix: settings?.indexPrefix || "edge-http-accesslogs",
    timeoutSeconds: settings?.timeoutSeconds || 10,
    authType: settings?.authType || "none",
    username: settings?.username ?? "",
    password: "",
    apiKey: "",
    caPEM: settings?.caPEM ?? "",
    clearPassword: false,
    clearApiKey: false,
  };
}

export function BleveStorageFields() {
  return (
    <Form.Item
      name="bleveDirectory"
      label="索引目录"
      rules={[
        { required: true, message: "请输入绝对路径" },
        { pattern: /^\//, message: "请输入绝对路径" },
      ]}
      extra="目录位于主 API 所在机器，需要持久化保存。"
    >
      <Input />
    </Form.Item>
  );
}

export function SearchStorageFields({ settings }: { settings?: SearchAccessLogStorageSettings }) {
  const form = Form.useFormInstance();
  const authType = Form.useWatch("authType", form);
  const clearPassword = Form.useWatch("clearPassword", form);
  const clearApiKey = Form.useWatch("clearApiKey", form);
  return (
    <>
      <Form.Item
        name="endpointsText"
        label="连接地址"
        extra="每行一个 HTTP(S) 地址，例如 https://search.example.com:9200"
        rules={[
          { required: true, message: "请输入连接地址" },
          {
            validator: async (_, value: string) => {
              const endpoints = (value || "").split(/\s+/).filter(Boolean);
              for (const endpoint of endpoints) {
                let parsed: URL;
                try {
                  parsed = new URL(endpoint);
                } catch {
                  throw new Error("请输入有效的 HTTP(S) 地址");
                }
                if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash)
                  throw new Error("连接地址需使用 HTTP(S)，认证信息请填写在专用字段中");
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item
        name="indexPrefix"
        label="索引前缀"
        rules={[{ required: true }, { pattern: /^[a-z0-9][a-z0-9_-]{0,99}$/, message: "使用小写字母、数字、下划线或连字符，以字母或数字开头" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="timeoutSeconds" label="请求超时（秒）" rules={[{ required: true }]}>
        <InputNumber min={1} max={120} />
      </Form.Item>
      <Form.Item name="authType" label="认证方式">
        <Select
          options={[
            { label: "无认证", value: "none" },
            { label: "用户名和密码", value: "basic" },
            { label: "API Key", value: "apiKey" },
          ]}
        />
      </Form.Item>
      {authType === "basic" && (
        <>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: !settings?.hasPassword || clearPassword, message: "请输入密码" }]}
            extra={settings?.hasPassword ? "已配置密码，留空保留原密码。" : undefined}
          >
            <PasswordInput placeholder={settings?.hasPassword ? "不修改请留空" : "请输入密码"} />
          </Form.Item>
        </>
      )}
      {authType === "apiKey" && (
        <Form.Item
          name="apiKey"
          label="API Key"
          rules={[{ required: !settings?.hasApiKey || clearApiKey, message: "请输入 API Key" }]}
          extra="填写目标服务接受的完整 token；服务版本不支持时测试将失败。"
        >
          <PasswordInput placeholder={settings?.hasApiKey ? "已配置，不修改请留空" : "请输入 API Key"} />
        </Form.Item>
      )}
      {settings?.hasPassword && authType !== "basic" && (
        <Form.Item name="clearPassword" label="清除已保存密码" valuePropName="checked">
          <Switch />
        </Form.Item>
      )}
      {settings?.hasApiKey && authType !== "apiKey" && (
        <Form.Item name="clearApiKey" label="清除已保存 API Key" valuePropName="checked">
          <Switch />
        </Form.Item>
      )}
      <Form.Item name="caPEM" label="自定义 CA 证书（PEM）" extra="HTTPS 默认验证服务器证书。使用系统信任的证书时可留空。">
        <Input.TextArea rows={4} placeholder="-----BEGIN CERTIFICATE-----" />
      </Form.Item>
    </>
  );
}
