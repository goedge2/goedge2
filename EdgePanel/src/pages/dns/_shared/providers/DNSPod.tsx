import { Form, Input, Select, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

const { Option } = Select;

export const DNSPodForm = () => {
  const apiType = Form.useWatch(["apiParams", "apiType"]);

  return (
    <>
      <Form.Item name={["apiParams", "apiType"]} label="密钥类型" rules={[{ required: true }]} initialValue="dnsPodToken">
        <Select>
          <Option value="tencentDNS">腾讯云API密钥</Option>
          <Option value="dnsPodToken">DNSPod Token</Option>
        </Select>
      </Form.Item>
      {apiType === "tencentDNS" ? (
        <>
          <Form.Item
            name={["apiParams", "accessKeyId"]}
            label="SecretId"
            rules={[{ required: true, max: 100 }]}
            extra="在DNSPod控制台“账号中心--API密钥”中获取。"
          >
            <Input placeholder="请输入SecretId" />
          </Form.Item>
          <Form.Item
            name={["apiParams", "accessKeySecret"]}
            label="SecretKey"
            rules={[{ required: true, max: 100 }]}
            extra="在DNSPod控制台“账号中心--API密钥”中获取。"
          >
            <Input placeholder="请输入SecretKey" />
          </Form.Item>
          <Form.Item name={["apiParams", "region"]} label="区域">
            <Input />
          </Form.Item>
        </>
      ) : (
        <>
          <Form.Item
            name={["apiParams", "id"]}
            label="密钥ID"
            rules={[{ required: true, max: 100 }]}
            extra="在DNSPod控制台“账号中心--API密钥--DNSPod Token”中获取。"
          >
            <Input placeholder="请输入密钥ID" />
          </Form.Item>
          <Form.Item
            name={["apiParams", "token"]}
            label="密钥Token"
            rules={[{ required: true, max: 100 }]}
            extra="在DNSPod控制台“账号中心--API密钥--DNSPod Token”中获取。"
          >
            <Input placeholder="请输入密钥Token" />
          </Form.Item>
          <Form.Item name={["apiParams", "region"]} label="区域">
            <Select>
              <Option value="">中国站</Option>
              <Option value="international">国际站</Option>
            </Select>
          </Form.Item>
        </>
      )}
    </>
  );
};

export const getDNSPodDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  if (apiParams.apiType === "tencentDNS") {
    return [
      { key: "apiType", label: "密钥类型", children: "腾讯云API密钥" },
      { key: "accessKeyId", label: "SecretId", children: apiParams.accessKeyId },
      { key: "accessKeySecret", label: "SecretKey", children: apiParams.accessKeySecret },
      apiParams.region ? { key: "region", label: "区域", children: apiParams.region } : null,
    ].filter(Boolean) as DescriptionsProps["items"];
  } else {
    return [
      { key: "apiType", label: "密钥类型", children: "DNSPod Token" },
      { key: "id", label: "密钥ID", children: apiParams.id },
      { key: "token", label: "密钥Token", children: apiParams.token },
      apiParams.region ? { key: "region", label: "区域", children: apiParams.region === "international" ? "国际站" : "中国站" } : null,
    ].filter(Boolean) as DescriptionsProps["items"];
  }
};
