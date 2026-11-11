import { DatePicker, Form, Input, Select, Space, Button, Radio } from "antd";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import { useState } from "react";
import { FirewallEventLevels } from "../../utils";
import type { UpdateIPItemRequest } from "../../pb/service_ip_item_pb";

export interface IPItemFormProps {
  form: FormInstance<Record<string, unknown>>;
  initialValues?: Partial<UpdateIPItemRequest> & { value?: string; expiredAt?: number | string };
  isEdit?: boolean;
}

export default function IPItemForm({ form, initialValues, isEdit = false }: IPItemFormProps) {
  const [isBatch, setIsBatch] = useState(false);

  const setExpiration = (amount: number, unit: dayjs.ManipulateType) => {
    const date = dayjs().add(amount, unit);
    form.setFieldsValue({
      expiredAt: date,
    });
  };

  const expirationPresets = [
    { label: "1小时", amount: 1, unit: "hour" },
    { label: "1天", amount: 1, unit: "day" },
    { label: "3天", amount: 3, unit: "day" },
    { label: "1周", amount: 1, unit: "week" },
    { label: "30天", amount: 30, unit: "day" },
    { label: "1年", amount: 1, unit: "year" },
  ];

  const levelOptions = FirewallEventLevels.map((level) => ({
    label: `${level.name} (${level.code})`,
    value: level.code,
  }));

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      {!isEdit && (
        <Form.Item label="输入方式" style={{ marginBottom: 12 }}>
          <Radio.Group
            value={isBatch ? "batch" : "single"}
            onChange={(e) => setIsBatch(e.target.value === "batch")}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="single">单个输入</Radio.Button>
            <Radio.Button value="batch">批量输入</Radio.Button>
          </Radio.Group>
        </Form.Item>
      )}

      <Form.Item
        label="IP地址"
        name="value"
        rules={[{ required: true, message: "请输入IP地址" }]}
        help={
          isBatch
            ? "每行一个IP，支持单个IP、CIDR格式（位数不能小于24）、IP范围（x.x.x.x-x.x.x.x，最多256个）。"
            : "支持单个IP、CIDR格式的一组IP（位数不能小于24）、IP范围（类似于x.x.x.x-x.x.x.x，最多只取256个）等。"
        }
      >
        {isBatch ? <Input.TextArea placeholder="x.x.x.x&#10;x.x.x.x" rows={5} /> : <Input placeholder="x.x.x.x" />}
      </Form.Item>

      <Form.Item label="过期时间" name="expiredAt" help="在加入名单某一段时间后会失效，留空表示永久有效。">
        <DatePicker
          showTime
          style={{ width: "100%" }}
          placeholder="选择过期时间"
          renderExtraFooter={() => (
            <Space size="small" wrap style={{ padding: 8 }}>
              {expirationPresets.map((preset) => (
                <Button key={preset.label} size="small" type="link" onClick={() => setExpiration(preset.amount, preset.unit as dayjs.ManipulateType)}>
                  {preset.label}
                </Button>
              ))}
              <Button size="small" type="link" onClick={() => form.setFieldValue("expiredAt", undefined)}>
                永久
              </Button>
            </Space>
          )}
        />
      </Form.Item>

      <Form.Item label="级别" name="eventLevel" initialValue="critical">
        <Select options={levelOptions} />
      </Form.Item>

      <Form.Item label="备注" name="reason">
        <Input.TextArea placeholder="加入备注" rows={3} />
      </Form.Item>
    </Form>
  );
}
