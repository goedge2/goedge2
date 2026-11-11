import test from "node:test";
import assert from "node:assert/strict";

import { getServerTabList } from "../src/pages/servers/_shared/serverTabList.ts";

test("getServerTabList hides the unfinished stats tab", () => {
  const tabs = getServerTabList("123");

  assert.equal(tabs.some((tab) => tab.key === "/servers/123/stats"), false);
  assert.deepEqual(
    tabs.map((tab) => tab.key),
    [
      "/servers/123/dashboard",
      "/servers/123/accesslogs",
      "/servers/123/settings",
    ],
  );
});
