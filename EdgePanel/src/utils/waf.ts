// 条件类型名称
export function CondTypeName(condType: string) {
  const c = CondTypes.find(function (v) {
    return v.type == condType;
  });
  if (c) {
    return c.name;
  }
  return condType;
}

// WAF 规则参数名称
export function GetRuleParam(paramPrefix: string) {
  const o = RuleParams.find(function (v) {
    return v.prefix == paramPrefix;
  });
  if (o) {
    return o;
  }
  return null;
}

// WAF 规则操作符名称
export function RuleOperatorName(operator: string) {
  const o = RuleOperators.find(function (v) {
    return v.code == operator;
  });
  if (o) {
    return o.name;
  }
  return operator;
}

// WAF 规则操作符说明
export function RuleOperatorDescription(code: string) {
  const o = RuleOperators.find(function (v) {
    return v.code == code;
  });
  if (o) {
    return o.description;
  }
  return null;
}

// WAF 动作名称
export function ActionTypeName(code: string) {
  const a = ActionTypes.find(function (v) {
    return v.code == code;
  });
  if (a) {
    return `${a.name}(${code.toUpperCase()})`;
  }
  return code;
}

// WAF 动作描述
export function ActionTypeDescription(code: string) {
  const a = ActionTypes.find(function (v) {
    return v.code == code;
  });
  if (a) {
    return a.description;
  }
  return null;
}

export const FirewallEventLevels = [
  {
    name: "调试",
    code: "debug",
    description: "仅作为调试用途",
  },
  {
    name: "信息",
    code: "info",
    description: "一般提示信息",
  },
  {
    name: "通知",
    code: "notice",
    description: "需要通知的事件",
  },
  {
    name: "警告",
    code: "warning",
    description: "需要警告的事件",
  },
  {
    name: "错误",
    code: "error",
    description: "发生系统错误的事件",
  },
  {
    name: "严重",
    code: "critical",
    description: "性质较为严重的事件",
  },
  {
    name: "致命",
    code: "fatal",
    description: "对系统有重大影响的事件",
  },
];
// 所有条件类型
export const CondTypes = [
  {
    type: "url-extension",
    name: "文件扩展名",
    description: "根据URL中的文件路径扩展名进行过滤",
  },
  {
    type: "url-eq-index",
    name: "首页",
    description: '检查URL路径是为"/"',
  },
  {
    type: "url-all",
    name: "全站",
    description: "全站所有URL",
  },
  {
    type: "url-prefix",
    name: "URL目录前缀",
    description: "根据URL中的文件路径前缀进行过滤",
  },
  {
    type: "url-eq",
    name: "URL完整路径",
    description: "检查URL中的文件路径是否一致",
  },
  {
    type: "url-regexp",
    name: "URL正则匹配",
    description: "使用正则表达式检查URL中的文件路径是否一致",
  },
  {
    type: "url-wildcard-match",
    name: "URL通配符",
    description: "使用通配符检查URL中的文件路径是否一致",
  },
  {
    type: "user-agent-regexp",
    name: "User-Agent正则匹配",
    description: "使用正则表达式检查User-Agent中是否含有某些浏览器和系统标识",
  },
  {
    type: "params",
    name: "参数匹配",
    description: "根据参数值进行匹配",
  },
  {
    type: "url-not-extension",
    name: "排除：URL扩展名",
    description: "根据URL中的文件路径扩展名进行过滤",
  },
  {
    type: "url-not-prefix",
    name: "排除：URL前缀",
    description: "根据URL中的文件路径前缀进行过滤",
  },
  {
    type: "url-not-eq",
    name: "排除：URL完整路径",
    description: "检查URL中的文件路径是否一致",
  },
  {
    type: "url-not-regexp",
    name: "排除：URL正则匹配",
    description: "使用正则表达式检查URL中的文件路径是否一致，如果一致，则不匹配",
  },
  {
    type: "user-agent-not-regexp",
    name: "排除：User-Agent正则匹配",
    description: "使用正则表达式检查User-Agent中是否含有某些浏览器和系统标识，如果含有，则不匹配",
  },
  {
    type: "mime-type",
    name: "内容MimeType",
    description: "根据服务器返回的内容的MimeType进行过滤。注意：当用于缓存条件时，此条件需要结合别的请求条件使用。",
  },
];

