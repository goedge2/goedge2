import { Collapse, Form, FormInstance, FormProps, Input, Switch } from "antd";
import type { HTTPHeader } from "../../pb/models/model_http_web_pb";
import { MultiTagsInput } from "../MultiListenPortInput";
import { MultiLineArrayTextArea } from "../MultiLineArrayTextArea";

type HttpHeaderFormProps<T> = {
  form?: FormInstance;
  onSuccess?: (response?: T | undefined) => void;
  onError?: (error?: string | unknown | undefined) => void;
};

// Http Header 报头表单
export const HttpHeaderForm = ({ form, onSuccess, onError, ...props }: HttpHeaderFormProps<HTTPHeader> & FormProps) => {
  // const modeType = Form.useWatch('mode', form);

  const onFinish = (values: HTTPHeader) => {
    onSuccess?.(values);
  };

  return (
    <Form form={form} name="httpHeaderForm" onFinish={onFinish} onFinishFailed={onError} labelWrap {...props}>
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>

      <Form.Item required label="名称(Name)" name="name" help="请注意报头名称的大小写，如无特殊需求，报头名称的格式通常为Xxx或者Xxx-Yyy。">
        <Input placeholder="比如 Content-Type" />
      </Form.Item>
      <Form.Item required label="值(Value)" name="value" help="可以包含请求变量。">
        <Input />
      </Form.Item>

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
                <Form.Item label="支持的状态码" name="status" help="不填表示支持所有的状态码。">
                  <MultiTagsInput addTag="添加状态码" splitTags={/[, ]+/} />
                </Form.Item>
                <Form.Item label="支持的请求方法" name="methods" help="格式为大写，比如GET、POST等。">
                  <MultiTagsInput addTag="添加请求方法" splitTags={/[, ]+/} />
                </Form.Item>
                <Form.Item label="支持的域名" name="domains" help="只有这些域名设置报头。">
                  <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
                </Form.Item>
                <Form.Item
                  label="只附加不替换"
                  name="shouldAppend"
                  valuePropName="checked"
                  help="选中后表示如果已经存在同名的报头，则只会附加在原有的报头之后，不会覆盖。"
                >
                  <Switch />
                </Form.Item>
                <Form.Item label="不在跳转时启用" name="disableRedirect" valuePropName="checked" help="选中后表示在30X跳转时不启用当前报头。">
                  <Switch />
                </Form.Item>

                <Form.Item label="启用" name="isOn" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </Form>
  );
};
