import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const DNSLaForm = () => {
  return (
    <>
      <Form.Item name={["apiParams", "apiId"]} label="API ID" rules={[{ required: true }]} extra="在DNS.LA控制台--账户信息中查看。">
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "secret"]} label="API密钥" rules={[{ required: true }]} extra="在DNS.LA控制台--账户信息中查看。">
        <Input />
      </Form.Item>
    </>
  );
};

export const getDNSLaDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "apiId", label: "API ID", children: apiParams.apiId },
    { key: "secret", label: "API密钥", children: apiParams.secret },
  ].filter(Boolean) as DescriptionsProps["items"];
};
