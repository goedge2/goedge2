import { Collapse, Form, InputNumber, Switch } from "antd";
import type { HTTPUAM } from "../pb/models/model_http_web_pb";
import { CompactField } from "./SharedInput";

type UAMFormInputProps = {
  value?: HTTPUAM;
  onChange?: (value?: HTTPUAM) => void;
};

const uamDefaultConfig = {
  isOn: true,
  addToWhiteList: true,
  minQPSPerIP: 0,
  keyLife: 0,
} as HTTPUAM;

// 5秒盾表单
function UAMFormInput({ value, onChange }: UAMFormInputProps) {
  const [form] = Form.useForm();

  const isUAMEnabled = Form.useWatch("isOn", form);
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
      if (value == null) {
        form.setFieldsValue(uamDefaultConfig);
        if (onChange) {
          onChange(uamDefaultConfig);
        }
      }
    }
  };

  return (
    <Form.Provider onFormChange={onFormChange}>
      <Form form={form} name="uamForm" initialValues={value} labelCol={{ span: 4 }} component={false}>
        <Form.Item label="启用5秒盾" name="isOn" valuePropName="checked" help="启用后，访问网站时，自动检查浏览器环境，阻止非正常访问。">
          <Switch onChange={isOnChanged} />
        </Form.Item>
        <Form.Item hidden={!isUAMEnabled} label={null}>
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
                      label="加入IP白名单"
                      name="addToWhiteList"
                      valuePropName="checked"
                      help="选中后，表示验证通过后，将访问者IP加入到临时白名单中，此IP下次访问时不再校验5秒盾；此白名单只对5秒盾有效，不影响其他规则。此选项主要用于可能无法正常使用Cookie的网站。"
                      labelCol={{ span: 3 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="验证有效期"
                      name="keyLife"
                      help="单个客户端验证通过后，在这个有效期内不再重复验证；如果为0则表示系统默认。"
                      labelCol={{ span: 3 }}
                    >
                      <CompactField addonAfter="秒">
                        <InputNumber />
                      </CompactField>
                    </Form.Item>
                    <Form.Item
                      label="单IP最低QPS"
                      name="minQPSPerIP"
                      help="当某个IP在1分钟内平均QPS达到此值时，才会触发5秒盾；如果设置为0，表示任何访问都会触发。"
                      labelCol={{ span: 3 }}
                    >
                      <CompactField addonAfter="请求数/秒">
                        <InputNumber />
                      </CompactField>
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form.Item>
      </Form>
    </Form.Provider>
  );
}

export default UAMFormInput;