// WAF 规则参数
export const RuleParams = [
  {
    dataType: "",
    description: "通用报头比如Cache-Control、Accept之类的长度限制，防止缓冲区溢出攻击。",
    hasParams: false,
    isComposed: true,
    name: "通用请求报头长度限制",
    options: null,
    params: null,
    prefix: "requestGeneralHeaderLength",
  },
  {
    dataType: "",
    description: "试图通过分析X-Forwarded-For等报头获取的客户端地址，比如192.168.1.100，存在伪造的可能。",
    hasParams: false,
    isComposed: false,
    name: "客户端地址（IP）",
    options: null,
    params: null,
    prefix: "remoteAddr",
  },
  {
    dataType: "",
    description: "直接连接的客户端地址，比如192.168.1.100。",
    hasParams: false,
    isComposed: false,
    name: "客户端源地址（IP）",
    options: null,
    params: null,
    prefix: "rawRemoteAddr",
  },
  {
    dataType: "",
    description: "直接连接的客户端地址端口。",
    hasParams: false,
    isComposed: false,
    name: "客户端端口",
    options: null,
    params: null,
    prefix: "remotePort",
  },
  {
    dataType: "",
    description: "通过BasicAuth登录的客户端用户名。",
    hasParams: false,
    isComposed: false,
    name: "客户端用户名",
    options: null,
    params: null,
    prefix: "remoteUser",
  },
  {
    dataType: "",
    description: "包含URL参数的请求URI，类似于 /hello/world?lang=go，不包含域名部分。",
    hasParams: false,
    isComposed: false,
    name: "请求URI",
    options: null,
    params: null,
    prefix: "requestURI",
  },
  {
    dataType: "",
    description: "不包含URL参数的请求路径，类似于 /hello/world，不包含域名部分。",
    hasParams: false,
    isComposed: false,
    name: "请求路径",
    options: null,
    params: null,
    prefix: "requestPath",
  },
  {
    dataType: "",
    description: "完整的请求URL，包含协议、域名、请求路径、参数等，类似于 https://example.com/hello?name=lily 。",
    hasParams: false,
    isComposed: false,
    name: "请求完整URL",
    options: null,
    params: null,
    prefix: "requestURL",
  },
  {
    dataType: "",
    description: "请求报头中的Content-Length。",
    hasParams: false,
    isComposed: false,
    name: "请求内容长度",
    options: null,
    params: null,
    prefix: "requestLength",
  },
  {
    dataType: "",
    description: "通常在POST或者PUT等操作时会附带请求体，最大限制32M。",
    hasParams: false,
    isComposed: false,
    name: "请求体内容",
    options: null,
    params: null,
    prefix: "requestBody",
  },
  {
    dataType: "",
    description: "${requestURI}和${requestBody}组合。",
    hasParams: false,
    isComposed: false,
    name: "请求URI和请求体组合",
    options: null,
    params: null,
    prefix: "requestAll",
  },
  {
    dataType: "",
    description: "获取POST或者其他方法发送的表单参数，最大请求体限制32M。",
    hasParams: true,
    isComposed: false,
    name: "请求表单参数",
    options: null,
    params: null,
    prefix: "requestForm",
  },
  {
    dataType: "",
    description: "获取POST上传的文件信息，最大请求体限制32M。",
    hasParams: true,
    isComposed: false,
    name: "上传文件",
    options: null,
    prefix: "requestUpload",
  },
  {
    dataType: "",
    description: "获取POST或者其他方法发送的JSON，最大请求体限制32M，使用点（.）符号表示多级数据。",
    hasParams: true,
    isComposed: false,
    name: "请求JSON参数",
    options: null,
    params: null,
    prefix: "requestJSON",
  },
  {
    dataType: "",
    description: "比如GET、POST。",
    hasParams: false,
    isComposed: false,
    name: "请求方法",
    options: null,
    params: null,
    prefix: "requestMethod",
  },
  {
    dataType: "",
    description: "比如http或https。",
    hasParams: false,
    isComposed: false,
    name: "请求协议",
    options: null,
    params: null,
    prefix: "scheme",
  },
  {
    dataType: "",
    description: "比如HTTP/1.1。",
    hasParams: false,
    isComposed: false,
    name: "HTTP协议版本",
    options: null,
    params: null,
    prefix: "proto",
  },
  {
    dataType: "",
    description: "比如example.com。",
    hasParams: false,
    isComposed: false,
    name: "主机名",
    options: null,
    params: null,
    prefix: "host",
  },
  {
    dataType: "",
    description: "当前网站服务CNAME，比如38b48e4f.example.com。",
    hasParams: false,
    isComposed: false,
    name: "CNAME",
    options: null,
    params: null,
    prefix: "cname",
  },
  {
    dataType: "bool",
    description: "是否为CNAME，值为1（是）或0（否）。",
    hasParams: false,
    isComposed: false,
    name: "是否为CNAME",
    options: null,
    params: null,
    prefix: "isCNAME",
  },
  {
    dataType: "",
    description: "请求报头中的Referer和Origin值。",
    hasParams: false,
    isComposed: false,
    name: "请求来源",
    options: null,
    params: null,
    prefix: "refererOrigin",
  },
  {
    dataType: "",
    description: "请求报头中的Referer值。",
    hasParams: false,
    isComposed: false,
    name: "请求来源Referer",
    options: null,
    params: null,
    prefix: "referer",
  },
  {
    dataType: "",
    description: "比如Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103。",
    hasParams: false,
    isComposed: false,
    name: "客户端信息",
    options: null,
    params: null,
    prefix: "userAgent",
  },
  {
    dataType: "",
    description: "请求报头的Content-Type。",
    hasParams: false,
    isComposed: false,
    name: "内容类型",
    options: null,
    params: null,
    prefix: "contentType",
  },
  {
    dataType: "",
    description: "比如sid=IxZVPFhE&city=beijing&uid=18237。",
    hasParams: false,
    isComposed: false,
    name: "所有cookie组合字符串",
    options: null,
    params: null,
    prefix: "cookies",
  },
  {
    dataType: "",
    description: "单个cookie值。",
    hasParams: true,
    isComposed: false,
    name: "单个cookie值",
    options: null,
    params: null,
    prefix: "cookie",
  },
  {
    dataType: "",
    description: "比如name=lu&age=20。",
    hasParams: false,
    isComposed: false,
    name: "所有URL参数组合",
    options: null,
    params: null,
    prefix: "args",
  },
  {
    dataType: "",
    description: "单个URL参数值。",
    hasParams: true,
    isComposed: false,
    name: "单个URL参数值",
    options: null,
    params: null,
    prefix: "arg",
  },
  {
    dataType: "",
    description: '使用换行符（\\n）隔开的报头内容字符串，每行均为"NAME: VALUE格式"。',
    hasParams: false,
    isComposed: false,
    name: "所有请求报头内容",
    options: null,
    params: null,
    prefix: "headers",
  },
  {
    dataType: "",
    description: "使用换行符（\\n）隔开的报头名称字符串，每行一个名称。",
    hasParams: false,
    isComposed: false,
    name: "所有请求报头名称",
    options: null,
    params: null,
    prefix: "headerNames",
  },
  {
    dataType: "",
    description: "单个报头值。",
    hasParams: true,
    isComposed: false,
    name: "单个请求报头值",
    options: null,
    params: null,
    prefix: "header",
  },
  {
    dataType: "",
    description: "最长的请求报头的长度。",
    hasParams: false,
    isComposed: false,
    name: "请求报头最大长度",
    options: null,
    params: null,
    prefix: "headerMaxLength",
  },
  {
    dataType: "",
    description: "当前客户端所处国家/地区名称。",
    hasParams: false,
    isComposed: false,
    name: "国家/地区名称",
    options: null,
    params: null,
    prefix: "geoCountryName",
  },
  {
    dataType: "",
    description: "当前客户端所处中国省份名称。",
    hasParams: false,
    isComposed: false,
    name: "省份名称",
    options: null,
    params: null,
    prefix: "geoProvinceName",
  },
  {
    dataType: "",
    description: "当前客户端所处中国城市名称。",
    hasParams: false,
    isComposed: false,
    name: "城市名称",
    options: null,
    params: null,
    prefix: "geoCityName",
  },
  {
    dataType: "",
    description: "当前客户端所处ISP名称。",
    hasParams: false,
    isComposed: false,
    name: "ISP名称",
    options: null,
    params: null,
    prefix: "ispName",
  },
  {
    dataType: "",
    description: "对统计对象进行统计。",
    hasParams: false,
    isComposed: true,
    name: "CC统计",
    options: null,
    params: null,
    prefix: "cc2",
  },
  {
    dataType: "",
    description: "对统计对象进行统计。",
    hasParams: false,
    isComposed: true,
    name: "防盗链",
    options: null,
    params: null,
    prefix: "refererBlock",
  },
  // {
  //   "dataType": "",
  //   "description": "统计某段时间段内的请求信息（不推荐再使用，请使用新的CC2统计代替）。",
  //   "hasParams": true,
  //   "isComposed": false,
  //   "name": "CC统计（旧）",
  //   "prefix": "cc"
  // }
];

