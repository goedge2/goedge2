import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const componentPath = resolve(workspaceRoot, "src/components/TableActionIcon.tsx");

const proTableActionFiles = [
  "src/pages/admins/index.tsx",
  "src/pages/clusters/index.tsx",
  "src/pages/clusters/monitor/_shared.tsx",
  "src/pages/clusters/node-grants/_shared.tsx",
  "src/pages/clusters/node-logs.tsx",
  "src/pages/clusters/nodes.tsx",
  "src/pages/clusters/node-regions.tsx",
  "src/pages/clusters/cluster-nodes.tsx",
  "src/pages/clusters/node-logs-detail.tsx",
  "src/components/GlobalTasks.tsx",
  "src/pages/dns/domains.tsx",
  "src/pages/dns/providers.tsx",
  "src/pages/servers/cache-policies/_shared.tsx",
  "src/pages/servers/cache-task/_shared.tsx",
  "src/pages/servers/certs.tsx",
  "src/pages/servers/groups.tsx",
  "src/pages/servers/ip-lists/_shared.tsx",
  "src/pages/servers/metrics/_shared.tsx",
  "src/pages/servers/index.tsx",
  "src/pages/servers/waf-policies.tsx",
];

test("TableActionIcon provides the shared tooltip and link-button shell", () => {
  assert.equal(existsSync(componentPath), true, "shared TableActionIcon component should exist");

  const source = readFileSync(componentPath, "utf8");
  assert.match(source, /Tooltip/);
  assert.match(source, /type=\"link\"/);
  assert.match(source, /tooltip:\s*string/);
  assert.match(source, /icon:\s*ReactNode/);
  assert.match(source, /danger\?:\s*boolean/);
  assert.match(source, /disabled\?:\s*boolean/);
  assert.match(source, /loading\?:\s*boolean/);
  assert.match(source, /onClick\?:/);
  assert.match(source, /forwardRef/);
  assert.match(source, /ref=\{ref\}/);
  assert.match(source, /\.\.\.triggerProps/);
});

for (const relativePath of proTableActionFiles) {
  test(`${relativePath} routes ProTable actions through TableActionIcon`, () => {
    const source = readFileSync(resolve(workspaceRoot, relativePath), "utf8");

    assert.match(source, /title:\s*["']操作["']/);
    assert.match(source, /TableActionIcon/);
  });
}
