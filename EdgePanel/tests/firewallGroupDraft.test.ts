import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/form/FirewallRuleForm.tsx", import.meta.url), "utf8");
const groupForm = source.slice(source.indexOf("export function FirewallRuleGroupForm"), source.indexOf("export function FirewallRuleSetCodeForm"));

test("WAF group dialogs only return drafts and never write standalone resources", () => {
  assert.match(groupForm, /onSuccess\?\.\(buildFirewallRuleGroupDraft\(values\)\)/);
  assert.doesNotMatch(groupForm, /request\(|\/api\/waf\/group/);
});
