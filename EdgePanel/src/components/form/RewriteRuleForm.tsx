import { Collapse, Form, FormInstance, FormProps, Input, Select, Switch } from "antd";
import type { HTTPRewriteRule } from "../../pb/models/model_http_web_pb";
import { redirectStatusOptions } from "../../utils";

type RewriteRuleFormProps<T> = {
  form?: FormInstance;
  onSuccess?: (response?: T | undefined) => void;
  onError?: (error?: string | unknown | undefined) => void;
};

// 转发方式
const modeOptions = [
  { label: "显式", value: "redirect" },
  { label: "隐式", value: "proxy" },
];

// 重写规则
export const RewriteRuleForm = ({ form, onSuccess, onError, ...props }: RewriteRuleFormProps<HTTPRewriteRule> & FormProps) => {
  const modeType = Form.useWatch("mode", form);

  const onFinish = (values: HTTPRewriteRule) => {
    onSuccess?.(values);
  };

  return (
    <Form form={form} name="rewriteRuleForm" onFinish={onFinish} onFinishFailed={onError} labelWrap {...props}>
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>

      <Form.Item required label="匹配规则" name="pattern" help="需要符合正则表达式规范，">
        <Input placeholder="比如 /post/(.+)" />
      </Form.Item>
      <Form.Item
        required
        label="目标URL"
        name="replace"
        help="URL中可以包含一些内置的变量，并且可以用${1}、${2}等变量形式表示在匹配规则中匹配的第N个括号里的内容，也可以是一个完整的URL，比如：http://example.com/hello。"
      >
        <Input placeholder="比如 /post/${1}.html" />
      </Form.Item>
      <Form.Item required label="转发方式" name="mode" help="隐式表示不在客户端显示重写后的URL；显式表示在客户端跳转URL，将会显示重写后的URL。">
        <Select options={modeOptions} style={{ width: 150 }} />
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
                <Form.Item label="跳转状态码" name="redirectStatus" hidden={modeType !== "redirect"} help="通常使用默认的307即可。">
                  <Select options={redirectStatusOptions} style={{ width: 200 }} />
                </Form.Item>
                <Form.Item
                  label="代理主机名"
                  name="proxyHost"
                  help="如果转发的方式为隐式而且目标URL为不同的域名时需要用到此选项，用于修改被代理服务接收到的域名，默认和客户端请求的主机名一致，通常不必填写，支持请求变量。"
                  hidden={modeType !== "proxy"}
                >
                  <Input placeholder="example.com" />
                </Form.Item>

                <Form.Item
                  label="保留请求参数"
                  name="withQuery"
                  valuePropName="checked"
                  help="选中此选项，将会把用户输入的URL中的参数部分转发到目标URL上。"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="终止往下匹配"
                  name="isBreak"
                  valuePropName="checked"
                  help="如果选中了此选项，一旦匹配成功，不会继续匹配其他的重写规则或路由规则。"
                >
                  <Switch />
                </Form.Item>
                <Form.Item label="启用当前重写规则" name="isOn" valuePropName="checked">
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
