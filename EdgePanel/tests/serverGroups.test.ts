import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("website searches forward the group filter to the API", () => {
  const services = source("services/servers.ts");
  assert.match(services, /const serverGroupId = searchParams\.get\("serverGroupId"\) \|\| "0"/);
  assert.match(services, /params: \{[^}]*serverGroupId,/s);
});

test("group count links use the same URL field as search and reset", () => {
  assert.match(source("pages/servers/groups.tsx"), /to=\{`\/servers\?serverGroupId=\$\{group\.id\}`\}/);
  const list = source("pages/servers/index.tsx");
  assert.match(list, /dataIndex: "serverGroupId"/);
  assert.match(list, /newParams\.set\("serverGroupId", values\.serverGroupId\)/);
  assert.match(list, /newParams\.delete\("serverGroupId"\)/);
  assert.match(list, /<ServerGroupSelector includeUngrouped/);
});

test("website settings read and send the optional server groups wrapper", () => {
  const settings = source("pages/servers/settings.tsx");
  assert.match(settings, /serverGroupIds: data\.server\.serverGroups\?\.groups\.map\(\(group\) => String\(group\.id\)\)/);
  assert.match(settings, /onFinish = async \(\{ serverGroupIds, \.\.\.server \}/);
  assert.match(settings, /server: \{\s*\.\.\.payload,\s*serverGroups: \{ groups: \(serverGroupIds \?\? \[\]\)\.map\(\(id\) => \(\{ id \}\)\) \},/);
  assert.doesNotMatch(settings, /serverGroupIds: \{ ids:/);
  assert.equal((settings.match(/<ServerGroupSelector mode="multiple"/g) ?? []).length, 2);
  assert.match(settings, /invalidateQueries\(\{ queryKey: serverQueryKeys\.groupsBase\(\) \}\)/);
});
