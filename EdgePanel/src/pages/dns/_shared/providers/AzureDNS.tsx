import { Form, Input, type DescriptionsProps } from "antd";
import type { ProviderApiParams } from "./types";

export const AzureDNSForm = () => {
  return (
    <>
      <Form.Item
        name={["apiParams", "subscriptionId"]}
        label="订阅ID (Subscription ID)"
        rules={[{ required: true }]}
        extra="可以在订阅（Subscriptions）服务中查看。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "tenantId"]}
        label="目录(租户) ID (Tenant ID)"
        rules={[{ required: true }]}
        extra="可以在应用注册（App registrations）中对应应用概述（Overview）中查看。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "clientId"]}
        label="应用程序(客户端) ID (Client ID)"
        rules={[{ required: true }]}
        extra="需要在应用注册（App registrations）中新注册应用程序获得。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "clientSecret"]}
        label="客户端密码值 (Client Secret Value)"
        rules={[{ required: true }]}
        extra="可以在应用注册（App registrations）中对应应用的“证书和密码（Certificates & secrets）”--“客户端密码（Client secrets）”中创建和查看。"
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={["apiParams", "resourceGroupName"]}
        label="资源组 (Resource Group Name)"
        rules={[{ required: true }]}
        extra="参考权限设置帮助：你需要在对应资源组（Resource group）-- 访问控制（Access control (IAM)）-- 角色分配（Role assignments）中添加一个角色分配（Role assignment），其中作业职能角色（Job function roles）为“DNS 区域参与者(DNS Zone Contributor)”，成员（Members）为应用注册（App registrations）中的应用程序（application）（有时需要在选择成员（select members）界面搜索应用程序（application）名称才能看到）。"
      >
        <Input />
      </Form.Item>
    </>
  );
};

export const getAzureDNSDescriptionItems = (apiParams: ProviderApiParams): DescriptionsProps["items"] => {
  return [
    { key: "subscriptionId", label: "订阅ID", children: apiParams.subscriptionId },
    { key: "tenantId", label: "目录(租户) ID", children: apiParams.tenantId },
    { key: "clientId", label: "应用程序(客户端) ID", children: apiParams.clientId },
    { key: "clientSecret", label: "客户端密码值", children: apiParams.clientSecret },
    { key: "resourceGroupName", label: "资源组", children: apiParams.resourceGroupName },
  ].filter(Boolean) as DescriptionsProps["items"];
};
