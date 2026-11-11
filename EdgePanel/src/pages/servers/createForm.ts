import type { CheckboxOptionType } from "antd";
import type { Origin } from "@/pb/models/model_origin_pb";
import type { SSLCert } from "@/pb/models/model_ssl_cert_pb";
import type { NetworkAddress } from "@/pb/models/model_network_address_pb";
import type { CreateServerPayload } from "@/services/servers";

export type ServerCreateType = "httpProxy" | "tcpProxy" | "udpProxy" | "httpWeb";
export type DefaultEnableConfigKey = "enableAccessLog" | "enableWebsocket" | "enableCache" | "enableWaf" | "enableRemoteAddr";

export const SERVER_CREATE_TYPES: Array<{ key: ServerCreateType; label: string; description: string }> = [
  { key: "httpProxy", label: "CDN加速", description: "可以通过CDN边缘节点分发源站内容。" },
  { key: "tcpProxy", label: "TCP负载均衡", description: "通过反向代理访问源站TCP服务。" },
  { key: "udpProxy", label: "UDP负载均衡", description: "通过反向代理访问源站UDP服务。" },
  { key: "httpWeb", label: "HTTP Web服务", description: "从边缘节点上的目录提供静态文件。" },
];

export const DEFAULT_ENABLE_CONFIG_OPTIONS: Array<CheckboxOptionType<DefaultEnableConfigKey>> = [
  { label: "访问日志", value: "enableAccessLog" },
  { label: "WebSocket", value: "enableWebsocket" },
  { label: "缓存", value: "enableCache" },
  { label: "WAF", value: "enableWaf" },
  { label: "从上级代理中读取 IP", value: "enableRemoteAddr" },
];

export const DEFAULT_ENABLED_CONFIG_KEYS: DefaultEnableConfigKey[] = ["enableAccessLog", "enableWebsocket", "enableCache"];

export function createBasicHTTPServerPayloadFromForm(values: { defaultEnableKeys?: DefaultEnableConfigKey[] }) {
  const enabledConfigKeys = new Set(values.defaultEnableKeys ?? []);
  return {
    enableAccessLog: enabledConfigKeys.has("enableAccessLog"),
    enableWebsocket: enabledConfigKeys.has("enableWebsocket"),
    enableCache: enabledConfigKeys.has("enableCache"),
    enableWaf: enabledConfigKeys.has("enableWaf"),
    enableRemoteAddr: enabledConfigKeys.has("enableRemoteAddr"),
  };
}

export type CreateServerFormValues = {
  nodeClusterId?: string;
  name?: string;
  domains?: string[];
  originAddrs?: string[];
  webRoot?: string;
  httpListen?: NetworkAddress[];
  httpsListen?: NetworkAddress[];
  tcpListen?: NetworkAddress[];
  tlsListen?: NetworkAddress[];
  udpListen?: NetworkAddress[];
  httpsCerts?: SSLCert[];
  automaticCert?: boolean;
  tlsCerts?: SSLCert[];
  defaultEnableKeys?: DefaultEnableConfigKey[];
};

export const defaultPorts: Record<ServerCreateType, Partial<CreateServerFormValues>> = {
  httpProxy: {
    automaticCert: true,
    httpListen: [{ protocol: "http", portRange: "80" } as NetworkAddress],
    httpsListen: [{ protocol: "https", portRange: "443" } as NetworkAddress],
    defaultEnableKeys: DEFAULT_ENABLED_CONFIG_KEYS,
  },
  httpWeb: {
    automaticCert: true,
    httpListen: [{ protocol: "http", portRange: "80" } as NetworkAddress],
    httpsListen: [{ protocol: "https", portRange: "443" } as NetworkAddress],
  },
  tcpProxy: {},
  udpProxy: {},
};

const usesDomains = (type: ServerCreateType) => type === "httpProxy" || type === "httpWeb";
export const usesOrigins = (type: ServerCreateType) => type !== "httpWeb";

function protocolConfig(listen: NetworkAddress[] | undefined) {
  if (!listen || listen.length === 0) {
    return undefined;
  }
  return { isOn: true, listen };
}

