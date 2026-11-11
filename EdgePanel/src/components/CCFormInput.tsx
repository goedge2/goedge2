import { Collapse, Form, InputNumber, Switch } from "antd";
import type { HTTPCC } from "../pb/models/model_http_web_pb";
import { CompactField } from "./SharedInput";

type CCFormInputProps = {
  value?: HTTPCC;
  onChange?: (value?: HTTPCC) => void;
};

const ccDefaultConfig = {
  isOn: true,
  useDefaultThresholds: true,
  ignoreCommonFiles: true,
  ignoreCommonAgents: true,
  enableGET302: true,
  minQPSPerIP: 0,
  enableFingerprint: true,
} as HTTPCC;

// 无感CC表单
function CCFormInput({ value, onChange }: CCFormInputProps) {
  const [form] = Form.useForm();

  const isCCEnabled = Form.useWatch("isOn", form);
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
        form.setFieldsValue(ccDefaultConfig);
        if (onChange) {
          onChange(ccDefaultConfig);
        }
      }
    }
  };

  return (
    <Form.Provider onFormChange={onFormChange}>
      <Form form={form} name="CCForm" initialValues={value} labelCol={{ span: 4 }} component={false}>
        <Form.Item label="启用无感CC防护" name="isOn" valuePropName="checked" help="启用后，自动检测并拦截CC攻击。">
          <Switch onChange={isOnChanged} />
        </Form.Item>
        <Form.Item hidden={!isCCEnabled} label={null}>
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
                      label="忽略常见文件"
                      name={["ignoreCommonFiles"]}
                      valuePropName="checked"
                      help="忽略js、css、jpg等常在网页里被引用的文件名，即对这些文件的访问不加入计数，可以减少误判几率。"
                      labelCol={{ span: 3 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="检查请求来源指纹"
                      name={["enableFingerprint"]}
                      valuePropName="checked"
                      help="在接收到HTTPS请求时尝试检查请求来源的指纹，用来检测代理服务和爬虫攻击；如果你在网站前面放置了别的反向代理服务，请取消此选项。"
                      labelCol={{ span: 3 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="启用GET302校验"
                      name={["enableGET302"]}
                      valuePropName="checked"
                      help="选中后，表示自动通过GET302方法来校验客户端。"
                      labelCol={{ span: 3 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      label="单IP最低QPS"
                      name={["minQPSPerIP"]}
                      help="当某个IP在1分钟内平均QPS达到此值时，才会开始检测；如果设置为0，表示任何访问都会检测。（注意这里设置的是检测开启阈值，不是拦截阈值，拦截阈值在当前表单下方可以设置）"
                      labelCol={{ span: 3 }}
                    >
                      <CompactField addonAfter="请求数/秒">
                        <InputNumber />
                      </CompactField>
                    </Form.Item>
                    {/* <Form.Item label="使用自定义拦截阈值"
                  name={['useDefaultThresholds']}
                  valuePropName="checked"
                  getValueProps={(value) => ({ checked: !value })}
                  getValueFromEvent={(checked) => !checked}
                  help="一般无需修改，此为专业选项，请在专家指导下进行修改。"
                  labelCol={{ span: 3 }}
                >
                  <Switch />
                </Form.Item> */}
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

export default CCFormInput;
