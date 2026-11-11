import type { HTTPFirewallPolicy } from "@/pb/models/model_http_firewall_pb";

export const wafCaptchaTypes = [
  { value: "default", label: "验证码", help: "通过输入验证码来验证人机。" },
  { value: "oneClick", label: "点击验证", help: "通过点击界面元素来验证人机。" },
  { value: "slide", label: "滑动解锁", help: "通过滑动方块解锁来验证人机。" },
  { value: "geetest", label: "极验-行为验", help: "使用极验-行为验提供的人机验证方式，需要先启用极验并配置验证ID和Key。" },
];

export const defaultWafPageBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>403 Forbidden</title>
  <style>address { line-height: 1.8; }</style>
</head>
<body>
<h1>403 Forbidden By WAF</h1>
<address>Connection: \${remoteAddr} (Client) -&gt; \${serverAddr} (Server)</address>
<address>Request ID: \${requestId}</address>
</body>
</html>`;

export function validateWafCaptchaTemplate(body?: string) {
  if (!body) return;
  if (!body.includes("${body}")) return "模板中必须包含 ${body} 变量，表示验证码表单。";
  if (/<form(?:\s|>)[\s\S]*?\$\{body\}[\s\S]*?<\/form\s*>/i.test(body)) {
    return "不能使用 <form></form> 包裹 ${body}，否则验证码表单无法提交。";
  }
}

export function buildWafPolicySettingsValues(policy: HTTPFirewallPolicy): HTTPFirewallPolicy {
  return {
    ...policy,
    inbound: policy.inbound
      ? {
          ...policy.inbound,
          publicWhiteLists: { refs: policy.inbound.publicWhiteLists?.refs ?? policy.inbound.publicWhiteListRefs ?? [] },
          publicBlackLists: { refs: policy.inbound.publicBlackLists?.refs ?? policy.inbound.publicBlackListRefs ?? [] },
          publicGreyLists: { refs: policy.inbound.publicGreyLists?.refs ?? policy.inbound.publicGreyListRefs ?? [] },
          publicWhiteListRefs: undefined,
          publicBlackListRefs: undefined,
          publicGreyListRefs: undefined,
        }
      : undefined,
    blockOptions: { statusCode: 403, body: "Blocked By WAF", timeout: 300, failBlockScopeAll: true, ...policy.blockOptions },
    pageOptions: { status: 403, body: defaultWafPageBody, ...policy.pageOptions },
    captchaOptions: {
      life: 600,
      maxFails: 100,
      failBlockTimeout: 3600,
      failBlockScopeAll: true,
      uiShowRequestId: true,
      ...policy.captchaOptions,
      captchaType: policy.captchaOptions?.captchaType || "default",
      countLetters: policy.captchaOptions?.countLetters || 6,
      geeTestConfig: { isOn: false, ...policy.captchaOptions?.geeTestConfig, captchaKey: undefined },
    },
    jsCookieOptions: { life: 600, maxFails: 100, failBlockTimeout: 3600, failBlockScopeAll: true, ...policy.jsCookieOptions },
  } as HTTPFirewallPolicy;
}
