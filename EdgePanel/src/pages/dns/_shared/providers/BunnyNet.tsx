import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const BunnyNetForm = () => {
  return (
    <>
      <Form.Item name={["apiParams", "apiKey"]} label="API Key" rules={[{ required: true }]} extra="在“Edit account details” -- “API Key”中获取。">
        <Input />
      </Form.Item>
    </>
  );
};

export const getBunnyNetDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [{ key: "apiKey", label: "API Key", children: apiParams.apiKey }].filter(Boolean) as DescriptionsProps["items"];
};
