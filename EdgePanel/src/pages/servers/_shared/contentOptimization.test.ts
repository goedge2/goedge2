import assert from "node:assert/strict";
import test from "node:test";
import type { Server } from "@/pb/models/model_server_pb";
import type { HTTPCompression } from "@/pb/models/model_http_web_pb";
import { buildContentOptimizationValues, compressionTypes, createCompressionDefaults, getCompressionTypeOrder } from "./contentOptimization.ts";

function buildServer(compression?: Partial<HTTPCompression>): Server {
  return { type: "httpProxy", web: { compression } } as Server;
}

test("compression defaults fill missing configuration and empty matching lists", () => {
  const defaults = createCompressionDefaults();
  for (const compression of [undefined, {}, { extensions: [], mimeTypes: [] }]) {
    const server = buildServer(compression);
    const original = structuredClone(server);
    assert.deepEqual(buildContentOptimizationValues(server).web?.compression, defaults);
    assert.deepEqual(server, original);
  }
});

test("empty matching lists receive defaults while preserving explicit compression settings", () => {
  const compression = {
    isOn: true,
    level: 0,
    useDefaultTypes: false,
    types: ["gzip"],
    minLength: { count: "0", unit: "kb" },
    exceptExtensions: [".zip"],
    extensions: [],
    mimeTypes: [],
  } as unknown as HTTPCompression;
  const result = buildContentOptimizationValues(buildServer(compression)).web?.compression;
  const defaults = createCompressionDefaults();
  assert.deepEqual(result, { ...defaults, ...compression, extensions: defaults.extensions, mimeTypes: defaults.mimeTypes });
});

test("either matching list preserves the existing compression configuration", () => {
  for (const compression of [
    { extensions: [".custom"], mimeTypes: [] },
    { extensions: [], mimeTypes: ["application/custom"] },
    { extensions: [".custom"] },
    { mimeTypes: ["application/custom"] },
  ]) {
    assert.deepEqual(buildContentOptimizationValues(buildServer(compression)).web?.compression, compression);
  }
});

test("content optimization defaults leave other server types unchanged", () => {
  const server = { type: "tcpProxy", web: { compression: {} } } as Server;
  assert.deepEqual(buildContentOptimizationValues(server), server);
});

test("compression algorithms follow saved priority and include unchecked algorithms", () => {
  assert.deepEqual(getCompressionTypeOrder(createCompressionDefaults().types), compressionTypes);
  assert.deepEqual(getCompressionTypeOrder(["zstd", "gzip"]), ["zstd", "gzip", "brotli", "deflate"]);
  assert.deepEqual(getCompressionTypeOrder([]), compressionTypes);
  assert.deepEqual(getCompressionTypeOrder(), compressionTypes);
  assert.deepEqual(getCompressionTypeOrder(["gzip", "gzip", "unknown"]), ["gzip", "brotli", "zstd", "deflate"]);
});

test("checkbox changes retain positions and dragging preserves unchecked algorithms", () => {
  const order = ["brotli", "zstd", "gzip", "deflate"] as const;
  for (const selected of [["brotli", "gzip", "deflate"], ["zstd", "deflate"], [], [...order]]) {
    const result = getCompressionTypeOrder(selected, [...order]);
    assert.deepEqual(result, order);
    assert.deepEqual(result.filter((type) => selected.includes(type)), selected);
  }
});

test("compression algorithms reconcile externally changed priorities without mutating input", () => {
  const order = [...compressionTypes];
  const selected = ["deflate", "gzip"];
  assert.deepEqual(getCompressionTypeOrder(selected, order), ["deflate", "gzip", "brotli", "zstd"]);
  assert.deepEqual(order, compressionTypes);
  assert.deepEqual(selected, ["deflate", "gzip"]);
});

test("initialization preserves custom algorithm priority and explicit empty selection", () => {
  for (const types of [["zstd", "brotli"], []]) {
    const compression = { ...createCompressionDefaults(), useDefaultTypes: false, types };
    const result = buildContentOptimizationValues(buildServer(compression)).web?.compression;
    assert.deepEqual(result, compression);
    assert.notEqual(result, compression);
  }
});