// WAF 规则操作符
export const RuleOperators = [
  {
    name: "正则匹配",
    code: "match",
    description: "使用正则表达式匹配，在头部使用(?i)表示不区分大小写。",
    caseInsensitive: "yes",
    dataType: "regexp",
  },
  {
    name: "正则不匹配",
    code: "not match",
    description: "使用正则表达式不匹配，在头部使用(?i)表示不区分大小写。",
    caseInsensitive: "yes",
    dataType: "regexp",
  },
  {
    name: "通配符匹配",
    code: "wildcard match",
    description: "判断是否和指定的通配符匹配，可以在对比值中使用星号通配符（*）表示任意字符。",
    caseInsensitive: "yes",
    dataType: "wildcard",
  },
  {
    name: "通配符不匹配",
    code: "wildcard not match",
    description: "判断是否和指定的通配符不匹配，可以在对比值中使用星号通配符（*）表示任意字符。",
    caseInsensitive: "yes",
    dataType: "wildcard",
  },
  {
    name: "字符串等于",
    code: "eq string",
    description: "使用字符串对比等于。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "字符串不等于",
    code: "neq string",
    description: "使用字符串对比不等于。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "包含字符串",
    code: "contains",
    description: "包含某个字符串，比如Hello World包含了World。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "不包含字符串",
    code: "not contains",
    description: "不包含某个字符串，比如Hello字符串中不包含Hi。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "包含任一字符串",
    code: "contains any",
    description: "包含字符串列表中的任意一个，比如/hello/world包含/hello和/hi中的/hello，对比值中每行一个字符串。",
    caseInsensitive: "no",
    dataType: "strings",
  },
  {
    name: "包含所有字符串",
    code: "contains all",
    description: "包含字符串列表中的所有字符串，比如/hello/world必须包含/hello和/world，对比值中每行一个字符串。",
    caseInsensitive: "no",
    dataType: "strings",
  },
  {
    name: "包含前缀",
    code: "prefix",
    description: "包含字符串前缀部分，比如/hello前缀会匹配/hello, /hello/world等。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "包含后缀",
    code: "suffix",
    description: "包含字符串后缀部分，比如/hello后缀会匹配/hello, /hi/hello等。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "包含任一单词",
    code: "contains any word",
    description: "包含某个独立单词，对比值中每行一个单词，比如mozilla firefox里包含了mozilla和firefox两个单词，但是不包含fire和fox这两个单词。",
    caseInsensitive: "no",
    dataType: "strings",
  },
  {
    name: "包含所有单词",
    code: "contains all words",
    description: "包含所有的独立单词，对比值中每行一个单词，比如mozilla firefox里包含了mozilla和firefox两个单词，但是不包含fire和fox这两个单词。",
    caseInsensitive: "no",
    dataType: "strings",
  },
  {
    name: "不包含任一单词",
    code: "not contains any word",
    description: "不包含某个独立单词，对比值中每行一个单词，比如mozilla firefox里包含了mozilla和firefox两个单词，但是不包含fire和fox这两个单词。",
    caseInsensitive: "no",
    dataType: "strings",
  },
  {
    name: "包含SQL注入",
    code: "contains sql injection",
    description: "检测字符串内容是否包含SQL注入。",
    caseInsensitive: "none",
    dataType: "none",
  },
  {
    name: "包含SQL注入-严格模式",
    code: "contains sql injection strictly",
    description: "更加严格地检测字符串内容是否包含SQL注入，相对于非严格模式，有一定的误报几率。",
    caseInsensitive: "none",
    dataType: "none",
  },
  {
    name: "包含XSS注入",
    code: "contains xss",
    description: "检测字符串内容是否包含XSS注入。",
    caseInsensitive: "none",
    dataType: "none",
  },
  {
    name: "包含XSS注入-严格模式",
    code: "contains xss strictly",
    description: "更加严格地检测字符串内容是否包含XSS注入，相对于非严格模式，此时xml、audio、video等标签也会被匹配。",
    caseInsensitive: "none",
    dataType: "none",
  },
  {
    name: "包含二进制数据",
    code: "contains binary",
    description: "包含一组二进制数据。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "不包含二进制数据",
    code: "not contains binary",
    description: "不包含一组二进制数据。",
    caseInsensitive: "no",
    dataType: "string",
  },
  {
    name: "数值大于",
    code: "gt",
    description: "使用数值对比大于，对比值需要是一个数字。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "数值大于等于",
    code: "gte",
    description: "使用数值对比大于等于，对比值需要是一个数字。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "数值小于",
    code: "lt",
    description: "使用数值对比小于，对比值需要是一个数字。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "数值小于等于",
    code: "lte",
    description: "使用数值对比小于等于，对比值需要是一个数字。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "数值等于",
    code: "eq",
    description: "使用数值对比等于，对比值需要是一个数字。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "数值不等于",
    code: "neq",
    description: "使用数值对比不等于，对比值需要是一个数字。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "包含索引",
    code: "has key",
    description: "对于一组数据拥有某个键值或者索引。",
    caseInsensitive: "no",
    dataType: "string|number",
  },
  {
    name: "版本号大于",
    code: "version gt",
    description: "对比版本号大于。",
    caseInsensitive: "none",
    dataType: "version",
  },
  {
    name: "版本号小于",
    code: "version lt",
    description: "对比版本号小于。",
    caseInsensitive: "none",
    dataType: "version",
  },
  {
    name: "版本号范围",
    code: "version range",
    description: "判断版本号在某个范围内，格式为 起始version1,结束version2。",
    caseInsensitive: "none",
    dataType: "versionRange",
  },
  {
    name: "IP等于",
    code: "eq ip",
    description: "将参数转换为IP进行对比，只能对比单个IP。",
    caseInsensitive: "none",
    dataType: "ip",
  },
  {
    name: "在一组IP中",
    code: "in ip list",
    description: "判断参数IP在一组IP内，对比值中每行一个IP。",
    caseInsensitive: "none",
    dataType: "ips",
  },
  {
    name: "IP大于",
    code: "gt ip",
    description: "将参数转换为IP进行对比。",
    caseInsensitive: "none",
    dataType: "ip",
  },
  {
    name: "IP大于等于",
    code: "gte ip",
    description: "将参数转换为IP进行对比。",
    caseInsensitive: "none",
    dataType: "ip",
  },
  {
    name: "IP小于",
    code: "lt ip",
    description: "将参数转换为IP进行对比。",
    caseInsensitive: "none",
    dataType: "ip",
  },
  {
    name: "IP小于等于",
    code: "lte ip",
    description: "将参数转换为IP进行对比。",
    caseInsensitive: "none",
    dataType: "ip",
  },
  {
    name: "IP范围",
    code: "ip range",
    description:
      "IP在某个范围之内，范围格式可以是英文逗号分隔的开始IP,结束IP，比如192.168.1.100,192.168.2.200；或者CIDR格式的ip/bits，比如192.168.2.1/24；或者单个IP。可以填写多行，每行一个IP范围。",
    caseInsensitive: "none",
    dataType: "ips",
  },
  {
    name: "不在IP范围",
    code: "not ip range",
    description:
      "IP不在某个范围之内，范围格式可以是英文逗号分隔的开始IP,结束IP，比如192.168.1.100,192.168.2.200；或者CIDR格式的ip/bits，比如192.168.2.1/24；或者单个IP。可以填写多行，每行一个IP范围。",
    caseInsensitive: "none",
    dataType: "ips",
  },
  {
    name: "IP取模10",
    code: "ip mod 10",
    description: "对IP参数值取模，除数为10，对比值为余数。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "IP取模100",
    code: "ip mod 100",
    description: "对IP参数值取模，除数为100，对比值为余数。",
    caseInsensitive: "none",
    dataType: "number",
  },
  {
    name: "IP取模",
    code: "ip mod",
    description: "对IP参数值取模，对比值格式为：除数,余数，比如10,1。",
    caseInsensitive: "none",
    dataType: "number",
  },
];

