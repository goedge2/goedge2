import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/WafFormInput.tsx", import.meta.url), "utf8");
const groupColumns = source.slice(source.indexOf("const groupColumns"), source.indexOf("const ruleSetColumns"));
const groupTable = source.slice(source.indexOf("<Table<HTTPFirewallRuleGroup>"), source.indexOf("{/* 规则分组弹出窗口 */}"));

test("WAF group table keeps expanded content out of column width calculation", () => {
  assert.match(groupTable, /tableLayout="fixed"/);
  assert.match(groupTable, /scroll=\{\{ x: 800 \}\}/);
  assert.match(groupTable, /expandable=\{\{\s+columnWidth: 48,/);
});

test("WAF group utility columns have stable widths while the name column fills available space", () => {
  assert.match(groupColumns, /key: "sort",[^\n]*width: 80/);
  assert.match(groupColumns, /key: "sets",\s+width: 100,/);
  assert.match(groupColumns, /key: "action",\s+width: 320,/);
  assert.doesNotMatch(groupColumns, /dataIndex: "name",\s+width:/);
});
