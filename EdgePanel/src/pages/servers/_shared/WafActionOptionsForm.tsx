import { Button, Collapse, Form, Input, InputNumber, Select, Switch, type FormInstance } from "antd";
import { defaultWafPageBody, validateWafCaptchaTemplate, wafCaptchaTypes } from "./wafPolicySettings";

const { TextArea } = Input;
const globalBlockHelp = "选中后，允许系统尝试全局封禁某个IP，以提升封禁性能。";
const integerRules = [{ type: "integer" as const, min: 0, max: 2147483647, message: "请输入0到2147483647之间的整数" }];
const statusRules = [{ type: "integer" as const, min: 100, max: 999, message: "请输入100到999之间的HTTP状态码" }];

function ChallengeOptions({ name, defaultLife, form }: { name: "captchaOptions" | "jsCookieOptions"; defaultLife: number; form: FormInstance }) {
  const maxFails = Form.useWatch([name, "maxFails"], form);
  const isJSCookie = name === "jsCookieOptions";
  return (
    <>
      <Form.Item
        label="有效时间(秒)"
        name={[name, "life"]}
        normalize={(value) => value ?? 0}
        rules={integerRules}
        extra={`验证通过后在这个时间内不再验证；为空或0时使用默认值${defaultLife}秒。`}
      >
        <InputNumber min={0} max={2147483647} precision={0} placeholder={`默认${defaultLife}`} />
      </Form.Item>
      <Form.Item
        label="最多失败次数"
        name={[name, "maxFails"]}
        normalize={(value) => value ?? 0}
        rules={integerRules}
        extra={
          <>
            {maxFails > 0 && maxFails < 5 ? (
              <span style={{ color: "var(--ant-color-warning)" }}>建议填入不小于5的数字，以减少误判几率。 </span>
            ) : null}
            {isJSCookie
              ? "允许用户失败尝试的最多次数，超过后自动加入黑名单；为空或0使用默认10次，1到4按5次处理。"
              : "允许用户失败尝试的最多次数，超过后自动加入黑名单；为空或0表示不限制。"}
          </>
        }
      >
        <InputNumber min={0} max={2147483647} precision={0} placeholder={isJSCookie ? "0使用默认10次" : "0表示不限制"} />
      </Form.Item>
      <Form.Item
        label="失败拦截时间(秒)"
        name={[name, "failBlockTimeout"]}
        normalize={(value) => value ?? 0}
        rules={integerRules}
        extra={
          isJSCookie ? "达到最多失败次数时自动拦截的时长；为空或0使用默认1800秒。" : "达到最多失败次数（大于0）时自动拦截的时长；为0表示不自动拦截。"
        }
      >
        <InputNumber min={0} max={2147483647} precision={0} placeholder={isJSCookie ? "0使用默认1800秒" : "0表示不自动拦截"} />
      </Form.Item>
      <Form.Item label="失败全局封禁" name={[name, "failBlockScopeAll"]} valuePropName="checked" extra={globalBlockHelp}>
        <Switch />
      </Form.Item>
    </>
  );
}

