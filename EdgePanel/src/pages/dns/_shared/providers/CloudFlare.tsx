import { Form, Input, Select, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";
import { cloudFlareAPITypeAPIToken, cloudFlareAPITypeGlobalKey, getCloudFlareAPIType } from "./cloudFlareApiType";

export const CloudFlareForm = () => {
  const apiType = getCloudFlareAPIType(Form.useWatch(["apiParams", "apiType"]));

  return (
    <>
      <Form.Item name={["apiParams", "apiType"]} label="认证方式" rules={[{ required: true }]}>
        <Select
          options={[
            { label: "API Token（推荐）", value: cloudFlareAPITypeAPIToken },
            { label: "Global API Key", value: cloudFlareAPITypeGlobalKey },
          ]}
        />
      </Form.Item>
      {apiType === cloudFlareAPITypeAPIToken ? (
        <Form.Item
          name={["apiParams", "apiToken"]}
          label="API Token"
          rules={[{ required: true }]}
          extra="在 Cloudflare “我的个人资料”--“API 令牌”中创建。请授予 Zone:DNS:Edit 和 Zone:Zone:Read 权限。"
        >
          <Input />
        </Form.Item>
      ) : (
        <>
          <Form.Item
            name={["apiParams", "apiKey"]}
            label="Global API Key"
            rules={[{ required: true }]}
            extra="在个人资料中的“API令牌”--“API密钥”--“Global API Key”中获取。"
          >
            <Input />
          </Form.Item>
          <Form.Item name={["apiParams", "email"]} label="账号邮箱" rules={[{ required: true }]} extra="登录账号使用的邮箱。">
            <Input />
          </Form.Item>
        </>
      )}
    </>
  );
};

export const getCloudFlareDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  const apiType = getCloudFlareAPIType(apiParams.apiType);

  if (apiType === cloudFlareAPITypeAPIToken) {
    return [
      { key: "apiType", label: "认证方式", children: "API Token" },
      { key: "apiToken", label: "API Token", children: apiParams.apiToken },
    ].filter(Boolean) as DescriptionsProps["items"];
  }

  return [
    { key: "apiType", label: "认证方式", children: "Global API Key" },
    { key: "email", label: "账号邮箱", children: apiParams.email },
    { key: "apiKey", label: "Global API Key", children: apiParams.apiKey },
  ].filter(Boolean) as DescriptionsProps["items"];
};
