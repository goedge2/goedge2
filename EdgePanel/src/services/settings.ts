import { request } from "@umijs/max";

import type { DBTable } from "../pb/models/model_db_table_pb";
import type { FindEnabledAPINodeResponse } from "../pb/service_api_node_pb";
import type { FindAllDBTablesResponse } from "../pb/service_db_pb";
import type {
  ReadSysSettingResponse,
  ReadAccessLogStorageResponse,
  SearchAccessLogStorageInput,
  ClickHouseAccessLogStorageInput,
} from "../pb/service_sys_setting_pb";
import type { CheckSystemUpdateResponse, ReadSystemUpdateResponse, SystemUpdateConfig } from "../pb/service_system_update_pb";

export type DatabaseCleanupTable = Omit<DBTable, "rows" | "dataLength" | "indexLength"> & {
  rows: number;
  dataLength: number;
  indexLength: number;
};

export type DatabaseCleanupData = {
  dbTables: DatabaseCleanupTable[];
  databaseConfig: ReadSysSettingResponse;
};

export type SystemUpdateConfigInput = Pick<SystemUpdateConfig, "autoCheck" | "ignoredVersion">;

export async function readAdminUIConfig() {
  return request("/api/sys/settings/adminUIConfig");
}

export async function readUserUIConfig() {
  return request("/api/sys/settings/userUIConfig");
}

export async function readAdminSecurityConfig() {
  return request("/api/sys/settings/adminSecurityConfig");
}

export async function listApiNodes() {
  return request("/api/api-nodes");
}

export async function findApiNode(apiNodeId: number, signal?: AbortSignal) {
  return request<FindEnabledAPINodeResponse>(`/api/api-nodes/${apiNodeId}`, {
    params: { includeConfig: true },
    signal,
  });
}

export async function listAccessLogDBNodes() {
  return request("/api/db-nodes", {
    params: { offset: 0, size: 1000 },
  });
}

export type AccessLogEngine = "mysql" | "bleve" | "elasticsearch" | "opensearch" | "clickhouse";
export type SearchLogStorageInput = Omit<SearchAccessLogStorageInput, "$typeName" | "$unknown">;
export type AccessLogStorageInput = {
  engine: AccessLogEngine;
  bleveDirectory?: string;
  elasticsearch?: SearchLogStorageInput;
  opensearch?: SearchLogStorageInput;
  clickhouse?: Omit<ClickHouseAccessLogStorageInput, "$typeName" | "$unknown">;
};

export async function readAccessLogStorage() {
  return request<ReadAccessLogStorageResponse>("/api/settings/access-log-storage");
}

export async function saveAccessLogStorage(data: AccessLogStorageInput, test = false) {
  return request(`/api/settings/access-log-storage${test ? "/test" : ""}`, {
    method: test ? "POST" : "PUT",
    data,
  });
}

export async function readDatabaseCleanupData() {
  const [tablesRes, configRes] = await Promise.all([
    request<FindAllDBTablesResponse>("/api/db/tables"),
    request<ReadSysSettingResponse>("/api/sys/settings/databaseConfig"),
  ]);

  return {
    dbTables: tablesRes.dbTables.map((table) => ({
      ...table,
      rows: Number(table.rows),
      dataLength: Number(table.dataLength),
      indexLength: Number(table.indexLength),
    })),
    databaseConfig: configRes,
  } satisfies DatabaseCleanupData;
}

export async function readSystemUpdate() {
  return request<ReadSystemUpdateResponse>("/api/system/updates", { skipErrorHandler: true });
}

export async function updateSystemUpdateConfig(config: SystemUpdateConfigInput) {
  return request("/api/system/updates/config", {
    method: "PUT",
    data: { config },
  });
}

export async function checkSystemUpdate() {
  return request<CheckSystemUpdateResponse>("/api/system/updates/check", { method: "POST" });
}

export async function installSystemUpdate(version: string) {
  return request("/api/system/updates/install", {
    method: "POST",
    data: { version },
  });
}
