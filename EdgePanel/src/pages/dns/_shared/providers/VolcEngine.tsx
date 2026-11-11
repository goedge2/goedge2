import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const VolcEngineForm = () => {
  return (
    <>
      <Form.Item
        name={["apiParams", "accessKeyId"]}
        label="AccessKey ID"
        rules={[{ required: true }]}
        extra="在火山引擎“访问控制--API访问密钥”中获取。"
      >
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "accessKeySecret"]} label="AccessKey Secret" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};

export const getVolcEngineDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "accessKeyId", label: "AccessKey ID", children: apiParams.accessKeyId },
    { key: "accessKeySecret", label: "AccessKey Secret", children: apiParams.accessKeySecret },
  ].filter(Boolean) as DescriptionsProps["items"];
};
