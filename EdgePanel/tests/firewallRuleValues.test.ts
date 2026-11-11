import assert from "node:assert/strict";
import test from "node:test";
import type { HTTPFirewallAction, HTTPFirewallRuleGroup, HTTPFirewallRuleSet } from "../src/pb/models/model_http_firewall_pb";
import {
  buildFirewallRuleGroupDraft,
  getFirewallActionDefaultOptions,
  getFirewallActionSummary,
  parseFirewallRuleParam,
  reorderFirewallGroups,
} from "../src/components/form/firewallRuleValues.ts";

test("new WAF groups use unique negative draft IDs until the parent configuration is saved", () => {
  const values = { name: "draft", isOn: false } as HTTPFirewallRuleGroup;
  const first = buildFirewallRuleGroupDraft(values);
  const second = buildFirewallRuleGroupDraft(values);
  assert.ok(Number(first.id) < 0);
  assert.ok(Number(second.id) < 0);
  assert.notEqual(first.id, second.id);
  assert.equal(values.id, undefined);
  assert.equal(first.isOn, false);
  assert.equal(first.sets, undefined);
  assert.deepEqual(buildFirewallRuleGroupDraft({ ...first, name: "edited" }), { ...first, name: "edited" });
});

test("existing WAF group IDs and nested configuration survive draft edits", () => {
  const values = { id: "14", name: "existing", sets: [{ id: "15" }] } as HTTPFirewallRuleGroup;
  assert.deepEqual(buildFirewallRuleGroupDraft(values), values);
});

test("WAF group sorting handles negative draft IDs without mutating the input", () => {
  const groups = [{ id: "14", sets: [] }, { id: "-1", sets: [] }, { id: "-2", sets: [] }] as HTTPFirewallRuleGroup[];
  assert.deepEqual(reorderFirewallGroups(groups, "-1", "14").map((group) => group.id), ["-1", "14", "-2"]);
  assert.deepEqual(groups.map((group) => group.id), ["14", "-1", "-2"]);
  assert.equal(reorderFirewallGroups(groups, "-1", "missing"), groups);
});

test("WAF rule-set sorting handles negative parent and child IDs and ignores other groups", () => {
  const sets = [{ id: "15" }, { id: "-1" }, { id: "-2" }] as HTTPFirewallRuleSet[];
  const groups = [{ id: "-1", sets }, { id: "14", sets: [{ id: "16" }] }] as HTTPFirewallRuleGroup[];
  const reordered = reorderFirewallGroups(groups, "-1--2", "-1-15");
  assert.deepEqual(reordered[0].sets.map((set) => set.id), ["-2", "15", "-1"]);
  assert.deepEqual(sets.map((set) => set.id), ["15", "-1", "-2"]);
  assert.equal(reordered[1], groups[1]);
  assert.equal(reorderFirewallGroups(groups, "-1--1", "14-16"), groups);
  assert.equal(reorderFirewallGroups(groups, "missing", "-1--1"), groups);
});

test("rule parameters restore plain, named and nested JSON parameters", () => {
  assert.deepEqual(parseFirewallRuleParam("${requestPath}"), { paramPrefix: "requestPath", paramSuffix: "" });
  assert.deepEqual(parseFirewallRuleParam("${header.User-Agent}"), { paramPrefix: "header", paramSuffix: "User-Agent" });
  assert.deepEqual(parseFirewallRuleParam("${requestJSON.user.name}"), { paramPrefix: "requestJSON", paramSuffix: "user.name" });
  assert.deepEqual(parseFirewallRuleParam(), { paramPrefix: "", paramSuffix: "" });
});

test("new action defaults are isolated from other drafts", () => {
  const options = getFirewallActionDefaultOptions("page");
  options.body = "custom body";
  assert.deepEqual(getFirewallActionDefaultOptions("page"), { status: 403, body: "" });
  assert.deepEqual(getFirewallActionDefaultOptions("block"), { blockScope: "global", timeout: 1800 });
  assert.deepEqual(getFirewallActionDefaultOptions("redirect"), { status: 307 });
  assert.deepEqual(getFirewallActionDefaultOptions("tag"), {});
});

test("action labels expose the configuration that distinguishes duplicate action types", () => {
  const summary = (code: string, options: HTTPFirewallAction["options"]) => getFirewallActionSummary({ code, options } as HTTPFirewallAction);
  assert.equal(summary("page", { status: 451, body: "private body" }), "HTTP 451");
  assert.equal(summary("block", { timeout: 60, timeoutMax: 120 }), "封禁 60-120 秒");
  assert.equal(summary("block", { timeout: 0 }), "");
  assert.equal(summary("redirect", { status: 302, url: "https://example.com" }), "302 · https://example.com");
  assert.equal(summary("tag", { tags: ["bot", "suspicious"] }), "bot, suspicious");
  assert.equal(summary("captcha", { life: 600, maxFails: 3 }), "有效期 600 秒 · 最多失败 3 次");
  assert.equal(summary("js_cookie", { life: 0, maxFails: 3 }), "最多失败 3 次");
  assert.equal(summary("log", undefined), "");
});
