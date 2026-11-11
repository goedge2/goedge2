import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NodeDNSInfo } from "../src/pb/service_node_pb";
import {
  buildNodeDNSPayload,
  buildNodeDNSUpdate,
  isNodeDNSAddressAvailable,
  nodeDNSFormValues,
  syncNodeDNSIPAddress,
} from "../src/services/nodeDNSForm.ts";
import { nodeSettingsTabItems } from "../src/pages/clusters/settingsTabItems.ts";
import { findSettingsTabByKey, shouldForceRenderSettingsTab } from "../src/pages/clusters/settingsHelpers.ts";

const workspaceRoot = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(workspaceRoot, path), "utf8");
const fieldsSource = source("src/pages/clusters/_shared/NodeDNSSettingsFields.tsx");
const settingsSource = source("src/pages/clusters/node-settings.tsx");

test("shared DNS fields bind the select directly and do not create a separate form", () => {
  assert.doesNotMatch(fieldsSource, /<Form\s|Form\.useForm\(/);
  assert.match(fieldsSource, /name=\{fieldName\("routes"\)\}/);
  assert.match(fieldsSource, /<Select\s+mode="multiple"/);
  assert.match(fieldsSource, /\? \(\s*<Select\b/);
  assert.doesNotMatch(fieldsSource, /<Space[^>]*>\s*<Select\b/);
  assert.match(fieldsSource, /\) : \(\s*<Text type="secondary">没有可选的线路<\/Text>\s*\)\}\s*<\/Form\.Item>/);
});