// WAF 动作
export const ActionTypes = [
  {
    code: "page",
    description: "显示请求被拦截的网页。",
    name: "显示网页",
  },
  {
    code: "block",
    description:
      "阻止请求并中断当前连接，并自动将当前客户端IP加入到系统黑名单；使用此动作时，请先自行严格测试设置的规则是否正确，避免因错误封禁而导致用户无法正常访问的严重后果！",
    name: "阻止",
  },
  {
    code: "captcha",
    description: "在浏览器使用人机识别机制（比如验证码）来验证客户端。",
    name: "Captcha人机识别",
  },
  {
    code: "js_cookie",
    description: "首次访问网站时通过Javascript设置Cookie来验证请求。",
    name: "JS Cookie验证",
  },
  // {
  //   "code": "record_ip",
  //   "description": "将此IP记录到某个IP名单中。",
  //   "name": "记录IP"
  // },
  {
    code: "redirect",
    description: "跳转到新的URL。",
    name: "跳转",
  },
  {
    code: "allow",
    description: "允许跳过规则集正常通过防火墙。",
    name: "允许通过",
  },
  {
    code: "log",
    description: "允许正常通过并记录到日志。",
    name: "允许并记录日志",
  },
  {
    code: "tag",
    description: "为匹配的请求打上标签。",
    name: "标签",
  },
  {
    code: "notify",
    description: "向集群的消息接收人发送消息通知（商业版）。",
    name: "告警",
  },
  {
    code: "get_302",
    description: "通过302重定向GET请求验证客户端真实性。",
    name: "GET 302",
  },
  {
    code: "post_307",
    description: "通过307重定向POST请求验证客户端真实性。",
    name: "POST 307",
  },
  // {
  //   "code": "go_group",
  //   "description": "",
  //   "name": "跳到下一个规则分组"
  // },
  // {
  //   "code": "go_set",
  //   "description": "",
  //   "name": "跳到下一个规则集"
  // },
];
