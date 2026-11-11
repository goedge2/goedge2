import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const HuaweiDNSForm = () => {
  return (
    <>
      <Form.Item
        name={["apiParams", "accessKeyId"]}
        label="Access Key ID"
        rules={[{ required: true }]}
        extra="登录华为云控制台 -- 在“我的凭证 -- 访问密钥”中创建和获取。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "accessKeySecret"]}
        label="Access Key Secret"
        rules={[{ required: true }]}
        extra="登录华为云控制台 -- 在“我的凭证 -- 访问密钥”中创建和获取。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "endpoint"]}
        label="终端节点"
        extra={
          <span>
            选填项。可以填写终端节点（Endpoint）区域代号或者域名，参考{" "}
            <a href="https://developer.huaweicloud.com/endpoint?DNS" target="_blank">
              https://developer.huaweicloud.com/endpoint?DNS
            </a>
            （如果此链接失效，请到华为云开发者中心自行查找）。
          </span>
        }
      >
        <Input />
      </Form.Item>
    </>
  );
};

export const getHuaweiDNSDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "accessKeyId", label: "AccessKeyId", children: apiParams.accessKeyId },
    { key: "accessKeySecret", label: "AccessKeySecret", children: apiParams.accessKeySecret },
    apiParams.endpoint ? { key: "endpoint", label: "终端节点", children: apiParams.endpoint } : null,
  ].filter(Boolean) as DescriptionsProps["items"];
};
