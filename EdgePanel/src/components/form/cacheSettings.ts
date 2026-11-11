import type { HTTPCacheRef } from "../../pb/models/model_http_cache_policy_pb";
import type { Server } from "../../pb/models/model_server_pb";

export function buildCacheSettingsValues(server: Server): Server {
  if (!server.web?.cache) return server;
  return {
    ...server,
    web: {
      ...server.web,
      cache: { ...server.web.cache, enableCacheControl: server.web.cache.enableCacheControl ?? true },
    },
  };
}

export function cacheRefWithoutTemporaryId(value: HTTPCacheRef & { id?: number }): HTTPCacheRef {
  const result = { ...value };
  delete result.id;
  return result;
}
