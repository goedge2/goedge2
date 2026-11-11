import { App, Form, Input, Modal, Radio } from "antd";
import { request } from "@umijs/max";
import { useState } from "react";

import type { CreateSSLCertRequest, CreateSSLCertResponse } from "@/pb/service_ssl_cert_pb";
import { MultiLineArrayTextArea } from "@/components/MultiLineArrayTextArea";
import { DnsProviderSelector } from "@/components/DnsProviderSelector";
import { getErrorMessage } from "@/utils";

type CreateCertPopupProps = {
  onCancel?: () => void;
  onOk?: (sslCertId?: bigint) => void;
  initialDnsNames?: string[];
};

export const CreateCertPopup = ({ onCancel, onOk, initialDnsNames }: CreateCertPopupProps) => {
  const { modal } = App.useApp();

  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  const type = Form.useWatch("type", form);
  const authType = Form.useWatch("acmeAuthType", form);

  const onFinish = async (values: CreateSSLCertRequest) => {
    try {
      setConfirmLoading(true);
      const response = await request<CreateSSLCertResponse>("/api/cert", {
        method: "POST",
        data: values,
      });
      if (onOk) {
        onOk(response.sslCertId);
      }
    } catch (error) {
      console.error("创建证书失败:", error);
      modal.error({
        title: "创建证书失败",
        content: getErrorMessage(error, "未知错误"),
      });
      return;
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Modal
      open={true}
      title="上传/申请证书"
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "50%",
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} labelCol={{ span: 3 }} wrapperCol={{ span: 24 }}>
        <Form.Item
          label="类型"
          name="type"
          layout="horizontal"
          initialValue="automatic"
          help={
            type === "automatic"
              ? "自动申请证书，若已添加正确的DNS服务商，则优先使用DNS验证，否则使用HTTP验证，多顶级域名证书会自动拆分为多个证书。申请将会异步执行，先使用自签名证书占位，申请成功后自动更新。"
              : type === "acme"
                ? "自定义申请证书，指定证书服务商，同步返回申请结果，域名较多时可能需要较长的时间。"
                : type === "upload"
                  ? "手动上传证书和私钥"
                  : ""
          }
        >
          <Radio.Group>
            <Radio value="automatic">自动申请</Radio>
            <Radio value="acme">自定义申请</Radio>
            <Radio value="upload">手动上传证书</Radio>
          </Radio.Group>
        </Form.Item>

        {(type === "automatic" || type === "acme") && (
          <Form.Item
            label="域名"
            help="每行一个域名，申请泛域名证书请先确认是否已添加DNS服务商。"
            name="dnsNames"
            initialValue={initialDnsNames}
            rules={[{ required: true, message: "请输入域名" }]}
          >
            <MultiLineArrayTextArea
              autoSize={{ minRows: 4, maxRows: 6 }}
              spellCheck={false}
              placeholder={"请输入需要申请证书的域名，每行一个域名，例如：\nexample.com\nwww.example.com\n*.example.com"}
            />
          </Form.Item>
        )}

        {type === "acme" && (
          <>
            <Form.Item
              label="证书服务商"
              name="acmeProvider"
              layout="horizontal"
              initialValue="letsencrypt"
              rules={[{ required: true, message: "请选择证书服务商" }]}
            >
              <Radio.Group>
                <Radio value="letsencrypt">Let's Encrypt</Radio>
                <Radio value="zerossl">ZeroSSL</Radio>
                <Radio value="buypass">BuyPass</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              label="申请方式"
              name="acmeAuthType"
              layout="horizontal"
              initialValue="http"
              rules={[{ required: true, message: "请选择申请方式" }]}
              help={
                authType === "http"
                  ? "使用HTTP验证域名所有权，需确保域名解析正确指向当前服务器。"
                  : authType === "dns"
                    ? "使用DNS验证域名所有权，需确保已添加正确的DNS服务商。"
                    : ""
              }
            >
              <Radio.Group>
                <Radio value="http">HTTP验证</Radio>
                <Radio value="dns">DNS验证</Radio>
              </Radio.Group>
            </Form.Item>
            {authType === "dns" && (
              <Form.Item label="DNS服务商" name="acmeDnsProviderId" rules={[{ required: true, message: "请选择DNS服务商" }]}>
                <DnsProviderSelector />
              </Form.Item>
            )}
          </>
        )}

        {type === "upload" && (
          <>
            <Form.Item
              label="证书说明"
              name="name"
              layout="horizontal"
              initialValue="用户上传证书"
              rules={[{ required: true, message: "请输入证书说明" }]}
            >
              <Input placeholder="请输入证书说明" />
            </Form.Item>
            <Form.Item label="证书内容" name="certData" rules={[{ required: true, message: "请输入证书内容" }]}>
              <Input.TextArea
                placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                autoSize={{ minRows: 4, maxRows: 8 }}
                spellCheck={false}
              />
            </Form.Item>
            <Form.Item label="私钥内容" name="keyData" rules={[{ required: true, message: "请输入私钥内容" }]}>
              <Input.TextArea
                placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                autoSize={{ minRows: 4, maxRows: 8 }}
                spellCheck={false}
              />
            </Form.Item>
            <Form.Item label="详细说明" name="description">
              <Input.TextArea placeholder="请输入证书详细说明" autoSize={{ minRows: 2, maxRows: 6 }} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};
