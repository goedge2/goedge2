import { Collapse, Form, FormInstance, FormProps, Input, InputNumber, Select, Switch } from "antd";
import type { HTTPHostRedirect } from "../../pb/models/model_http_web_pb";
import { MultiLineArrayTextArea } from "../MultiLineArrayTextArea";
import { MultiTagsInput } from "../MultiListenPortInput";

type HostRedirectFormProps<T> = {
  form?: FormInstance;
  onSuccess?: (response?: T | undefined) => void;
  onError?: (error?: string | unknown | undefined) => void;
};

// 跳转类型
const redirectTypeOptions = [
  { label: "URL跳转", value: "url" },
  { label: "域名跳转", value: "domain" },
  { label: "端口跳转", value: "port" },
];

// 跳转状态码
const statusOptions = [
  { value: 0, label: "默认" },
  { value: 301, label: "301 Moved Permanently" },
  { value: 308, label: "308 Permanent Redirect" },
  { value: 302, label: "302 Found" },
  { value: 303, label: "303 See Other" },
  { value: 307, label: "307 Temporary Redirect" },
];

// URL匹配模式
const urlModeOptions = [
  { label: "精准匹配", value: "equal" },
  { label: "前缀匹配", value: "matchPrefix" },
  { label: "正则匹配", value: "matchRegexp" },
];

// 跳转后协议
const afterSchemeOptions = [
  { label: "保持", value: "" },
  { label: "https", value: "HTTPS" },
  { label: "http", value: "HTTP" },
];

// URL跳转
export const HostRedirectForm = ({ form, onSuccess, onError, ...props }: HostRedirectFormProps<HTTPHostRedirect> & FormProps) => {
  const redirectType = Form.useWatch("type", form);
  const domainsAll = Form.useWatch("domainsAll", form);
  const portsAll = Form.useWatch("portsAll", form);
  const urlMode = Form.useWatch("mode", form);

  const onFinish = (values: HTTPHostRedirect) => {
    if (redirectType === "url") {
      switch (urlMode) {
        case "matchPrefix":
          values.matchPrefix = true;
          values.matchRegexp = false;
          break;
        case "matchRegexp":
          values.matchPrefix = false;
          values.matchRegexp = true;
          break;
        default:
          values.matchPrefix = false;
          values.matchRegexp = false;
      }
    }
    onSuccess?.(values);
  };

  return (
    <Form form={form} name="hostRedirectForm" onFinish={onFinish} onFinishFailed={onError} labelWrap {...props}>
      <Form.Item hidden name="id">
        <Input />
      </Form.Item>{" "}
      {/* 临时ID */}
      <Form.Item required label="跳转类型" name={["type"]}>
        <Select options={redirectTypeOptions} style={{ width: 150 }} />
      </Form.Item>
      {/* URL跳转 */}
      {redirectType === "url" && (
        <>
          <Form.Item
            required
            label="跳转前URL"
            name="beforeURL"
            help="需要填写完整的URL，包括http://或者https://，如果有非默认端口，也需要带上端口号。"
          >
            <Input placeholder="http://example.com" />
          </Form.Item>
          <Form.Item
            required
            label="匹配模式"
            name="mode"
            help={
              <>
                {urlMode == "equal" && "精准匹配跳转前的URL，即只有访问完全一样的URL才会跳转。"}
                {urlMode == "matchPrefix" && "只要访问的URL头部部分包含跳转前URL，即可跳转。"}
                {urlMode == "matchRegexp" &&
                  "可以在跳转前URL中使用正则表达式，然后可以在跳转后URL中使用正则表达式中括号的变量，比如${1}、${2}分别表示第一个和第二个括号内的变量值。"}
              </>
            }
          >
            <Select options={urlModeOptions} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item
            required
            label="跳转后URL"
            name="afterURL"
            help="需要填写完整的URL，包括http://或者https://，如果有非默认端口，也需要带上端口号。"
          >
            <Input placeholder="http://example.com" />
          </Form.Item>

          {urlMode == "matchPrefix" ? (
            <Form.Item label="保留URL路径参数" name="keepRequestURI" valuePropName="checked" help="选中后，则跳转之后，保留跳转之前的URL路径和参数。">
              <Switch />
            </Form.Item>
          ) : (
            <Form.Item
              label="保留请求参数"
              name="keepArgs"
              valuePropName="checked"
              help="选中后，则跳转之后，保留跳转之前的URL上的参数（即问号之后的部分）。"
            >
              <Switch />
            </Form.Item>
          )}
        </>
      )}
      {/* 域名跳转 */}
      {redirectType === "domain" && (
        <>
          <Form.Item
            label="所有域名都跳转"
            name="domainsAll"
            valuePropName="checked"
            help="选中后，表示所有域名都会跳转（只要跳转前后域名不同）；不选中后可以指定域名跳转。"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            required
            label="跳转前域名"
            name="domainsBefore"
            hidden={domainsAll}
            help="支持普通域名（example.com）、泛域名（*.example.com）、域名后缀（以点号开头，如.example.com）和正则表达式（以波浪号开头，如~.*.example.com）；如果域名后有端口，请加上端口号。"
          >
            <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
          </Form.Item>
          <Form.Item required label="跳转后域名" name="domainAfter" help="这里填写的是网址中的域名部分，不需要添加https://部分。">
            <Input placeholder="example.com" />
          </Form.Item>
          <Form.Item
            label="忽略跳转前端口"
            name="domainBeforeIgnorePorts"
            valuePropName="checked"
            help="选中后，表示忽略跳转前域名端口，只要域名匹配时就跳转；如不选中，则表示只有域名和端口同时匹配时才会跳转。"
          >
            <Switch />
          </Form.Item>
          <Form.Item label="跳转后协议" name="domainAfterScheme" help="跳转后的URL的协议。">
            <Select options={afterSchemeOptions} style={{ width: 100 }} />
          </Form.Item>
        </>
      )}
      {/* 端口跳转 */}
      {redirectType === "port" && (
        <>
          <Form.Item
            label="所有端口都跳转"
            name="portsAll"
            valuePropName="checked"
            help="选中后，表示所有端口都会跳转（只要跳转前后端口不同）；不选中后可以指定端口跳转。"
          >
            <Switch />
          </Form.Item>
          <Form.Item required label="指定跳转前端口" name="portsBefore" hidden={portsAll}>
            <MultiTagsInput addTag="添加端口" splitTags={/[, ]+/} />
          </Form.Item>
          <Form.Item required label="跳转后端口" name="portAfter" help="">
            <InputNumber placeholder="example.com" />
          </Form.Item>
          <Form.Item label="跳转后协议" name="portAfterScheme" help="跳转后的URL的协议。">
            <Select options={afterSchemeOptions} style={{ width: 100 }} />
          </Form.Item>
        </>
      )}
      <Form.Item label="跳转状态码" name="status">
        <Select options={statusOptions} style={{ width: 200 }} />
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
                <Form.Item
                  label="例外域名"
                  name="exceptDomains"
                  help={
                    <>
                      这些域名<b>不</b>执行跳转。
                    </>
                  }
                >
                  <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
                </Form.Item>
                <Form.Item label="仅限域名" name="onlyDomains" help="只有这些域名执行跳转。">
                  <MultiLineArrayTextArea placeholder={"example1.com\n*.example2.com\n每行一个域名"} autoSize={{ minRows: 3, maxRows: 5 }} />
                </Form.Item>
                <Form.Item label="启用当前跳转" name="isOn" valuePropName="checked">
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
