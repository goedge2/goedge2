import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const AliDNSForm = () => {
  return (
    <>
      <Form.Item
        name={["apiParams", "accessKeyId"]}
        label="AccessKey ID"
        rules={[{ required: true, max: 100 }]}
        extra="登录阿里云控制台 -- 在“访问控制”中创建和获取。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "accessKeySecret"]}
        label="AccessKey Secret"
        rules={[{ required: true, max: 100 }]}
        extra="登录阿里云控制台 -- 在“访问控制”中创建和获取。"
      >
        <Input />
      </Form.Item>
      <Form.Item name={["apiParams", "regionId"]} label="区域ID" rules={[{ max: 100 }]} extra="阿里云产品所在区域代号，通常不需要填写。">
        <Input />
      </Form.Item>
    </>
  );
};

export const getAliDNSDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "accessKeyId", label: "AccessKeyId", children: apiParams.accessKeyId },
    { key: "accessKeySecret", label: "AccessKeySecret", children: apiParams.accessKeySecret },
    apiParams.regionId ? { key: "regionId", label: "区域ID", children: apiParams.regionId } : null,
  ].filter(Boolean) as DescriptionsProps["items"];
};
