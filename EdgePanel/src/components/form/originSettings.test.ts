import assert from "node:assert/strict";
import test from "node:test";
import type { Origin } from "../../pb/models/model_origin_pb";
import type { Server } from "../../pb/models/model_server_pb";
import { buildOriginSettingsValues, buildOriginValues } from "./originSettings.ts";

test("new origins initialize complete editable defaults", () => {
  const origin = buildOriginValues();
  assert.equal(origin.isOn, true);
  assert.equal(origin.weight, 10);
  assert.deepEqual(origin.addr, { protocol: "http", host: "", portRange: "80" });
  for (const duration of [origin.connTimeout, origin.readTimeout, origin.idleTimeout]) {
    assert.deepEqual(duration, { count: "0", unit: "second" });
  }
});

test("editing origins preserves explicit zero, false, certificate and duration units", () => {
  const origin = {
    isOn: false, weight: 0, maxConns: 0, maxIdleConns: 0,
    requestHost: "origin.example.com", domains: [],
    certRef: { isOn: true, certId: "42" },
    readTimeout: { count: "3", unit: "minute" },
  } as unknown as Origin;
  const result = buildOriginValues(origin);
  for (const key of Object.keys(origin) as (keyof Origin)[]) {
    assert.deepEqual(result[key], origin[key]);
  }
  assert.notEqual(result, origin);
});

test("reverse proxy defaults preserve disabled protocol, version and zero settings", () => {
  const server = { reverseProxy: { proxyProtocol: { isOn: false, version: 2 }, maxConns: 0, connTimeout: { count: "0", unit: "ms" } } } as Server;
  const result = buildOriginSettingsValues(server);
  assert.deepEqual(result.reverseProxy?.proxyProtocol, { isOn: false, version: 2 });
  assert.deepEqual(result.reverseProxy?.connTimeout, server.reverseProxy?.connTimeout);
  assert.deepEqual(result.reverseProxy?.readTimeout, { count: "0", unit: "second" });
  assert.equal(result.reverseProxy?.maxConns, 0);
  assert.equal(buildOriginSettingsValues({ type: "httpWeb" } as Server).reverseProxy, undefined);
});
