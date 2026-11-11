import type { Origin } from "../../pb/models/model_origin_pb";
import type { Server } from "../../pb/models/model_server_pb";
import type { TimeDuration } from "../../pb/models/model_config_shared_pb";

function durationDefaults(value?: TimeDuration): TimeDuration {
  return { count: "0", unit: "second", ...value } as TimeDuration;
}

export function buildOriginValues(origin?: Origin): Origin {
  return {
    isOn: true,
    weight: 10,
    domains: [],
    followPort: false,
    http2Enabled: false,
    maxConns: 0,
    maxIdleConns: 0,
    ...origin,
    addr: { protocol: "http", host: "", portRange: "80", ...origin?.addr },
    connTimeout: durationDefaults(origin?.connTimeout),
    readTimeout: durationDefaults(origin?.readTimeout),
    idleTimeout: durationDefaults(origin?.idleTimeout),
  } as Origin;
}

export function buildOriginSettingsValues(server: Server): Server {
  if (!server.reverseProxy) return server;
  const proxy = server.reverseProxy;
  return {
    ...server,
    reverseProxy: {
      scheduling: { code: "random" },
      ...proxy,
      connTimeout: durationDefaults(proxy.connTimeout),
      readTimeout: durationDefaults(proxy.readTimeout),
      idleTimeout: durationDefaults(proxy.idleTimeout),
      proxyProtocol: { isOn: false, version: 1, ...proxy.proxyProtocol },
    },
  } as Server;
}
