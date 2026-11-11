import { Form, Input, type DescriptionsProps } from "antd";
import PasswordInput from "@/components/PasswordInput";
import type { ProviderApiParams } from "./types";

export const ClouDNSForm = () => {
  return (
    <>
      <Form.Item label="认证ID" style={{ marginBottom: 0 }} required extra="用户认证ID和子用户认证ID至少填写一个。可以在ClouDNS API设置页面添加。">
        <Form.Item name={["apiParams", "authId"]} style={{ display: "inline-block", width: "calc(50% - 8px)" }}>
          <Input placeholder="用户认证ID" />
        </Form.Item>
        <Form.Item name={["apiParams", "subAuthId"]} style={{ display: "inline-block", width: "calc(50% - 8px)", margin: "0 0 0 16px" }}>
          <Input placeholder="子用户认证ID" />
        </Form.Item>
      </Form.Item>
      <Form.Item name={["apiParams", "authPassword"]} label="认证密码" rules={[{ required: true }]} extra="用户或者子用户的认证密码。">
        <PasswordInput />
      </Form.Item>
    </>
  );
};

export const getClouDNSDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    apiParams.authId ? { key: "authId", label: "认证ID", children: apiParams.authId } : null,
    apiParams.subAuthId ? { key: "subAuthId", label: "子用户认证ID", children: apiParams.subAuthId } : null,
    { key: "authPassword", label: "认证密码", children: apiParams.authPassword },
  ].filter(Boolean) as DescriptionsProps["items"];
};
