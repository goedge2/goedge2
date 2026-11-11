import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const DNSComForm = () => {
  return (
    <>
      <Form.Item name={["apiParams", "key"]} label="API Key" rules={[{ required: true }]} extra="在DNS.COM控制台账号中心--API设置中创建和查看。">
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "secret"]}
        label="API Secret"
        rules={[{ required: true }]}
        extra="在DNS.COM控制台账号中心--API设置中创建和查看。"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export const getDNSComDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "key", label: "API Key", children: apiParams.key },
    { key: "secret", label: "API Secret", children: apiParams.secret },
  ].filter(Boolean) as DescriptionsProps["items"];
};
