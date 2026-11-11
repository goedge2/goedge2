import { Form, Input, Select, Switch } from "antd";
import type { HTTPRemoteAddr } from "../pb/models/model_http_web_pb";
import { CustomFormItemProps } from "../utils";

const remoteAddrDefaultConfig = {
  isOn: true,
  type: "default",
  value: "${rawRemoteAddr}",
} as HTTPRemoteAddr;

const defaultRemoteAddrValue = "${rawRemoteAddr}";

// 获取IP方式
const typeOptions = [
  { label: "直接获取", value: "default" },
  { label: "从上线代理中获取", value: "proxy" },
  { label: "从请求报头中读取", value: "requestHeader" },
  { label: "[自定义变量]", value: "variable" },
];

// 访客IP地址
export const RemoteAddrFormInput = ({ value, onChange }: CustomFormItemProps<HTTPRemoteAddr>) => {
  const [form] = Form.useForm();

  const isRemoteAddrEnabled = Form.useWatch("isOn", form);
  const remoteAddrType = Form.useWatch("type", form);

  const onFormChange = (_: string, { changedFields }: { changedFields: { name: (string | number)[] }[] }) => {
    if (value != null) {
      // 仅在初始化完成后通知更新，初始数据由下面的 isOnChanged 负责通知
      if (onChange) {
        const values = form.getFieldsValue() as HTTPRemoteAddr;
        const changedFieldNames = changedFields.map((field) => field.name[0]);
        if (changedFieldNames.includes("type") || (values.type === "requestHeader" && changedFieldNames.includes("requestHeaderName"))) {
          switch (values.type) {
            case "default":
            case "variable":
              values.value = defaultRemoteAddrValue;
              break;
            case "proxy":
              values.value = "${remoteAddr}";
              break;
            case "requestHeader": {
              const requestHeaderName = values.requestHeaderName.trim();
              values.value = requestHeaderName.length > 0 ? `\${header.${requestHeaderName}}` : "";
              break;
            }
          }
          form.setFieldValue("value", values.value);
        }
        onChange(values);
      }
    }
  };

  const isOnChanged = (checked: boolean) => {
    if (checked) {
      if (value == null) {
        form.setFieldsValue(remoteAddrDefaultConfig);
        if (onChange) {
          onChange(remoteAddrDefaultConfig);
        }
      }
    }
  };

  return (
    <Form.Provider onFormChange={onFormChange}>
      <Form form={form} name="remoteAddrForm" initialValues={value} labelCol={{ span: 4 }} component={false}>
        <Form.Item label="启用访客IP设置" name="isOn" valuePropName="checked" help="选中后，表示使用自定义的请求变量获取客户端IP。">
          <Switch onChange={isOnChanged} />
        </Form.Item>
        <Form.Item
          required
          label="获取IP方式"
          name="type"
          help={
            <>
              {remoteAddrType == "default" && '用户直接访问边缘节点，即 "用户 --> 边缘节点" 模式，这时候系统会试图从直接的连接中读取到客户端IP地址。'}
              {remoteAddrType == "proxy" &&
                '用户和边缘节点之间有别的代理服务转发，即 "用户 --> [第三方代理服务] --> 边缘节点"，这时候只能从上级代理中获取传递的IP地址；上级代理传递的请求报头中必须包含 X-Forwarded-For 或 X-Real-IP 信息。'}
              {remoteAddrType == "requestHeader" && "从自定义请求报头读取客户端IP。"}
              {remoteAddrType == "variable" && "通过自定义变量来获取客户端真实的IP地址。"}
            </>
          }
          hidden={!isRemoteAddrEnabled}
        >
          <Select options={typeOptions} style={{ width: 150 }} />
        </Form.Item>
        <Form.Item
          label="请求报头"
          name="requestHeaderName"
          help="请输入包含有客户端IP的请求报头，需要注意大小写，常见的有X-Forwarded-For、X-Real-IP、X-Client-IP等。"
          hidden={!isRemoteAddrEnabled || remoteAddrType !== "requestHeader"}
        >
          <Input placeholder="X-Real-IP" />
        </Form.Item>
        <Form.Item
          label="读取IP变量值"
          name="value"
          help="通过此变量获取用户的IP地址。具体可用的请求变量列表可参考官方网站文档；比如通过报头传递IP的情形，可以使用${header.你的自定义报头}（类似于${header.X-Forwarded-For}，需要注意大小写规范）。"
          hidden={!isRemoteAddrEnabled || remoteAddrType !== "variable"}
        >
          <Input placeholder="${rawRemoteAddr}" />
        </Form.Item>
      </Form>
    </Form.Provider>
  );
};
