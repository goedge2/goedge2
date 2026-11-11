import test from "node:test";
import assert from "node:assert/strict";

import {
  appendListenPortTokens,
  getSuggestedListenPortRanges,
  normalizeListenPortToken,
} from "../src/components/multiListenPortInputState.ts";

test("normalizeListenPortToken accepts valid single ports", () => {
  assert.deepStrictEqual(normalizeListenPortToken("80"), {
    ok: true,
    normalized: "80",
    dedupeKey: "port:80",
  });

  assert.deepStrictEqual(normalizeListenPortToken("65535"), {
    ok: true,
    normalized: "65535",
    dedupeKey: "port:65535",
  });
});

test("normalizeListenPortToken normalizes valid ranges", () => {
  assert.deepStrictEqual(normalizeListenPortToken("8080-8090"), {
    ok: true,
    normalized: "8080-8090",
    dedupeKey: "range:8080-8090",
  });

  assert.deepStrictEqual(normalizeListenPortToken("08080:08090"), {
    ok: true,
    normalized: "8080-8090",
    dedupeKey: "range:8080-8090",
  });
});

test("normalizeListenPortToken rejects invalid ports and ranges", () => {
  assert.deepStrictEqual(normalizeListenPortToken("0"), {
    ok: false,
    error: "端口必须在 1~65535 范围内",
  });

  assert.deepStrictEqual(normalizeListenPortToken("65536"), {
    ok: false,
    error: "端口必须在 1~65535 范围内",
  });

  assert.deepStrictEqual(normalizeListenPortToken("80.5"), {
    ok: false,
    error: "请输入有效的端口或端口范围",
  });

  assert.deepStrictEqual(normalizeListenPortToken("9000-8000"), {
    ok: false,
    error: "范围起始端口不能大于结束端口",
  });

  assert.deepStrictEqual(normalizeListenPortToken("8080-"), {
    ok: false,
    error: "请输入有效的端口或端口范围",
  });
});

test("appendListenPortTokens splits mixed separators and de-duplicates semantic duplicates", () => {
  assert.deepStrictEqual(appendListenPortTokens(["80"], " 080,443\n8080:8090；8080-8090  "), {
    ok: true,
    nextPortRanges: ["80", "443", "8080-8090"],
  });
});

test("appendListenPortTokens keeps current values unchanged when any token is invalid", () => {
  assert.deepStrictEqual(appendListenPortTokens(["80"], "443 abc"), {
    ok: false,
    error: "请输入有效的端口或端口范围",
  });
});

test("getSuggestedListenPortRanges returns protocol-aware default suggestions", () => {
  assert.deepStrictEqual(getSuggestedListenPortRanges("http"), ["80", "8080", "8000", "3000", "4000"]);
  assert.deepStrictEqual(getSuggestedListenPortRanges("https"), ["443", "8443", "9443", "4443", "10443"]);
  assert.deepStrictEqual(getSuggestedListenPortRanges(undefined), ["80", "443", "8080", "8443", "3000", "4000"]);
});

test("getSuggestedListenPortRanges prefers caller-provided suggestions when present", () => {
  assert.deepStrictEqual(getSuggestedListenPortRanges("http", ["080", "8443-8445", "8443:8445", "abc", "65536"]), ["80", "8443-8445"]);
});

test("getSuggestedListenPortRanges preserves an explicit empty suggestion list", () => {
  assert.deepStrictEqual(getSuggestedListenPortRanges("https", []), []);
});
