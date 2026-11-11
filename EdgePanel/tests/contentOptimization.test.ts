import assert from "node:assert/strict";
import test from "node:test";
import type { Server } from "../src/pb/models/model_server_pb";
import {
  buildContentOptimizationValues,
  createCompressionDefaults,
  createHLSDefaults,
  createPageOptimizationDefaults,
  createWebPDefaults,
} from "../src/pages/servers/_shared/contentOptimization.ts";

test("new content optimization groups use legacy defaults without enabling features", () => {
  const original = { type: "httpProxy", web: { id: "1" } } as unknown as Server;
  const result = buildContentOptimizationValues(original);
  assert.deepEqual(result.web?.compression, createCompressionDefaults());
  assert.deepEqual(result.web?.optimization, createPageOptimizationDefaults());
  assert.deepEqual(result.web?.webp, createWebPDefaults());
  assert.deepEqual(result.web?.hls, createHLSDefaults());
  assert.equal(result.web?.optimization?.html?.keepQuotes, true);
  assert.equal(result.web?.optimization?.css?.keepCSS2, true);
  assert.equal(original.web?.optimization, undefined);
});

test("empty compression matchers receive defaults while explicit settings and the original snapshot are preserved", () => {
  const original = {
    type: "httpProxy",
    web: {
      compression: { ...createCompressionDefaults(), isOn: false, level: 9, useDefaultTypes: false, extensions: [], mimeTypes: [], types: ["gzip"] },
      optimization: {
        ...createPageOptimizationDefaults(),
        html: { ...createPageOptimizationDefaults().html, keepQuotes: false, onlyURLPatterns: [{ type: "regexp", pattern: "images" }] },
      },
      webp: { ...createWebPDefaults(), extensions: [], minLength: { count: "0", unit: "mb" }, conds: { isOn: false, connector: "and", groups: [] } },
      hls: createHLSDefaults(),
    },
  } as unknown as Server;
  const snapshot = structuredClone(original);
  const defaults = createCompressionDefaults();
  const expected = {
    ...original,
    web: {
      ...original.web,
      compression: {
        ...original.web!.compression,
        extensions: defaults.extensions,
        mimeTypes: defaults.mimeTypes,
      },
    },
  };
  const result = buildContentOptimizationValues(original);
  assert.deepEqual(result, expected);
  assert.deepEqual(original, snapshot);
  result.web!.compression!.isOn = true;
  assert.equal(original.web!.compression!.isOn, false);
  result.web!.compression!.isOn = false;
  assert.equal(result.web!.compression!.level, 9);
  assert.equal(result.web!.compression!.useDefaultTypes, false);
  assert.deepEqual(result.web!.compression!.types, ["gzip"]);
  assert.deepEqual(result.web!.compression!.extensions, defaults.extensions);
  assert.deepEqual(result.web!.compression!.mimeTypes, defaults.mimeTypes);
  result.web!.optimization!.html!.keepQuotes = true;
  assert.deepEqual(original, snapshot);
  assert.deepEqual(buildContentOptimizationValues(original), expected);
});

test("initialization fills missing optimization sections and HLS encryption without replacing existing sections", () => {
  const result = buildContentOptimizationValues({
    type: "httpProxy",
    web: { optimization: { html: { isOn: false, keepQuotes: false } }, hls: {} },
  } as unknown as Server);
  assert.equal(result.web!.optimization!.html!.keepQuotes, false);
  assert.equal(result.web!.optimization!.css!.keepCSS2, true);
  assert.equal(result.web!.hls!.encrypting!.isOn, false);
  const tcp = { type: "tcpProxy" } as Server;
  assert.deepEqual(buildContentOptimizationValues(tcp), tcp);
});
