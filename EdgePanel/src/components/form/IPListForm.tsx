import { Form, Input, Select, Switch } from "antd";
import type { FormInstance } from "antd/es/form";
import type { CreateIPListRequest, UpdateIPListRequest } from "../../pb/service_ip_list_pb";

export interface IPListFormProps {
  form: FormInstance<Record<string, unknown>>;
  initialValues?: Partial<CreateIPListRequest | UpdateIPListRequest> & { type?: string };
  isEdit?: boolean;
}

export default function IPListForm({ form, initialValues, isEdit = false }: IPListFormProps) {
  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Form.Item label="名称" name="name" rules={[{ required: true, message: "请输入名单名称" }]}>
        <Input placeholder="名单名称" maxLength={50} />
      </Form.Item>

      <Form.Item label="代号" name="code" help="可选参数，只能是英文字母、数字、中划线、下划线的组合。">
        <Input placeholder="名单代号" maxLength={50} />
      </Form.Item>

      <Form.Item
        label="类型"
        name="type"
        rules={[{ required: true, message: "请选择类型" }]}
        help={
          form.getFieldValue("type") === "black"
            ? "黑名单中的IP将会被禁止访问。"
            : form.getFieldValue("type") === "white"
              ? "白名单中的IP将会自动放行，优先级高于黑名单。"
              : ""
        }
      >
        <Select disabled={isEdit}>
          <Select.Option value="black">黑名单</Select.Option>
          <Select.Option value="white">白名单</Select.Option>
        </Select>
      </Form.Item>

      {!isEdit && (
        <Form.Item
          label="全局有效"
          name="isGlobal"
          valuePropName="checked"
          help="选中后，所有网站都自动使用此名单，不需要再次绑定；否则只有在WAF策略中绑定此名单后才会生效。"
        >
          <Switch />
        </Form.Item>
      )}

      <Form.Item label="描述" name="description">
        <Input.TextArea placeholder="描述信息" rows={3} maxLength={100} />
      </Form.Item>
    </Form>
  );
}
