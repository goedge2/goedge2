import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workspaceRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(workspaceRoot, "src/app.tsx"), "utf8");

test("default React Query options retain recent page data", () => {
  const queryOptionsStart = appSource.indexOf("queryClient: {");
  const queryOptionsEnd = appSource.indexOf("\n      },", queryOptionsStart);
  const queryOptions = appSource.slice(queryOptionsStart, queryOptionsEnd);

  assert.notEqual(queryOptionsStart, -1);
  assert.notEqual(queryOptionsEnd, -1);
  assert.doesNotMatch(appSource, /clientConfig:/);
  assert.match(queryOptions, /staleTime:\s*60_000/);
  assert.match(queryOptions, /gcTime:\s*30 \* 60_000/);
  assert.match(queryOptions, /refetchOnWindowFocus:\s*false/);
});
