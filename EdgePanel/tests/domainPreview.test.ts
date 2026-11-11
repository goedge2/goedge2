import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDomainPreviewState } from "../src/pages/servers/_components/domainPreview.ts";

const workspaceRoot = resolve(import.meta.dirname, "..");
const componentPath = resolve(workspaceRoot, "src/pages/servers/_components/DomainPreviewCell.tsx");

test("domain preview collapses long domain lists into a bounded preview", () => {
  assert.deepEqual(getDomainPreviewState(["a.com", "b.com", "c.com"], 1), {
    domains: ["a.com", "b.com", "c.com"],
    previewDomains: ["a.com"],
    previewCount: 1,
    totalDomains: 3,
    hasOverflow: true,
    overflowCount: 2,
    modalText: "a.com\nb.com\nc.com",
  });
});

test("domain preview keeps all domains visible when the list fits", () => {
  assert.deepEqual(getDomainPreviewState(["a.com", "b.com", "c.com", "d.com", "e.com"], 5), {
    domains: ["a.com", "b.com", "c.com", "d.com", "e.com"],
    previewDomains: ["a.com", "b.com", "c.com", "d.com", "e.com"],
    previewCount: 5,
    totalDomains: 5,
    hasOverflow: false,
    overflowCount: 0,
    modalText: "a.com\nb.com\nc.com\nd.com\ne.com",
  });
});

test("domain preview treats missing domains as an empty list", () => {
  assert.deepEqual(getDomainPreviewState(undefined, 5), {
    domains: [],
    previewDomains: [],
    previewCount: 5,
    totalDomains: 0,
    hasOverflow: false,
    overflowCount: 0,
    modalText: "",
  });
});

test("shared domain preview component is wired into the servers and certs pages", () => {
  assert.equal(existsSync(componentPath), true, "shared DomainPreviewCell component should exist");

  const componentSource = readFileSync(componentPath, "utf8");
  assert.match(componentSource, /Input\.TextArea/);
  assert.match(componentSource, /readOnly/);
  assert.match(componentSource, /Modal/);
  assert.match(componentSource, /FullscreenOutlined/);
  assert.match(componentSource, /等\{previewState\.totalDomains\}个域名/);

  const serversSource = readFileSync(resolve(workspaceRoot, "src/pages/servers/index.tsx"), "utf8");
  assert.match(serversSource, /DomainPreviewCell/);
  assert.match(serversSource, /previewCount=\{1\}/);
  assert.doesNotMatch(serversSource, /firstServerName\} \{\(server\.countServerNames/);

  const certsSource = readFileSync(resolve(workspaceRoot, "src/pages/servers/certs.tsx"), "utf8");
  assert.match(certsSource, /DomainPreviewCell/);
  assert.match(certsSource, /previewCount=\{5\}/);
  assert.doesNotMatch(certsSource, /cert\.dnsNames\.map/);
});
