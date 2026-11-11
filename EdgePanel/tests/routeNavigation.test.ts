import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  areMenuOpenKeysEqual,
  getRouteMenuOpenKey,
  reconcileMenuOpenKeys,
} from "../src/runtime/menuNavigation.ts";

const workspaceRoot = resolve(import.meta.dirname, "..");

test("getRouteMenuOpenKey maps detail and list routes to first-level menu keys", () => {
  assert.equal(getRouteMenuOpenKey("/"), undefined);
  assert.equal(getRouteMenuOpenKey("/servers"), "servers");
  assert.equal(getRouteMenuOpenKey("/servers/123/settings"), "servers");
  assert.equal(getRouteMenuOpenKey("/clusters/nodes/88/dashboard"), "clusters");
  assert.equal(getRouteMenuOpenKey("/dns/providers"), "dns");
  assert.equal(getRouteMenuOpenKey("/settings/ui"), "settings");
});

test("reconcileMenuOpenKeys keeps the current route group open while preserving user-expanded sections", () => {
  assert.deepEqual(reconcileMenuOpenKeys([], [], undefined), []);
  assert.deepEqual(reconcileMenuOpenKeys([], [], "servers"), ["servers"]);
  assert.deepEqual(reconcileMenuOpenKeys(["servers"], ["clusters", "servers"], "servers"), ["servers", "clusters"]);
});

test("reconcileMenuOpenKeys does not let the current route group disappear from open keys", () => {
  assert.deepEqual(reconcileMenuOpenKeys(["servers", "clusters"], ["clusters"], "servers"), ["servers", "clusters"]);
  assert.deepEqual(reconcileMenuOpenKeys(["clusters"], [], "clusters"), ["clusters"]);
});

test("reconcileMenuOpenKeys still allows users to close non-route groups", () => {
  assert.deepEqual(reconcileMenuOpenKeys(["servers", "clusters"], ["servers"], "servers"), ["servers"]);
  assert.deepEqual(reconcileMenuOpenKeys(["servers", "dns"], [], "servers"), ["servers"]);
});

test("reconcileMenuOpenKeys returns the previous array instance for no-op updates", () => {
  const currentOpenKeys = ["servers", "clusters"];

  assert.strictEqual(reconcileMenuOpenKeys(currentOpenKeys, ["clusters", "servers"], "servers"), currentOpenKeys);
  assert.strictEqual(reconcileMenuOpenKeys(currentOpenKeys, ["servers", "clusters"], "servers"), currentOpenKeys);
});

test("areMenuOpenKeysEqual compares normalized key sets by value", () => {
  assert.equal(areMenuOpenKeysEqual([], []), true);
  assert.equal(areMenuOpenKeysEqual(["servers", "clusters"], ["servers", "clusters"]), true);
  assert.equal(areMenuOpenKeysEqual(["servers", "clusters"], ["clusters", "servers"]), false);
  assert.equal(areMenuOpenKeysEqual(["servers"], ["servers", "dns"]), false);
});

test("legacy routeNavigation helper file has been removed", () => {
  assert.equal(existsSync(resolve(workspaceRoot, "src/routeNavigation.ts")), false);
});
