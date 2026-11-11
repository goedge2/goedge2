import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");

const readSource = (relativePath: string) => readFileSync(resolve(workspaceRoot, relativePath), "utf8");

test("umi config owns hash history and utoopack bundling", () => {
  const source = readSource("config/config.ts");
  const packageJson = JSON.parse(readSource("package.json")) as { scripts?: Record<string, string> };
  const buildScript = packageJson.scripts?.build ?? "";

  assert.match(source, /history:\s*{\s*type:\s*"hash"/s);
  assert.match(source, /proxy:\s*{[\s\S]*"\/api"[\s\S]*"\/file"/);
  assert.match(source, /utoopack:\s*{/);
  assert.match(buildScript, /max build/);
  assert.match(buildScript, /stats\.json/);
  assert.equal(existsSync(resolve(workspaceRoot, "vite.config.ts")), false);
});

test("app runtime defers low-frequency task and profile modals", () => {
  const source = readSource("src/app.tsx");

  assert.match(source, /lazy\(\(\) => import\("\.\/components\/GlobalTasks"\)/);
  assert.match(source, /lazy\(\(\) => import\("\.\/pages\/admins\/_shared\/Profile"\)/);
  assert.doesNotMatch(source, /from "\.\/components\/GlobalTasks"/);
  assert.doesNotMatch(source, /from "\.\/admin\/Profile"/);
});

test("app runtime loads the current profile label independently of opening the profile modal", () => {
  const source = readSource("src/app.tsx");

  assert.match(source, /useAdminProfileQuery\(\)/);
  assert.match(source, /onDisplayNameChange=\{\(\) => void profileQuery\.refetch\(\)\}/);
  assert.doesNotMatch(source, /axios\./);
});

test("umi route config points protected paths to native page entries with auth wrappers", () => {
  const source = readSource("config/routes.ts");

  assert.match(source, /path:\s*"\/login"[\s\S]*component:\s*"\.\/Login"/);
  assert.match(source, /wrappers:\s*\["@\/wrappers\/AuthGuard"\]/);
  assert.match(source, /path:\s*"\/servers"[\s\S]*component:\s*"\.\/servers\/index"/);
  assert.match(source, /path:\s*"\/clusters"[\s\S]*component:\s*"\.\/clusters\/index"/);
  assert.match(source, /path:\s*"\/settings\/ui"[\s\S]*component:\s*"\.\/settings\/admin-ui"/);
  assert.doesNotMatch(source, /LegacyRouteHost/);
});

test("AuthGuard renders Outlet for nested protected routes", () => {
  const source = readSource("src/wrappers/AuthGuard.tsx");

  assert.match(source, /import\s*\{[^}]*\bNavigate\b[^}]*\bOutlet\b[^}]*\}\s*from\s*"@umijs\/max"/);
  assert.match(source, /return\s*<Navigate\s+to="\/login"\s+replace\s*\/>/);
  assert.match(source, /return\s*<Outlet\s*\/>/);
  assert.doesNotMatch(source, /children:\s*ReactNode/);
  assert.doesNotMatch(source, /return\s*<>\{children\}<\/>/);
  assert.doesNotMatch(source, /history\.replace/);
  assert.doesNotMatch(source, /useEffect\(/);
});

test("route chunk loading fallback keeps the visible loading copy", () => {
  const source = readSource("src/loading.tsx");

  assert.match(source, /页面加载中\.\.\./);
  assert.match(source, /<Spin/);
  assert.doesNotMatch(source, /return\s+null;/);
});

test("umi route config defines native nested routes for cache tasks and monitor pages", () => {
  const source = readSource("config/routes.ts");

  assert.match(source, /path:\s*"\/servers\/cache-task"[\s\S]*component:\s*"\.\/servers\/cache-task\/layout"[\s\S]*routes:\s*\[/);
  assert.match(source, /path:\s*"\/servers\/cache-task\/fetch"[\s\S]*component:\s*"\.\/servers\/cache-task\/fetch"/);
  assert.match(source, /path:\s*"\/servers\/cache-task\/all"[\s\S]*component:\s*"\.\/servers\/cache-task\/all"/);
  assert.match(source, /path:\s*"\/clusters\/monitor"[\s\S]*component:\s*"\.\/clusters\/monitor\/layout"[\s\S]*routes:\s*\[/);
  assert.match(source, /path:\s*"\/clusters\/monitor\/groups"[\s\S]*component:\s*"\.\/clusters\/monitor\/groups"/);
  assert.match(source, /path:\s*"\/clusters\/monitor\/settings"[\s\S]*component:\s*"\.\/clusters\/monitor\/settings"/);
});

test("native route entry files exist under src/pages", () => {
  const requiredPages = [
    "src/pages/servers/index.tsx",
    "src/pages/clusters/index.tsx",
    "src/pages/dns/providers.tsx",
    "src/pages/settings/admin-ui.tsx",
    "src/pages/servers/cache-task/layout.tsx",
    "src/pages/clusters/monitor/layout.tsx",
  ];

  for (const relativePath of requiredPages) {
    assert.equal(existsSync(resolve(workspaceRoot, relativePath)), true, `${relativePath} should exist`);
  }
});

test("login defers QR code rendering until the OTP bind step", () => {
  const source = readSource("src/pages/Login.tsx");

  assert.match(source, /lazy\(\(\) => import\(["']@\/components\/OtpQRCode["']\)\)/);
  assert.doesNotMatch(source, /from "qrcode\.react"/);
});

test("OTP QR code uses the Ant Design QRCode component", () => {
  const source = readSource("src/components/OtpQRCode.tsx");

  assert.match(source, /import \{ QRCode \} from "antd"/);
  assert.doesNotMatch(source, /qrcode\.react/);
  assert.match(source, /<QRCode[\s\S]*type="svg"[\s\S]*errorLevel=\{level\}/);
});
