import test from "node:test";
import assert from "node:assert/strict";

import enUSMessages from "../src/locales/en-US.ts";
import zhCNMessages from "../src/locales/zh-CN.ts";
import zhTWMessages from "../src/locales/zh-TW.ts";
import { SUPPORTED_PANEL_LOCALES, getDayjsLocale, getLocaleLabel, normalizePanelLocale, readBootPanelLocale } from "../src/runtime/i18n.ts";
import { edgeMenuData } from "../src/runtime/menuData.ts";

type EdgeMenuItem = (typeof edgeMenuData)[number];

function collectLocaleIds(items: readonly EdgeMenuItem[]): string[] {
  return items.flatMap((item) => [item.locale, ...(item.children ? collectLocaleIds(item.children) : [])]);
}

test("edge menu data uses stable locale ids for all top-level and direct child items", () => {
  const localeIds = collectLocaleIds(edgeMenuData);

  assert.deepEqual(localeIds, [
    "menu.dashboard",
    "menu.servers.root",
    "menu.servers.list",
    "menu.servers.accessLogs",
    "menu.servers.groups",
    "menu.servers.certs",
    "menu.servers.cachePolicies",
    "menu.servers.cacheTask",
    "menu.servers.wafPolicies",
    "menu.servers.ipLists",
    "menu.servers.metrics",
    "menu.clusters.root",
    "menu.clusters.list",
    "menu.clusters.nodes",
    "menu.clusters.nodeLogs",
    "menu.clusters.nodeRegions",
    "menu.clusters.nodeGrants",
    "menu.clusters.monitor",
    "menu.dns.root",
    "menu.dns.providers",
    "menu.admins.root",
    "menu.admins.list",
    "menu.admins.recipients",
    "menu.logs",
    "menu.settings.root",
    "menu.settings.ui",
    "menu.settings.apiNodes",
  ]);
});

test("locale resource files keep the same key set across supported languages", () => {
  const zhCNKeys = Object.keys(zhCNMessages).sort();
  const zhTWKeys = Object.keys(zhTWMessages).sort();
  const enUSKeys = Object.keys(enUSMessages).sort();

  assert.deepEqual(zhTWKeys, zhCNKeys);
  assert.deepEqual(enUSKeys, zhCNKeys);
});

test("all menu locale ids are present in each locale resource file", () => {
  const localeIds = collectLocaleIds(edgeMenuData);

  for (const localeId of localeIds) {
    assert.equal(typeof zhCNMessages[localeId], "string", `zh-CN is missing ${localeId}`);
    assert.equal(typeof zhTWMessages[localeId], "string", `zh-TW is missing ${localeId}`);
    assert.equal(typeof enUSMessages[localeId], "string", `en-US is missing ${localeId}`);
  }
});

test("supported panel locales stay ordered and normalize invalid values back to zh-CN", () => {
  assert.deepEqual(SUPPORTED_PANEL_LOCALES, ["zh-CN", "zh-TW", "en-US"]);
  assert.equal(normalizePanelLocale("zh-CN"), "zh-CN");
  assert.equal(normalizePanelLocale("zh-TW"), "zh-TW");
  assert.equal(normalizePanelLocale("en-US"), "en-US");
  assert.equal(normalizePanelLocale("fr-FR"), "zh-CN");
  assert.equal(normalizePanelLocale(undefined), "zh-CN");
});

test("dayjs locale mapping follows the active panel locale", () => {
  assert.equal(getDayjsLocale("zh-CN"), "zh-cn");
  assert.equal(getDayjsLocale("zh-TW"), "zh-tw");
  assert.equal(getDayjsLocale("en-US"), "en");
  assert.equal(getDayjsLocale("fr-FR"), "zh-cn");
});

test("boot locale resolution only depends on stored umi locale values", () => {
  assert.equal(readBootPanelLocale("zh-CN"), "zh-CN");
  assert.equal(readBootPanelLocale("zh-TW"), "zh-TW");
  assert.equal(readBootPanelLocale("en-US"), "en-US");
  assert.equal(readBootPanelLocale("ja-JP"), "zh-CN");
  assert.equal(readBootPanelLocale(null), "zh-CN");
});

test("locale labels stay human readable for the header switcher", () => {
  assert.equal(getLocaleLabel("zh-CN"), "简体中文");
  assert.equal(getLocaleLabel("zh-TW"), "繁體中文");
  assert.equal(getLocaleLabel("en-US"), "English");
});
