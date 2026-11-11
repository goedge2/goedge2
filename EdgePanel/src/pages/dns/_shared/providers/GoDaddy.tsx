import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const GoDaddyForm = () => {
  return (
    <>
      <Form.Item
        name={["apiParams", "key"]}
        label="Key"
        rules={[{ required: true }]}
        extra={
          <span>
            可以在GoDaddy
            <a href="https://developer.godaddy.com/keys" target="_blank">
              开发者中心
            </a>
            创建，创建时Environment选择Production。
          </span>
        }
      >
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "secret"]} label="Secret" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};

export const getGoDaddyDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "key", label: "Key", children: apiParams.key },
    { key: "secret", label: "Secret", children: apiParams.secret },
  ].filter(Boolean) as DescriptionsProps["items"];
};
