import { Form, Input, Switch } from "antd";
import type { HTTPWebSocket } from "../pb/models/model_http_web_pb";
import { CustomFormItemProps } from "../utils";
import { MultiLineArrayTextArea } from "./MultiLineArrayTextArea";

const websocketDefaultConfig = {
  isOn: true,
  allowAllOrigins: true,
  requestSameOrigin: true,
} as HTTPWebSocket;

// WebSocket
export const WebSocketFormInput = ({ value, onChange }: CustomFormItemProps<HTTPWebSocket>) => {
  const [form] = Form.useForm();

  const isWebSocketEnabled = Form.useWatch("isOn", form);
  const isAllowAllOrigins = Form.useWatch("allowAllOrigins", form);
  const isRequestSameOrigin = Form.useWatch("requestSameOrigin", form);

  const onFormChange = () => {
    if (value != null) {
      // 仅在初始化完成后通知更新，初始数据由下面的 isOnChanged 负责通知
      if (onChange) {
        const values = form.getFieldsValue();
        onChange(values);
      }
    }
  };

  const isOnChanged = (checked: boolean) => {
    if (checked) {
      if (value === null || value?.id === null || value?.id === "0") {
        form.setFieldsValue(websocketDefaultConfig);
        if (onChange) {
          onChange(websocketDefaultConfig);
        }
      }
    }
  };

  return (
    <Form.Provider onFormChange={onFormChange}>
      <Form form={form} name="websocketForm" initialValues={value} labelCol={{ span: 4 }} component={false}>
        <Form.Item hidden name="id">
          <Input />
        </Form.Item>
        <Form.Item label="启用Websocket" name="isOn" valuePropName="checked">
          <Switch onChange={isOnChanged} />
        </Form.Item>
        <Form.Item
          label="允许所有来源域（Origin）"
          name="allowAllOrigins"
          valuePropName="checked"
          help="选中表示允许所有的来源域。"
          hidden={!isWebSocketEnabled}
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="允许的来源域列表（Origin）"
          name="allowedOrigins"
          help="只允许在列表中的来源域名访问Websocket服务。"
          hidden={!isWebSocketEnabled || isAllowAllOrigins}
        >
          <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
        </Form.Item>

        <Form.Item
          label="传递请求来源域"
          name="requestSameOrigin"
          valuePropName="checked"
          help="选中后，表示把接收到的请求中的Origin字段传递到源站。"
          hidden={!isWebSocketEnabled}
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="指定传递的来源域"
          name="requestOrigin"
          help="指定向源站传递的Origin字段值。"
          hidden={!isWebSocketEnabled || isRequestSameOrigin}
        >
          <Input />
        </Form.Item>
      </Form>
    </Form.Provider>
  );
};
