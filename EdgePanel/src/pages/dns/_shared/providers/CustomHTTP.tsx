import { Form, Input, type DescriptionsProps } from "antd";
import { useEffect } from "react";
import { randomString } from "@/utils";
import type { ProviderApiParams } from "./types";

export const CustomHTTPForm = () => {
  const form = Form.useFormInstance();
  const secret = Form.useWatch(["apiParams", "secret"], form);

  useEffect(() => {
    // Only set if not present (create mode) or empty
    if (!secret) {
      form.setFieldValue(["apiParams", "secret"], randomString(64));
    }
  }, [form, secret]);

  return (
    <>
      <Form.Item
        name={["apiParams", "url"]}
        label="HTTP URL"
        rules={[{ required: true }, { pattern: /^https?:\/\//, message: "必须以 http:// 或 https:// 开头" }]}
        extra="HTTP URL完整地址，DNS所有操作都会以POST的方式转发到此地址。"
      >
        <Input placeholder="http://..." />
      </Form.Item>
      <Form.Item
        name={["apiParams", "secret"]}
        label="私钥"
        rules={[{ required: true }]}
        extra="通讯用的私钥，转发请求时会在Header中加入相关信息，方便开发者校验请求是否合法。"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export const getCustomHTTPDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "url", label: "HTTP URL", children: apiParams.url },
    { key: "secret", label: "私钥", children: apiParams.secret },
  ].filter(Boolean) as DescriptionsProps["items"];
};
