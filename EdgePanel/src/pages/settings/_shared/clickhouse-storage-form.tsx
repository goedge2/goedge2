import { Alert, Form, Input, InputNumber, Switch } from "antd";
import PasswordInput from "@/components/PasswordInput";
import type { ClickHouseAccessLogStorageSettings } from "@/pb/service_sys_setting_pb";

export interface ClickHouseStorageFormValues {
  endpoint: string;
  database: string;
  table: string;
  username: string;
  password: string;
  timeoutSeconds: number;
  caPEM: string;
  clearPassword: boolean;
}

export function clickHouseStorageFormValues(settings?: ClickHouseAccessLogStorageSettings): ClickHouseStorageFormValues {
  return {
    endpoint: settings?.endpoint ?? "",
    database: settings?.database || "default",
    table: settings?.table || "edge_http_accesslogs",
    username: settings?.username || "default",
    password: "",
    timeoutSeconds: settings?.timeoutSeconds || 10,
    caPEM: settings?.caPEM ?? "",
    clearPassword: false,
  };
}

export function ClickHouseStorageFields({ settings }: { settings?: ClickHouseAccessLogStorageSettings }) {
  const clearPassword = Form.useWatch<boolean>("clearPassword");
  return (
    <>
      <Alert
        type="info"
        showIcon
        title="使用 ClickHouse HTTP(S) 接口，常用端口为 8123 / 8443。"
        description="数据库需预先创建，日志表会自动创建并按日期分区。测试会检查目标表结构，并使用临时表验证读写及分区清理；账号需要建表、读写、删除表和删除分区权限。请使用专用日志表。"
        style={{ marginBottom: 24 }}
      />
      <Form.Item
        name="endpoint"
        label="连接地址"
        rules={[
          { required: true, message: "请输入 HTTP(S) 连接地址" },
          {
            validator: async (_, value: string) => {
              if (!value) return;
              try {
                const endpoint = new URL(value);
                if (
                  ["http:", "https:"].includes(endpoint.protocol) &&
                  endpoint.hostname &&
                  !endpoint.username &&
                  !endpoint.password &&
                  !endpoint.search &&
                  !endpoint.hash
                )
                  return;
              } catch {}
              throw new Error("请输入不含凭据、查询参数或片段的 HTTP(S) URL");
            },
          },
        ]}
      >
        <Input placeholder="https://clickhouse.example.com:8443" autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="database"
        label="数据库名"
        rules={[
          { required: true },
          { pattern: /^[A-Za-z_][A-Za-z0-9_]{0,63}$/, message: "使用字母或下划线开头的字母、数字、下划线，最多 64 个字符" },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="table"
        label="日志表名"
        rules={[
          { required: true },
          { pattern: /^[A-Za-z_][A-Za-z0-9_]{0,63}$/, message: "使用字母或下划线开头的字母、数字、下划线，最多 64 个字符" },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="timeoutSeconds" label="请求超时（秒）" rules={[{ required: true }]}>
        <InputNumber min={1} max={120} />
      </Form.Item>
      <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="password"
        label="密码"
        extra={settings?.hasPassword ? "已配置密码，留空保留原密码；如需删除，请显式清除。" : "允许无密码账号，生产环境建议配置专用账号与密码。"}
      >
        <PasswordInput disabled={clearPassword} placeholder={settings?.hasPassword ? "不修改请留空" : "请输入密码（可选）"} />
      </Form.Item>
      {settings?.hasPassword && (
        <Form.Item name="clearPassword" label="清除已保存密码" valuePropName="checked">
          <Switch />
        </Form.Item>
      )}
      <Form.Item name="caPEM" label="自定义 CA 证书（PEM）" extra="HTTPS 默认验证服务器证书。使用系统信任的证书时可留空。">
        <Input.TextArea rows={4} placeholder="-----BEGIN CERTIFICATE-----" />
      </Form.Item>
    </>
  );
}
