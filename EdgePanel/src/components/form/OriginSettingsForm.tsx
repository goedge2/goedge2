import { Collapse, Form, FormInstance, FormProps, Grid, Input, InputNumber, Select, Switch } from "antd";
import { request } from "@umijs/max";
import { MultiLineArrayTextArea } from "../MultiLineArrayTextArea";
import type { NetworkAddress } from "../../pb/models/model_network_address_pb";
import { ChangeEvent } from "react";
import type { CreateOriginResponse } from "../../pb/service_origin_pb";
import type { Origin } from "../../pb/models/model_origin_pb";
import { CustomFormItemProps } from "../../utils";
import { CompactField } from "../SharedInput";
import { CertsSelector } from "../CertsSelector";
import type { SSLCert } from "@/pb/models/model_ssl_cert_pb";
import { OriginConnectionFields } from "./OriginConnectionFields";

type OriginSettingsFormProps = {
  form?: FormInstance;
  onSuccess?: (response?: Origin | undefined) => void;
  onError?: (error?: string | unknown | undefined) => void;
};

const protocolOptions = [
  { value: "http", label: "http://" },
  { value: "https", label: "https://" },
];

const AddrInput = ({ id, value, onChange }: CustomFormItemProps<NetworkAddress> & { id?: string }) => {
  const onProtocolChange = (protocol?: string) => {
    let portRange = value?.portRange;
    if (protocol === "https" && value?.portRange === "80") {
      portRange = "443";
    } else if (protocol === "http" && value?.portRange === "443") {
      portRange = "80";
    }

    const newValue = { ...value, protocol: protocol, portRange: portRange } as NetworkAddress;
    onChange?.(newValue);
  };
  const onHostChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newHost = e.target.value;
    const newValue = { ...value, host: newHost } as NetworkAddress;
    onChange?.(newValue);
  };
  const onPortChange = (port?: string | null) => {
    const newValue = { ...value, portRange: port } as NetworkAddress;
    onChange?.(newValue);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Select
        aria-label="源站协议"
        size="large"
        onChange={onProtocolChange}
        options={protocolOptions}
        value={value?.protocol}
        style={{ width: 106 }}
      />
      <CompactField
        addonAfter={
          <InputNumber
            aria-label="源站端口"
            size="large"
            value={value?.portRange}
            onChange={onPortChange}
            placeholder="端口"
            stringMode
            min="1"
            max="65535"
            precision={0}
            style={{ width: 90 }}
          />
        }
        block
        style={{ flex: "1 1 240px", minWidth: 0 }}
      >
        <Input id={id} size="large" onChange={onHostChange} value={value?.host} placeholder="IP或域名" style={{ minWidth: 0, flex: 1 }} />
      </CompactField>
    </div>
  );
};

const OriginCertInput = ({ value, onChange }: CustomFormItemProps<Origin["certRef"]>) => {
  const form = Form.useFormInstance();
  const cert = Form.useWatch("cert", { form, preserve: true }) as SSLCert | undefined;
  const selected = value?.certId && value.certId !== "0";
  const certificate = cert || ({ id: value?.certId, name: `证书 #${value?.certId}`, dnsNames: [] } as unknown as SSLCert);

  return (
    <CertsSelector
      single
      value={selected ? [certificate] : []}
      onChange={(certs) => {
        const selectedCert = certs?.[0];
        form.setFieldValue("cert", selectedCert);
        onChange?.({ isOn: Boolean(selectedCert), certId: String(selectedCert?.id ?? "0") } as Origin["certRef"]);
      }}
    />
  );
};

