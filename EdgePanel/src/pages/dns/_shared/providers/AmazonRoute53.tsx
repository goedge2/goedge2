import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const AmazonRoute53Form = () => {
  return (
    <>
      <Form.Item name={["apiParams", "accessKeyId"]} label="AccessKey ID" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "accessKeySecret"]} label="AccessKey Secret" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "region"]} label="区域" extra="通常不需要填写。">
        <Input />
      </Form.Item>
    </>
  );
};

export const getAmazonRoute53DescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "accessKeyId", label: "Access Key ID", children: apiParams.accessKeyId },
    { key: "accessKeySecret", label: "Access Key Secret", children: apiParams.accessKeySecret },
    apiParams.region ? { key: "region", label: "区域", children: apiParams.region } : null,
  ].filter(Boolean) as DescriptionsProps["items"];
};
