import type { HTTPRequestCond, HTTPRequestCondGroup } from "@/pb/models/model_config_shared_pb";
import { RuleOperators } from "@/utils/waf";

const operatorAliases: Record<string, string> = {
  match: "regexp",
  "not match": "not regexp",
  "eq string": "eq",
  "neq string": "not",
  eq: "eq float",
};
const supportedOperators = new Set([
  "regexp",
  "not regexp",
  "wildcard match",
  "wildcard not match",
  "eq",
  "not",
  "eq float",
  "prefix",
  "suffix",
  "contains",
  "not contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "eq ip",
  "version range",
  "ip range",
]);

export const requestConditionOperators = [
  ...RuleOperators.flatMap((operator) => {
    const code = operatorAliases[operator.code] ?? operator.code;
    return supportedOperators.has(code) ? [{ label: operator.name, value: code, description: operator.description }] : [];
  }),
  ...[
    ["eq int", "整数等于"],
    ["in", "在列表中"],
    ["not in", "不在列表中"],
    ["file ext", "文件扩展名"],
    ["mime type", "内容MimeType"],
    ["mod 10", "整数取模10"],
    ["mod 100", "整数取模100"],
    ["mod", "整数取模"],
    ["gt ip", "IP大于"],
    ["gte ip", "IP大于等于"],
    ["lt ip", "IP小于"],
    ["lte ip", "IP小于等于"],
    ["ip mod 10", "IP取模10"],
    ["ip mod 100", "IP取模100"],
    ["ip mod", "IP取模"],
  ].map(([value, label]) => ({
    label,
    value,
    description: ["in", "not in", "file ext", "mime type"].includes(value) ? '对比值填写JSON字符串列表，例如 [".jpg", ".png"]。' : "",
  })),
];

export function createRequestCondition(type = "url-extension"): HTTPRequestCond {
  const config = {
    type,
    isRequest: true,
    param: "${requestPath}",
    operator: "eq",
    value: "",
    isReverse: false,
    isCaseInsensitive: true,
  } as HTTPRequestCond;
  switch (type) {
    case "url-extension":
    case "url-not-extension":
      return { ...config, param: "${requestPathLowerExtension}", operator: type === "url-extension" ? "in" : "not in", value: "[]" };
    case "url-eq-index":
      return { ...config, value: "/" };
    case "url-all":
      return { ...config, operator: "prefix", value: "/" };
    case "url-prefix":
    case "url-not-prefix":
      return { ...config, operator: "prefix", isReverse: type === "url-not-prefix" };
    case "url-not-eq":
      return { ...config, operator: "not" };
    case "url-regexp":
    case "url-not-regexp":
      return { ...config, operator: type === "url-regexp" ? "regexp" : "not regexp" };
    case "url-wildcard-match":
      return { ...config, operator: "wildcard match" };
    case "user-agent-regexp":
    case "user-agent-not-regexp":
      return { ...config, param: "${userAgent}", operator: type === "user-agent-regexp" ? "regexp" : "not regexp" };
    case "mime-type":
      return { ...config, isRequest: false, param: "${response.contentType}", operator: "mime type", value: "[]" };
    default:
      return config;
  }
}

export function createRequestConditionGroup(): HTTPRequestCondGroup {
  return { isOn: true, connector: "and", conds: [], isReverse: false, description: "" } as unknown as HTTPRequestCondGroup;
}