function OriginSettingsForm({ form, onSuccess, onError, ...props }: OriginSettingsFormProps & FormProps) {
  const screens = Grid.useBreakpoint();
  const [originForm] = Form.useForm(form);
  const protocol = Form.useWatch(["addr", "protocol"], originForm);
  const onFinish = async (values?: Origin) => {
    // Keep certificate metadata in the local list; the API only needs its reference.
    const savedOrigin = { ...values, cert: originForm.getFieldValue("cert") } as Origin;
    if (values?.id) {
      try {
        await request(`/api/origin/${values.id}`, {
          method: "PUT",
          data: values,
        });
        if (onSuccess) onSuccess(savedOrigin);
      } catch (error) {
        if (onError) onError(error);
      }
    } else {
      try {
        const data = await request<CreateOriginResponse>("/api/origin", {
          method: "POST",
          data: values,
        });
        const origin = { ...savedOrigin, id: data.originId } as Origin;
        if (onSuccess) onSuccess(origin);
      } catch (error) {
        if (onError) onError(error);
      }
    }
  };

  return (
    <Form
      form={originForm}
      name="originSettingsForm"
      onFinish={onFinish}
      onFinishFailed={onError}
      layout={screens.sm ? "horizontal" : "vertical"}
      labelCol={screens.sm ? { flex: "156px" } : undefined}
      wrapperCol={screens.sm ? { flex: "1 1 0" } : undefined}
      labelWrap
      {...props}
    >
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>
      <Form.Item
        label="源站地址"
        name="addr"
        required
        extra="填写源站 IP 或域名，无需包含 http:// 或 https://。"
        rules={[
          {
            validator: (_, addr?: NetworkAddress) => {
              if (!addr?.host?.trim()) return Promise.reject(new Error("请输入源站 IP 或域名"));
              if (/\s|:\/\/|[/?#]/.test(addr.host)) return Promise.reject(new Error("源站地址不能包含协议、路径或空格"));
              const port = Number(addr.portRange);
              if (!Number.isInteger(port) || port < 1 || port > 65535) return Promise.reject(new Error("请输入 1 到 65535 之间的端口"));
              return Promise.resolve();
            },
          },
        ]}
      >
        <AddrInput />
      </Form.Item>
      <Form.Item label="回源主机名" name="requestHost" help="可选。设置请求源站时的 Host，支持请求变量；访问域名与源站域名不一致时，请填写源站域名。">
        <Input placeholder="example.com" maxLength={100} />
      </Form.Item>

      {/* 高级选项 */}
      <Collapse
        size="small"
        bordered={false}
        items={[
          {
            key: "more",
            label: "更多选项...",
            forceRender: true,
            children: (
              <>
                <Form.Item
                  label="HTTPS 客户端证书"
                  name="certRef"
                  hidden={protocol !== "https"}
                  help="连接源站使用的客户端证书；除非源站要求双向认证，否则无需选择。"
                >
                  <OriginCertInput />
                </Form.Item>
                <Form.Item
                  label="专属域名"
                  name="domains"
                  help="默认不需要填写，表示支持所有域名。如果填写了专属域名，表示这些源站只会在所列的专属域名被访问时才生效。"
                >
                  <MultiLineArrayTextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder={"example.com\nwww.example.com"} />
                </Form.Item>
                <Form.Item
                  label="端口跟随"
                  name="followPort"
                  valuePropName="checked"
                  help="选中后表示源站的端口保持和用户访问的服务端口保持一致；此时的源站地址中的端口号可以任意填写。"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="支持 HTTP/2"
                  name="http2Enabled"
                  hidden={protocol !== "https"}
                  valuePropName="checked"
                  help="选中后表示 HTTPS 源站支持 HTTP/2。"
                >
                  <Switch />
                </Form.Item>
                <Form.Item label="权重" name="weight" help="数字越大，代表分配的请求比例越多。">
                  <InputNumber min={0} max={9999} precision={0} placeholder="10" />
                </Form.Item>
                <Form.Item label="名称" name="name" help="给当前源站起一个容易识别的名称。">
                  <Input maxLength={100} />
                </Form.Item>
                <OriginConnectionFields />
                <Form.Item label="备注" name="description">
                  <Input.TextArea rows={3} maxLength={100} showCount />
                </Form.Item>
                <Form.Item label="启用当前源站" name="isOn" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </Form>
  );
}

export default OriginSettingsForm;