function originFromInput(value: string, type: ServerCreateType): Origin {
  const allowedProtocols = type === "httpProxy" ? ["http", "https"] : type === "tcpProxy" ? ["tcp", "tls"] : ["udp"];
  const normalized = value.includes("://") ? value : `${allowedProtocols[0]}://${value}`;
  const parsed = new URL(normalized);
  const protocol = parsed.protocol.slice(0, -1);
  if (!allowedProtocols.includes(protocol) || !parsed.hostname) {
    throw new Error(`源站地址协议必须是 ${allowedProtocols.join("、")}`);
  }
  const defaultPort = protocol === "https" || protocol === "tls" ? "443" : protocol === "http" ? "80" : "0";
  if (parsed.port.length === 0 && defaultPort === "0") {
    throw new Error("TCP或UDP源站必须填写端口");
  }
  return {
    isOn: true,
    addr: { protocol, host: parsed.hostname, portRange: parsed.port || defaultPort },
    weight: 10,
  } as Origin;
}

function certRefs(certs: SSLCert[] | undefined) {
  return (certs ?? []).map((cert) => ({ id: String(cert.id), isOn: true }));
}

export function buildCreateServerPayloadFromForm(type: ServerCreateType, values: CreateServerFormValues): CreateServerPayload {
  const payload: Record<string, unknown> = { nodeClusterId: values.nodeClusterId, type, name: values.name };
  if (usesDomains(type)) {
    payload.serverNames = values.domains ?? [];
  }
  if (type === "httpProxy" || type === "httpWeb") {
    payload.automaticCert = Boolean(values.automaticCert);
    payload.http = protocolConfig(values.httpListen);
    payload.https = {
      ...protocolConfig(values.httpsListen),
      sslPolicy: { certs: values.automaticCert ? [] : certRefs(values.httpsCerts), minVersion: "TLS 1.0" },
    };
  } else if (type === "tcpProxy") {
    payload.tcp = protocolConfig(values.tcpListen);
    payload.tls = values.tlsListen?.length
      ? { ...protocolConfig(values.tlsListen), sslPolicy: { certs: certRefs(values.tlsCerts), minVersion: "TLS 1.0" } }
      : undefined;
  } else {
    payload.udp = protocolConfig(values.udpListen);
  }
  if (type === "httpWeb") {
    payload.web = { root: { isOn: true, dir: values.webRoot ?? "", indexes: ["index.html", "index.htm"] } };
  } else if (type === "httpProxy") {
    const enabled = new Set(values.defaultEnableKeys ?? []);
    payload.web = {
      accessLog: enabled.has("enableAccessLog")
        ? { isOn: true, fields: [1, 2, 6, 7], status1: true, status2: true, status3: true, status4: true, status5: true }
        : undefined,
      websocket: enabled.has("enableWebsocket") ? { isOn: true, allowAllOrigins: true, requestSameOrigin: true } : undefined,
      cache: enabled.has("enableCache") ? { isOn: true, addStatusHeader: true, enableCacheControl: true, cacheRefs: [] } : undefined,
      firewallRef: enabled.has("enableWaf") ? { isOn: true, defaultCaptchaType: "default" } : undefined,
      remoteAddr: {
        isOn: true,
        type: enabled.has("enableRemoteAddr") ? "proxy" : "default",
        value: enabled.has("enableRemoteAddr") ? "${remoteAddr}" : "${rawRemoteAddr}",
      },
    };
  }
  if (usesOrigins(type)) {
    payload.reverseProxy = {
      isOn: true,
      scheduling: { code: "random" },
      primaryOrigins: (values.originAddrs ?? []).filter(Boolean).map((origin) => originFromInput(origin, type)),
    };
  }
  return payload as CreateServerPayload;
}

export function validateCreateServerForm(type: ServerCreateType, values: CreateServerFormValues) {
  if (usesDomains(type) && !values.domains?.filter(Boolean).length) {
    throw new Error("请输入至少一个域名");
  }
  if (type === "tcpProxy" && !(values.tcpListen?.length || values.tlsListen?.length)) {
    throw new Error("TCP或TLS端口至少填写一组");
  }
  if (type === "udpProxy" && !values.udpListen?.length) {
    throw new Error("请填写UDP端口");
  }
  if (usesOrigins(type) && !values.originAddrs?.filter(Boolean).length) {
    throw new Error("请至少填写一个源站");
  }
  if (type === "tcpProxy" && values.tlsListen?.length && !values.tlsCerts?.length) {
    throw new Error("监听TLS端口时必须选择证书");
  }
}
