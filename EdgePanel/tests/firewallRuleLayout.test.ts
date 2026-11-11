import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/form/FirewallRuleForm.tsx", import.meta.url), "utf8");

for (const name of ["rules", "actions"]) {
  test(`${name} section stacks its label without cascading vertical layout into its editor`, () => {
    const section = source.match(new RegExp(`name="${name}"[^>]*>`))?.[0];

    assert.ok(section);
    assert.match(section, /layout="horizontal"/);
    assert.match(section, /labelCol=\{\{ span: 24 \}\}/);
    assert.match(section, /wrapperCol=\{\{ span: 24 \}\}/);
  });
}

test("edit controls use an icon with an accessible name and tooltip, without visible text", () => {
  const button = source.match(/<Button\s+size="small"\s+type="link"\s+icon=\{<EditOutlined \/>\}\s+onClick=\{onEdit\}[^>]*\/>/)?.[0];

  assert.ok(button);
  assert.match(button, /icon=\{<EditOutlined \/>\}/);
  assert.match(button, /aria-label=\{`修改\$\{label\}`\}/);
  assert.match(button, /title="修改"/);
});
