import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tableSource = readFileSync(new URL("../src/components/WafFormInput.tsx", import.meta.url), "utf8");
const columns = tableSource.slice(tableSource.indexOf("const ruleSetColumns"), tableSource.indexOf("const setsRowRender"));
const formSource = readFileSync(new URL("../src/components/form/FirewallRuleForm.tsx", import.meta.url), "utf8");
const ruleSetForm = formSource.slice(formSource.indexOf("export const FirewallRuleSetForm"), formSource.indexOf("type SortableFirewallTagProps"));

function ruleSetField(name: string) {
  const nameIndex = ruleSetForm.indexOf(`name="${name}"`);
  assert.notEqual(nameIndex, -1);
  return ruleSetForm.slice(ruleSetForm.lastIndexOf("<Form.Item", nameIndex), ruleSetForm.indexOf(">", nameIndex) + 1);
}

test("expanding an incomplete WAF rule set checks missing, null and empty rules before mapping", () => {
  assert.match(columns, /if \(!rules\?\.length\) return "-";[\s\S]*rules\.map/);
  assert.match(columns, /name\?\.trim\(\) \|\| "未命名规则集"/);
  assert.match(columns, /actions\?\.map\([\s\S]*?\.join\(","\) \|\| "-"/);
});

test("rule-set names reject missing, empty and whitespace-only values", () => {
  const field = ruleSetField("name");
  assert.match(field, /rules=\{\[\{ required: true, whitespace: true, message: "请输入规则集名称" \}\]\}/);
  assert.match(field, /extra="可以用来描述当前规则集用途。"/);
  assert.doesNotMatch(field, /help=/);
});

for (const name of ["rules", "actions"]) {
  test(`rule-set ${name} require a nonempty array rather than just a required label`, () => {
    assert.match(ruleSetField(name), /rules=\{\[\{ type: "array", required: true, min: 1,/);
  });
}
