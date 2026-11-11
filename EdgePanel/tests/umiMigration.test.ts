import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");

function walkFiles(relativePath: string): string[] {
  const absolutePath = resolve(workspaceRoot, relativePath);
  const entries = readdirSync(absolutePath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextRelativePath = `${relativePath}/${entry.name}`;
    const nextAbsolutePath = resolve(workspaceRoot, nextRelativePath);

    if (entry.isDirectory()) {
      files.push(...walkFiles(nextRelativePath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(nextAbsolutePath);
    }
  }

  return files;
}

test("business source no longer references route-loader APIs", () => {
  const sourceFiles = walkFiles("src").filter((filePath) => !filePath.includes("/pb/") && !filePath.includes("/.umi"));
  const forbiddenPatterns = [
    /\buseLoaderData\b/,
    /\buseRevalidator\b/,
    /\bcreateHashRouter\b/,
    /\bLoaderFunctionArgs\b/,
    /\busePageQueryData\b/,
    /\busePageQueryLoading\b/,
    /\busePageQueryActions\b/,
    /\bPageQueryProvider\b/,
    /\bcreateStaticQueryPage\b/,
    /\bcreateSearchQueryPage\b/,
    /\bcreateParamsQueryPage\b/,
    /\bcreateParamsSearchQueryPage\b/,
    /\bcreatePathSearchQueryPage\b/,
    /from ['"]axios['"]/, 
    /['"]@\/compat\/react-router['"]/, 
    /\bLegacyRouteHost\b/,
    /\blegacyPageContext\b/,
    /\buseRouteContentLoading\b/,
    /\bqueryBridge\b/,
    /\busePageData\b/,
    /\busePageQueryController\b/,
    /\buseNavigation\b/,
  ];

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8");

    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(source, pattern, `${filePath} still contains ${pattern}`);
    }
  }
});

test("legacy router bootstrap files are removed from the workspace", () => {
  const removedFiles = [
    "src/Layout.tsx",
    "src/compat/axios.ts",
    "src/compat/react-router.ts",
    "src/globalRoute.tsx",
    "src/loaders.ts",
    "src/main.tsx",
    "src/pages/LegacyRouteHost.tsx",
    "src/pages/queryPage.tsx",
    "src/routes/clusters.ts",
    "src/routes/dashboard.ts",
    "src/routes/dnsAdminSettings.ts",
    "src/routes/login.ts",
    "src/routes/servers.ts",
    "src/routeNavigation.ts",
    "src/router.tsx",
    "src/runtime/legacyPageContext.tsx",
    "src/runtime/pathPattern.ts",
    "src/runtime/pageQueryRuntime.tsx",
    "src/runtime/queryBridge.ts",
    "src/runtime/requestResponse.ts",
    "src/admin/Profile.tsx",
    "src/cluster/Selectors.tsx",
    "src/cluster/dnsDomainSelectorState.ts",
    "src/cluster/cluster/clusterTabList.ts",
    "src/cluster/node/nodeTabList.ts",
    "src/dns/ProviderForm.tsx",
    "src/dns/providers/index.ts",
    "src/server/CreateCertPopup.tsx",
    "src/server/serverSearchLayout.ts",
    "src/server/server/serverTabList.ts",
    "src/server/server/httpsDefaults.ts",
    "src/setting/settingTabList.ts",
    "src/setting/advSettingTabList.ts",
    "src/setupAxios.ts",
    "src/stores/globalTaskStore.ts",
    "src/stores/uiConfigStore.ts",
    "src/useRouteContentLoading.ts",
    "src/vite-env.d.ts",
    "vite.config.ts",
  ];

  for (const relativePath of removedFiles) {
    assert.equal(existsSync(resolve(workspaceRoot, relativePath)), false, `${relativePath} should be removed`);
  }
});

test("umi runtime config files exist", () => {
  const requiredFiles = [
    "config/config.ts",
    "config/routes.ts",
    "src/access.ts",
    "src/app.tsx",
    "src/global.tsx",
    "src/loading.tsx",
    "src/queries/keys.ts",
    "src/queries/searchParams.ts",
    "src/tailwind.css",
    "src/wrappers/AuthGuard.tsx",
  ];

  for (const relativePath of requiredFiles) {
    const absolutePath = resolve(workspaceRoot, relativePath);
    assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`);
    assert.equal(statSync(absolutePath).isFile(), true, `${relativePath} should be a file`);
  }
});

test("route pages do not import legacy route implementation directories", () => {
  const pageFiles = walkFiles("src/pages");
  const forbiddenImportPatterns = [
    /from ['"].*\/admin\/Admins['"]/, 
    /from ['"].*\/admin\/Profile['"]/, 
    /from ['"].*\/cluster\/(ClusterCreate|Clusters|Monitor|NodeGrant|NodeLog|Nodes|Regions)['"]/, 
    /from ['"].*\/cluster\/Selectors['"]/, 
    /from ['"].*\/cluster\/dnsDomainSelectorState['"]/, 
    /from ['"].*\/cluster\/cluster\/(ClusterDashboard|ClusterNodes|ClusterSettings)['"]/, 
    /from ['"].*\/cluster\/cluster\/clusterTabList['"]/, 
    /from ['"].*\/cluster\/node\/(NodeDashboard|NodeDetails|NodeInstall|NodeLogs|NodeSettings)['"]/, 
    /from ['"].*\/cluster\/node\/nodeTabList['"]/, 
    /from ['"].*\/dns\/(Domains|ProviderList)['"]/, 
    /from ['"].*\/dns\/ProviderForm['"]/, 
    /from ['"].*\/dns\/providers(?:\/|['"])/, 
    /from ['"].*\/server\/(AccessLogs|CachePolicies|CacheTasks|Certs|Groups|IPLists|Metrics|Servers|WafPolicies|WafPolicySettings)['"]/, 
    /from ['"].*\/server\/CreateCertPopup['"]/, 
    /from ['"].*\/server\/serverSearchLayout['"]/, 
    /from ['"].*\/server\/server\/(ServerAccessLogs|ServerDashboard|ServerSettings|ServerStats)['"]/, 
    /from ['"].*\/server\/server\/(serverTabList|httpsDefaults)['"]/, 
    /from ['"].*\/setting\/(AccessLogDB|AdminUIConfig|ApiNodes|DatabaseCleanup|SecurityConfig|UserUIConfig)['"]/, 
    /from ['"].*\/setting\/(settingTabList|advSettingTabList)['"]/, 
  ];

  for (const filePath of pageFiles) {
    const source = readFileSync(filePath, "utf8");

    for (const pattern of forbiddenImportPatterns) {
      assert.doesNotMatch(source, pattern, `${filePath} should not import legacy route implementations via ${pattern}`);
    }
  }
});

test("route pages update search params with explicit URLSearchParams instances", () => {
  const pageFiles = walkFiles("src/pages");
  const callbackSearchParamPattern = /setSearchParams\(\s*\(?prev\)?\s*=>|setSearchParams\(\(prev\)\s*=>/m;

  for (const filePath of pageFiles) {
    const source = readFileSync(filePath, "utf8");
    assert.doesNotMatch(source, callbackSearchParamPattern, `${filePath} should build URLSearchParams outside setSearchParams callbacks`);
  }
});

test("umi config enables the runtime plugin keys exported from src/app.tsx", () => {
  const configSource = readFileSync(resolve(workspaceRoot, "config/config.ts"), "utf8");
  const requiredPluginKeys = ["initialState", "access", "request", "layout", "reactQuery"];

  for (const pluginKey of requiredPluginKeys) {
    assert.match(configSource, new RegExp(`\\b${pluginKey}\\s*:\\s*\\{`, "m"), `${pluginKey} plugin should be enabled in config/config.ts`);
  }

  assert.match(configSource, /\butoopack\s*:\s*\{/, "config/config.ts should enable utoopack config");
  assert.match(configSource, /\bproxy\s*:\s*\{/, "config/config.ts should define dev proxy");
  assert.doesNotMatch(configSource, /axios:\s*join\(/, "config/config.ts should not alias axios anymore");
});
