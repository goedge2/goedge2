import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workspaceRoot = resolve(import.meta.dirname, "..");
const shellQueriesSource = readFileSync(resolve(workspaceRoot, "src/runtime/shellQueries.ts"), "utf8");
const adminUIConfigSource = readFileSync(resolve(workspaceRoot, "src/pages/settings/admin-ui.tsx"), "utf8");

test("shell UI config remains fresh after layout initializes it", () => {
  const queryStart = shellQueriesSource.indexOf("export function useShellUIConfigQuery()");
  const queryEnd = shellQueriesSource.indexOf("export function useAdminProfileQuery()", queryStart);
  const querySource = shellQueriesSource.slice(queryStart, queryEnd);

  assert.notEqual(queryStart, -1);
  assert.notEqual(queryEnd, -1);
  assert.match(querySource, /staleTime:\s*Number\.POSITIVE_INFINITY/);
});

test("saving the admin UI config invalidates the shell UI config", () => {
  assert.match(adminUIConfigSource, /const queryClient = useQueryClient\(\);/);
  assert.match(
    adminUIConfigSource,
    /await request\([\s\S]*?method: "PUT",[\s\S]*?\}\);[\s\S]*?await queryClient\.invalidateQueries\(\{ queryKey: shellQueryKeys\.uiConfig\(\) \}\);/,
  );
});
