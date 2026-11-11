import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");

const dragSortPages = [
  "src/pages/servers/groups.tsx",
  "src/pages/clusters/node-regions.tsx",
];

for (const relativePath of dragSortPages) {
  test(`${relativePath} uses TanStack Query invalidation for drag table reloads`, () => {
    const source = readFileSync(resolve(workspaceRoot, relativePath), "utf8");

    assert.match(source, /useQueryClient/);
    assert.match(source, /invalidateQueries/);
    assert.doesNotMatch(source, /useRouteTableLoading/);
    assert.doesNotMatch(source, /usePageQueryController/);
    assert.doesNotMatch(source, /revalidator\.refresh\(\)/);
    assert.doesNotMatch(source, /Date\.now\(\)/);
  });
}
