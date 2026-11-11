import assert from "node:assert/strict";
import test from "node:test";
import { buildCreateServerPayloadFromForm, defaultPorts, validateCreateServerForm } from "../src/pages/servers/createForm.ts";
import type { CreateServerFormValues, ServerCreateType } from "../src/pages/servers/createForm.ts";

for (const type of ["httpProxy", "httpWeb"] as const) {
  test(`${type} defaults to automatic certificates and HTTP/HTTPS ports`, () => {
    const values = { ...defaultPorts[type], domains: ["example.com"], httpsCerts: [{ id: "12" }] } as CreateServerFormValues;
    const payload = buildCreateServerPayloadFromForm(type, values);
    assert.equal(payload.automaticCert, true);
    assert.deepEqual(payload.serverNames, ["example.com"]);
    assert.deepEqual(payload.https?.sslPolicy?.certs, []);
    assert.equal(payload.http?.listen?.[0].portRange, "80");
    assert.equal(payload.https?.listen?.[0].portRange, "443");
  });

  test(`${type} sends selected certificates only when automatic mode is off`, () => {
    const values = { ...defaultPorts[type], automaticCert: false, httpsCerts: [{ id: "12" }] } as CreateServerFormValues;
    const payload = buildCreateServerPayloadFromForm(type, values);
    assert.equal(payload.automaticCert, false);
    assert.deepEqual(payload.https?.sslPolicy?.certs, [{ id: "12", isOn: true }]);
  });
}

test("changing website type excludes incompatible certificate and protocol fields", () => {
  const values = {
    ...defaultPorts.httpProxy,
    domains: ["example.com"],
    originAddrs: ["127.0.0.1:12345"],
    httpsCerts: [{ id: "12" }],
    tlsCerts: [{ id: "13" }],
    tcpListen: [{ protocol: "tcp", portRange: "12345" }],
    tlsListen: [{ protocol: "tls", portRange: "12346" }],
    udpListen: [{ protocol: "udp", portRange: "12347" }],
    webRoot: "/srv/www",
  } as CreateServerFormValues;
  for (const type of ["tcpProxy", "udpProxy"] as const) {
    const payload = buildCreateServerPayloadFromForm(type, values);
    assert.equal(payload.automaticCert, undefined);
    assert.equal(payload.serverNames, undefined);
    assert.equal(payload.http, undefined);
    assert.equal(payload.https, undefined);
    assert.equal(payload.web, undefined);
    if (type === "tcpProxy") {
      assert.equal(payload.udp, undefined);
      assert.deepEqual(payload.tls?.sslPolicy?.certs, [{ id: "13", isOn: true }]);
    } else {
      assert.equal(payload.tcp, undefined);
      assert.equal(payload.tls, undefined);
    }
  }
  const web = buildCreateServerPayloadFromForm("httpWeb", values);
  assert.equal(web.reverseProxy, undefined);
  assert.deepEqual(web.web, { root: { isOn: true, dir: "/srv/www", indexes: ["index.html", "index.htm"] } });
});

test("load balancers require explicit ports and TLS requires certificates", () => {
  for (const type of ["tcpProxy", "udpProxy"] as ServerCreateType[]) {
    assert.throws(() => validateCreateServerForm(type, { originAddrs: ["127.0.0.1:12345"] }), /端口/);
    assert.equal(defaultPorts[type].tcpListen, undefined);
    assert.equal(defaultPorts[type].udpListen, undefined);
  }
  assert.throws(
    () => validateCreateServerForm("tcpProxy", { tlsListen: [{ protocol: "tls", portRange: "12345" }], originAddrs: ["127.0.0.1:12345"] } as CreateServerFormValues),
    /证书/,
  );
});
