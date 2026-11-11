import { FirewallEventLevels } from "./waf";

// Http Key 名称
export function HttpKeyName(code: string) {
  const k = HttpKeys.find(function (v) {
    return v.code == code;
  });
  if (k) {
    return k.name;
  }
  return code;
}

// Http Key 描述
export function HttpKeyDescription(code: string) {
  const k = HttpKeys.find(function (v) {
    return v.code == code;
  });
  if (k) {
    return k.description;
  }
  return null;
}

// 级别名称
export function FirewallEventLevelName(code: string) {
  const l = FirewallEventLevels.find(function (v) {
    return v.code == code;
  });
  if (l) {
    return l.name;
  }
  return code;
}
// HTTP 部分关键变量，目前主要用于CC统计、统计指标等
export const HttpKeys = [
  {
    name: "客户端地址（IP）",
    code: "${remoteAddr}",
    description: "会依次根据X-Forwarded-For、X-Real-IP、RemoteAddr获取，适用于前端可能有别的反向代理的情形，存在被伪造的可能",
    icon: "",
  },
  {
    name: "直接客户端地址（IP）",
    code: "${rawRemoteAddr}",
    description: "返回直接连接服务的客户端原始IP地址",
    icon: "",
  },
  {
    name: "客户端用户名",
    code: "${remoteUser}",
    description: "通过基本认证填入的用户名",
    icon: "",
  },
  {
    name: "请求URI",
    code: "${requestURI}",
    description: "包含参数，比如/hello?name=lily",
    icon: "",
  },
  {
    name: "请求路径",
    code: "${requestPath}",
    description: "不包含参数，比如/hello",
    icon: "",
  },
  {
    name: "完整URL",
    code: "${requestURL}",
    description: "比如https://example.com/hello?name=lily",
    icon: "",
  },
  {
    name: "请求方法",
    code: "${requestMethod}",
    description: "比如GET、POST等",
    icon: "",
  },
  {
    name: "请求协议Scheme",
    code: "${scheme}",
    description: "http或https",
    icon: "",
  },
  {
    name: "文件扩展名",
    code: "${requestPathExtension}",
    description: "请求路径中的文件扩展名，包括点符号，比如.html、.png",
    icon: "",
  },
  {
    name: "小写文件扩展名",
    code: "${requestPathLowerExtension}",
    description: "请求路径中的文件扩展名小写形式，包括点符号，比如.html、.png",
    icon: "",
  },
  {
    name: "主机名",
    code: "${host}",
    description: "通常是请求的域名",
    icon: "",
  },
  {
    name: "HTTP协议",
    code: "${proto}",
    description: "包含版本的HTTP请求协议，类似于HTTP/1.0",
    icon: "",
  },
  {
    name: "URL参数值",
    code: "${arg.NAME}",
    description: "单个URL参数值",
    icon: "",
  },
  {
    name: "请求来源URL",
    code: "${referer}",
    description: "请求来源Referer URL",
    icon: "",
  },
  {
    name: "请求来源URL域名",
    code: "${referer.host}",
    description: "请求来源Referer URL域名",
    icon: "",
  },
  {
    name: "Header值",
    code: "${header.NAME}",
    description: "单个Header值，比如${header.User-Agent}",
    icon: "",
  },
  {
    name: "Cookie值",
    code: "${cookie.NAME}",
    description: "单个cookie值，比如${cookie.sid}",
    icon: "",
  },
  {
    name: "状态码",
    code: "${status}",
    description: "",
    icon: "",
  },
  {
    name: "响应的Content-Type值",
    code: "${response.contentType}",
    description: "",
    icon: "",
  },
];