export default function WafActionOptionsForm({ form }: { form: FormInstance }) {
  const captchaType = Form.useWatch(["captchaOptions", "captchaType"], form) || "default";
  const customUI = Form.useWatch(["captchaOptions", "uiIsOn"], form);
  const geeTestIsOn = Form.useWatch(["captchaOptions", "geeTestConfig", "isOn"], form);
  const hasCaptchaKey = Form.useWatch(["captchaOptions", "geeTestConfig", "hasCaptchaKey"], { form, preserve: true });
  const showCustomUI = captchaType === "default" && customUI;

  return (
    <Collapse
      ghost
      items={[
        {
          key: "block",
          label: "阻止动作 (Block)",
          forceRender: true,
          children: (
            <>
              <Form.Item
                label="HTTP状态码"
                name={["blockOptions", "statusCode"]}
                rules={statusRules}
                extra="触发阻止动作时返回的HTTP状态码，默认403。"
              >
                <InputNumber min={100} max={999} precision={0} placeholder="403" />
              </Form.Item>
              <Form.Item label="提示内容" name={["blockOptions", "body"]} extra="阻止请求时返回的内容，支持HTML。">
                <TextArea rows={4} placeholder="Blocked By WAF" />
              </Form.Item>
              <Form.Item
                label="提示内容URL/路径"
                name={["blockOptions", "url"]}
                extra="填写HTTP(S)地址时由节点获取网页内容返回给客户端，也可填写节点本地文件路径；不是浏览器跳转。留空使用提示内容。"
              >
                <Input placeholder="https://..." />
              </Form.Item>
              <Form.Item
                label="封禁时长(秒)"
                name={["blockOptions", "timeout"]}
                normalize={(value) => value ?? 0}
                rules={integerRules}
                extra="触发阻止动作时封禁客户端IP的时间；为空或0使用默认300秒。"
              >
                <InputNumber min={0} max={2147483647} precision={0} />
              </Form.Item>
              <Form.Item
                label="最大封禁时长(秒)"
                name={["blockOptions", "timeoutMax"]}
                normalize={(value) => value ?? 0}
                rules={integerRules}
                extra="大于封禁时长时，每次在这两个时长之间随机选取最终封禁时长；0表示不启用随机时长。"
              >
                <InputNumber min={0} max={2147483647} precision={0} />
              </Form.Item>
              <Form.Item label="失败全局封禁" name={["blockOptions", "failBlockScopeAll"]} valuePropName="checked" extra={globalBlockHelp}>
                <Switch />
              </Form.Item>
            </>
          ),
        },
        {
          key: "page",
          label: "显示页面 (Page)",
          forceRender: true,
          children: (
            <>
              <Form.Item label="HTTP状态码" name={["pageOptions", "status"]} rules={statusRules} extra="显示页面动作返回的HTTP状态码，默认403。">
                <InputNumber min={100} max={999} precision={0} placeholder="403" />
              </Form.Item>
              <Form.Item
                label="网页内容"
                name={["pageOptions", "body"]}
                extra="支持HTML和请求变量，例如 ${remoteAddr}、${serverAddr} 和 ${requestId}。"
              >
                <TextArea rows={8} spellCheck={false} />
              </Form.Item>
              <Form.Item label=" " colon={false}>
                <Button onClick={() => form.setFieldValue(["pageOptions", "body"], defaultWafPageBody)}>使用模板</Button>
              </Form.Item>
            </>
          ),
        },
        {
          key: "captcha",
          label: "人机识别 (Captcha)",
          forceRender: true,
          children: (
            <>
              <Form.Item
                label="默认验证方式"
                name={["captchaOptions", "captchaType"]}
                dependencies={[["captchaOptions", "geeTestConfig", "isOn"]]}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (value === "geetest" && !geeTestIsOn) throw new Error("请先开启允许用户使用极验，并配置验证ID和Key");
                    },
                  },
                ]}
                extra={wafCaptchaTypes.find((item) => item.value === captchaType)?.help}
              >
                <Select options={wafCaptchaTypes} />
              </Form.Item>
              <ChallengeOptions name="captchaOptions" defaultLife={600} form={form} />
              <Form.Item
                label="验证码中数字个数"
                name={["captchaOptions", "countLetters"]}
                hidden={captchaType !== "default"}
                extra="验证码中的数字数量，默认6个，最多10个。"
              >
                <Select options={Array.from({ length: 10 }, (_, index) => ({ label: `${index + 1}个`, value: index + 1 }))} />
              </Form.Item>
              <Form.Item
                label="定制UI"
                name={["captchaOptions", "uiIsOn"]}
                valuePropName="checked"
                hidden={captchaType !== "default"}
                extra="开启后自定义数字验证码页面；未填写的内容使用系统默认值。"
              >
                <Switch />
              </Form.Item>
              <Form.Item label="页面标题" name={["captchaOptions", "uiTitle"]} hidden={!showCustomUI} extra="验证码页面的标题。">
                <Input placeholder="使用默认标题" />
              </Form.Item>
              <Form.Item label="按钮标题" name={["captchaOptions", "uiButtonTitle"]} hidden={!showCustomUI} extra="例如：提交验证。">
                <Input placeholder="提交验证" />
              </Form.Item>
              <Form.Item
                label="显示请求ID"
                name={["captchaOptions", "uiShowRequestId"]}
                valuePropName="checked"
                hidden={!showCustomUI}
                extra="在界面上显示请求ID，方便用户报告问题。"
              >
                <Switch />
              </Form.Item>
              <Form.Item label="CSS样式" name={["captchaOptions", "uiCss"]} hidden={!showCustomUI} extra="填写CSS规则，不需要包含 <style> 标签。">
                <TextArea rows={4} spellCheck={false} />
              </Form.Item>
              <Form.Item label="页头提示" name={["captchaOptions", "uiPrompt"]} hidden={!showCustomUI} extra="例如：请输入上面的验证码。支持HTML。">
                <TextArea rows={3} spellCheck={false} />
              </Form.Item>
              <Form.Item label="页尾提示" name={["captchaOptions", "uiFooter"]} hidden={!showCustomUI} extra="显示在页面底部的提示，支持HTML。">
                <TextArea rows={3} spellCheck={false} />
              </Form.Item>
              <Form.Item
                label="页面模板"
                name={["captchaOptions", "uiBody"]}
                messageVariables={{ body: "${body}" }}
                hidden={!showCustomUI}
                dependencies={[
                  ["captchaOptions", "uiIsOn"],
                  ["captchaOptions", "captchaType"],
                ]}
                rules={[
                  {
                    validator: async (_, value) => {
                      const error = showCustomUI ? validateWafCaptchaTemplate(value) : undefined;
                      if (error) throw new Error(error);
                    },
                  },
                ]}
                extra="整个页面的HTML模板，必须包含 ${body} 代表验证码表单；不能使用 <form></form> 包裹此变量。留空使用默认模板。"
              >
                <TextArea rows={6} spellCheck={false} placeholder="<main>${body}</main>" />
              </Form.Item>
              <Form.Item
                label="允许用户使用极验"
                name={["captchaOptions", "geeTestConfig", "isOn"]}
                valuePropName="checked"
                extra="开启后，允许用户在WAF设置中选择极验。请在极验控制台的业务管理中获取验证ID和Key。"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="极验-验证ID"
                name={["captchaOptions", "geeTestConfig", "captchaId"]}
                hidden={!geeTestIsOn}
                rules={[{ required: geeTestIsOn, whitespace: true, message: "请输入极验验证ID" }]}
                extra="在极验控制台的业务管理中获取。"
              >
                <Input maxLength={100} spellCheck={false} autoComplete="off" />
              </Form.Item>
              <Form.Item
                label="极验-验证Key"
                name={["captchaOptions", "geeTestConfig", "captchaKey"]}
                hidden={!geeTestIsOn}
                rules={[{ required: geeTestIsOn && !hasCaptchaKey, whitespace: true, message: "请输入极验验证Key" }]}
                extra={
                  hasCaptchaKey
                    ? "已配置Key；留空保留原Key，填写新值后替换。接口不会返回已保存的Key。"
                    : "在极验控制台的业务管理中获取；保存后不回显。"
                }
              >
                <Input.Password maxLength={100} autoComplete="new-password" placeholder={hasCaptchaKey ? "已配置，留空不修改" : "输入验证Key"} />
              </Form.Item>
            </>
          ),
        },
        {
          key: "jscookie",
          label: "JS Cookie验证",
          forceRender: true,
          children: <ChallengeOptions name="jsCookieOptions" defaultLife={3600} form={form} />,
        },
      ]}
    />
  );
}