test("DNS IP Enter submits the enclosing main or modal form", () => {
  assert.match(fieldsSource, /Form\.useFormInstance\(\)/);
  assert.match(fieldsSource, /onPressEnter=\{\(event\) => \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*form\.submit\(\);/);
});

test("node DNS settings join the main form and expose its footer", () => {
  const tab = findSettingsTabByKey(nodeSettingsTabItems, "dns");
  assert.equal(tab?.independent, false);
  assert.equal(shouldForceRenderSettingsTab(tab), true);
  assert.match(settingsSource, /<NodeDNSSettingsFields\s+namePrefix="dns"/);
  assert.doesNotMatch(settingsSource, /NodeDNSSettingsPanel/);
  assert.match(settingsSource, /buildNodeDNSUpdate\(dns, values\.ipAddresses\)/);
  assert.match(settingsSource, /dns && selectedClusterId !== "0" \? buildNodeDNSUpdate/);
  assert.match(settingsSource, /nodeCluster: \{ id: Number\(nodeClusterId\), \.\.\.dnsUpdate\?\.nodeCluster \}/);
  assert.doesNotMatch(settingsSource, /dns: buildNodeDNSPayload/);
  assert.match(settingsSource, /!activeTabConfig\?\.independent \? \(\s*<FooterToolbar>/);
  assert.match(settingsSource, /initialValues=\{initialValues\}/);
});

test("DNS readback retains route domain IDs and uses the legacy code@domain format", () => {
  const values = nodeDNSFormValues({
    ipAddr: "203.0.113.13",
    nodeIPAddressId: 3n,
    dnsDomainId: 28n,
    routes: [{ code: "Default" }, { code: "Baidu" }],
  } as NodeDNSInfo);
  assert.deepEqual(values, { ipAddr: "203.0.113.13", nodeIPAddressId: "3", dnsDomainId: "28", routes: ["Default@28", "Baidu@28"] });
  assert.deepEqual(buildNodeDNSPayload(values), { ipAddr: "203.0.113.13", nodeIPAddressId: 3, dnsDomainId: 28, routes: ["Default@28", "Baidu@28"] });
});

test("DNS saves preserve explicit route clears and trim the IP address", () => {
  assert.deepEqual(buildNodeDNSPayload({ ipAddr: " 203.0.113.13 ", dnsDomainId: "28", routes: [] }), {
    ipAddr: "203.0.113.13",
    nodeIPAddressId: 0,
    dnsDomainId: 28,
    routes: [],
  });
  assert.match(source("src/services/nodeDNS.ts"), /\.\.\.buildNodeDNSPayload\(params\)/);
});

test("a main save without a DNS domain only updates IPs; the standalone API keeps its legacy zero-domain semantics", () => {
  const values = { ipAddr: "203.0.113.13", dnsDomainId: "0", routes: [] };
  const payload = buildNodeDNSUpdate(values);
  assert.equal("dnsRoutes" in payload, false);
  assert.equal("nodeCluster" in payload, false);
  assert.equal(buildNodeDNSPayload(values).dnsDomainId, 0);
});

test("main saves reuse Node fields and leave the standalone API payload unchanged", () => {
  const addresses = [{ id: "3", ip: "203.0.113.13", canAccess: true, isOn: true, isUp: true }];
  const values = { ipAddr: "203.0.113.99", nodeIPAddressId: "3", dnsDomainId: "28", routes: ["Default@28", "Baidu@28"] };
  assert.deepEqual(buildNodeDNSUpdate(values, addresses), {
    nodeCluster: { dnsDomainId: 28 },
    dnsRoutes: [{ code: "Default" }, { code: "Baidu" }],
    ipAddresses: [{ ...addresses[0], ip: "203.0.113.99" }],
  });
  assert.deepEqual(buildNodeDNSUpdate({ ...values, routes: [] }, addresses).dnsRoutes, []);
  const withoutDomain = buildNodeDNSUpdate({ ...values, dnsDomainId: "0" }, addresses);
  assert.equal("nodeCluster" in withoutDomain, false);
  assert.equal("dnsRoutes" in withoutDomain, false);
  assert.equal("dns" in buildNodeDNSUpdate(values, addresses), false);
  assert.equal(addresses[0].ip, "203.0.113.13");
});

test("main DNS updates reuse new regular IPs and do not change offline address status", () => {
  const values = { ipAddr: "198.51.100.51", dnsDomainId: "28", routes: [] };
  assert.deepEqual(buildNodeDNSUpdate(values, [{ ip: "198.51.100.50", canAccess: true, isOn: true, isUp: true }]).ipAddresses, [
    { ip: "198.51.100.51", canAccess: true, isOn: true, isUp: true },
  ]);
  const offline = { id: "3", ip: "192.0.2.1", canAccess: true, isOn: true, isUp: false };
  assert.deepEqual(buildNodeDNSUpdate({ ...values, ipAddr: "" }, [offline]).ipAddresses, [offline]);
  assert.deepEqual(buildNodeDNSUpdate(values, [offline]).ipAddresses, [
    offline,
    { name: "DNS IP", ip: "198.51.100.51", canAccess: true, isOn: true, isUp: true },
  ]);
});

test("editing the DNS IP synchronizes the matching regular IP without dropping flags", () => {
  const other = { id: "4", ip: "192.0.2.4", canAccess: false };
  const values = {
    dns: { nodeIPAddressId: "3", ipAddr: "203.0.113.99" },
    ipAddresses: [{ id: 3n, ip: "203.0.113.13", canAccess: true, isOn: true }, other],
  };
  const synced = syncNodeDNSIPAddress({ dns: { ipAddr: "203.0.113.99" } }, values);
  assert.deepEqual(synced?.ipAddresses, [{ id: 3n, ip: "203.0.113.99", canAccess: true, isOn: true }, other]);
  assert.equal(values.ipAddresses[0].ip, "203.0.113.13");
});

test("editing regular IPs synchronizes DNS without clearing routes", () => {
  const dns = { nodeIPAddressId: "3", ipAddr: "203.0.113.13", dnsDomainId: "28", routes: ["Default@28"] };
  const ipAddresses = [{ id: 3n, ip: "203.0.113.99" }];
  assert.deepEqual(syncNodeDNSIPAddress({ ipAddresses }, { dns, ipAddresses }), { dns: { ...dns, ipAddr: "203.0.113.99" } });
});

test("removing the DNS IP selects a replacement and supports unsaved addresses", () => {
  const dns = { nodeIPAddressId: "3", dnsDomainId: "28", routes: [] };
  const ipAddresses = [
    { id: "4", ip: "192.0.2.4", canAccess: false },
    { ip: "203.0.113.99", canAccess: true },
  ];
  assert.deepEqual(syncNodeDNSIPAddress({ ipAddresses }, { dns, ipAddresses }), { dns: { ...dns, nodeIPAddressId: "0", ipAddr: "203.0.113.99" } });
  const newValues = { dns: { ...dns, nodeIPAddressId: "0", ipAddr: "203.0.113.100" }, ipAddresses };
  assert.equal(syncNodeDNSIPAddress({ dns: { ipAddr: "203.0.113.100" } }, newValues)?.ipAddresses?.[1].ip, "203.0.113.100");
});

test("route changes and missing DNS metadata do not modify regular IPs", () => {
  assert.equal(syncNodeDNSIPAddress({ dns: { routes: [] } }, { dns: { routes: [] }, ipAddresses: [] }), undefined);
  assert.equal(syncNodeDNSIPAddress({ ipAddresses: [] }, { ipAddresses: [] }), undefined);
});

test("unavailable IPs do not require a new DNS IP when saving unrelated node settings", () => {
  for (const address of [{ canAccess: false }, { isOn: false }, { isUp: false }]) {
    assert.equal(isNodeDNSAddressAvailable(address), false);
  }
  assert.equal(isNodeDNSAddressAvailable({ ip: "192.0.2.1" }), true);
  const dns = { nodeIPAddressId: "3", routes: ["Default@28"] };
  const ipAddresses = [{ id: "3", ip: "192.0.2.1", isUp: false }];
  assert.deepEqual(syncNodeDNSIPAddress({ ipAddresses }, { dns, ipAddresses }), { dns: { ...dns, nodeIPAddressId: "0", ipAddr: "" } });
  assert.match(settingsSource, /requireIPAddress=\{[^}]*\.some\(isNodeDNSAddressAvailable\)\}/);
});

test("list DNS editors keep their own validated save form", () => {
  const panel = source("src/pages/clusters/_shared/NodeDNSSettingsPanel.tsx");
  assert.match(panel, /<Form\s+form=\{form\}/);
  assert.match(panel, /<NodeDNSSettingsFields/);
  assert.match(panel, /onClick=\{\(\) => form\.submit\(\)\}/);
  assert.match(panel, /await updateNodeDNS\(/);
  for (const page of ["src/pages/clusters/nodes.tsx", "src/pages/clusters/cluster-nodes.tsx"]) {
    assert.match(source(page), /<NodeDNSSettingsPanel/);
  }
});

test("smart scheduling stays independent with read-only overview and modal editing", () => {
  assert.equal(findSettingsTabByKey(nodeSettingsTabItems, "schedule")?.independent, true);
  const schedule = source("src/pages/clusters/_shared/ScheduleSettingsPanel.tsx");
  const base = schedule.slice(schedule.indexOf("function ScheduleBaseSettings("), schedule.indexOf("function NodeActionEditor("));
  assert.match(base, /<Descriptions/);
  assert.doesNotMatch(base.slice(0, base.indexOf("<Modal")), /<Form\s/);
  assert.match(base, /<Modal\s+title="修改节点基础调度设置"/);
  assert.match(base, /onOk=\{\(\) => form\.submit\(\)\}/);
  assert.match(base, /if \(await onSubmit\(values\)\) setEditing\(false\)/);
});
