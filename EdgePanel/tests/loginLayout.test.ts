import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const loginSource = readFileSync(resolve(workspaceRoot, "src/pages/Login.tsx"), "utf8");
const appSource = readFileSync(resolve(workspaceRoot, "src/app.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(workspaceRoot, "src/pages/dashboard/index.tsx"), "utf8");

test("login fields define the requested focus and keyboard order", () => {
  const usernameStart = loginSource.indexOf('<ProFormText\n              name="username"');
  const passwordStart = loginSource.indexOf("<ProFormText.Password", usernameStart);
  const usernameField = loginSource.slice(usernameStart, passwordStart);
  const passwordField = loginSource.slice(passwordStart, loginSource.indexOf("</LoginForm>", passwordStart));

  assert.notEqual(usernameStart, -1);
  assert.notEqual(passwordStart, -1);
  assert.match(usernameField, /autoFocus: true/);
  assert.match(usernameField, /allowClear: true/);
  assert.match(usernameField, /tabIndex: 1/);
  assert.match(passwordField, /allowClear: true/);
  assert.match(passwordField, /tabIndex: 2/);
  assert.match(loginSource, /submitButtonProps:\s*\{[\s\S]*?tabIndex: 3/);
});

test("profile action uses the shared text button style", () => {
  const userMenuStart = appSource.indexOf('key="user-menu"');
  const userMenuEnd = appSource.indexOf("</Dropdown>", userMenuStart);
  const userMenu = appSource.slice(userMenuStart, userMenuEnd);

  assert.notEqual(userMenuStart, -1);
  assert.notEqual(userMenuEnd, -1);
  assert.doesNotMatch(appSource, /\bAvatar\b/);
  assert.match(userMenu, /<Button type="text"/);
  assert.match(userMenu, /<UserOutlined \/>/);
  assert.match(userMenu, /aria-label=/);
});

test("dashboard omits the user statistic card", () => {
  assert.doesNotMatch(dashboardSource, /title: "用户"/);
  assert.doesNotMatch(dashboardSource, /\bUserOutlined\b/);
});
