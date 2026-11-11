import { Modal, Form, Input, Select, InputNumber, Collapse, App } from "antd";
import { request } from "@umijs/max";
import { useState, useEffect } from "react";
import type { DNSProvider } from "@/pb/models/model_dns_provider_pb";
import type { DNSProviderType } from "@/pb/service_dns_provider_pb";
import { ProviderForms } from "@/pages/dns/_shared/providers";
import { CompactField } from "@/components/SharedInput";
import { getErrorMessage } from "@/utils";
import { cloudFlareDefaultAPIType } from "../_shared/providers/cloudFlareApiType";

const { Option } = Select;

interface ProviderFormProps {
  provider?: DNSProvider;
  onCancel: () => void;
  onOk: () => void;
}

type ProviderFormValues = {
  name: string;
  type: string;
  minTTL?: number;
  apiParams?: Record<string, unknown>;
};

export const ProviderForm = ({ provider, onCancel, onOk }: ProviderFormProps) => {
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [providerTypes, setProviderTypes] = useState<DNSProviderType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const isEdit = !!provider;
  const selectedType = Form.useWatch("type", form);

  useEffect(() => {
    // Fetch provider types
    const fetchTypes = async () => {
      try {
        setLoadingTypes(true);
        const data = await request<{ providerTypes?: DNSProviderType[] }>("/api/dns/provider/types");
        if (data?.providerTypes) {
          setProviderTypes(data.providerTypes);
        }
      } catch (err) {
        console.error("Failed to load provider types", err);
        modal.error({ title: "加载服务商类型失败", content: getErrorMessage(err, "请求出错，请稍后重试") });
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchTypes();

    // If edit mode, load provider details
    if (isEdit && provider?.id) {
      const fetchProvider = async () => {
        try {
          // maskParams=false to get actual secrets
          const data = await request<{ dnsProvider?: DNSProvider }>(`/api/dns/provider/${provider.id}`, {
            params: { maskParams: false },
          });
          if (data?.dnsProvider) {
            const p = data.dnsProvider;
            const apiParams = p.apiParams || {};

            // For DNSPod, determine apiType based on fields present if missing
            // Ideally apiType is already in apiParams, but if legacy data is missing it:
            if (p.type === "dnspod" && !apiParams.apiType) {
              if (apiParams.id && apiParams.token) apiParams.apiType = "dnsPodToken";
              else if (apiParams.accessKeyId && apiParams.accessKeySecret) apiParams.apiType = "tencentDNS";
            }

            form.setFieldsValue({
              name: p.name,
              type: p.type,
              minTTL: p.minTTL,
              apiParams: apiParams,
            });
          }
        } catch (err) {
          console.error("Failed to load provider details", err);
          modal.error({ title: "加载服务商详情失败", content: getErrorMessage(err, "请求出错，请稍后重试") });
        }
      };
      fetchProvider();
    } else {
      // Create mode defaults
      form.setFieldsValue({
        minTTL: 0,
        apiParams: {
          apiType: "dnsPodToken", // Default for DNSPod if selected
        },
      });
    }
  }, [isEdit, provider, modal, form]);

  const handleTypeChange = (type: string) => {
    // Clear apiParams when switching types to avoid pollution
    form.setFieldValue("apiParams", type === "cloudFlare" ? { apiType: cloudFlareDefaultAPIType } : {});
  };

  const onFinish = async (values: ProviderFormValues) => {
    try {
      setConfirmLoading(true);

      const { name, type, minTTL = 0, apiParams } = values;

      if (isEdit && provider) {
        await request(`/api/dns/provider/${provider.id}`, {
          method: "PUT",
          data: {
            dnsProviderId: provider.id,
            name,
            apiParams,
            minTTL: Number(minTTL) || 0,
          },
        });
      } else {
        await request("/api/dns/provider", {
          method: "POST",
          data: {
            name,
            type,
            apiParams,
            minTTL: Number(minTTL) || 0,
          },
        });
      }

      if (onOk) onOk();
    } catch (error) {
      console.error(isEdit ? "修改DNS服务商失败:" : "创建DNS服务商失败:", error);
      modal.error({
        title: isEdit ? "修改DNS服务商失败" : "创建DNS服务商失败",
        content: getErrorMessage(error, "未知错误"),
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const ProviderFormComponent = selectedType ? ProviderForms[selectedType] : null;

  return (
    <Modal
      open={true}
      title={isEdit ? "修改DNS服务商" : "添加DNS服务商"}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      width={{ xs: "90%", sm: "80%", md: "70%", lg: "60%", xl: "50%", xxl: "40%" }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          minTTL: 0,
        }}
      >
        <Form.Item name="name" label="账号说明" rules={[{ required: true, message: "请输入账号说明" }, { max: 50 }]} extra="用来方便区分不同的账号。">
          <Input placeholder="比如阿里云DNS" />
        </Form.Item>

        <Form.Item name="type" label="服务商厂家" rules={[{ required: true, message: "请选择服务商厂家" }]}>
          {isEdit ? (
            <Select disabled>
              {providerTypes.map((t) => (
                <Option key={t.code} value={t.code}>
                  {t.name}
                </Option>
              ))}
            </Select>
          ) : (
            <Select placeholder="选择服务商" loading={loadingTypes} onChange={handleTypeChange}>
              {providerTypes.map((t) => (
                <Option key={t.code} value={t.code}>
                  {t.name}
                </Option>
              ))}
            </Select>
          )}
        </Form.Item>

        {ProviderFormComponent && <ProviderFormComponent />}

        <Collapse
          ghost
          items={[
            {
              key: "more",
              label: "更多选项",
              children: (
                <Form.Item
                  name="minTTL"
                  label="最小TTL"
                  extra="生成的DNS时可以使用的最小TTL，请根据你选择的服务商和你在服务商中的账号等级进行填写；不填写或者0表示默认。"
                >
                  <CompactField addonAfter="秒" block>
                    <InputNumber style={{ width: "100%" }} min={0} />
                  </CompactField>
                </Form.Item>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
};
