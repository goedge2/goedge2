export type HTTPSFormValue = {
  isOn?: boolean;
  listen?: Array<{ protocol?: string; portRange?: string }>;
  sslPolicy?: {
    minVersion?: string;
    http2Enabled?: boolean;
  };
};

type HTTPSMinVersion = NonNullable<HTTPSFormValue["sslPolicy"]>["minVersion"];

function hasHTTPSListen(listen: HTTPSFormValue["listen"]): boolean {
  return Array.isArray(listen) && listen.some((item) => item?.portRange?.trim());
}

function hasHTTPSMinVersion(minVersion: HTTPSMinVersion): boolean {
  return typeof minVersion === "string" && minVersion.trim().length > 0;
}

export function buildHTTPSFirstEnableDefaults(https: HTTPSFormValue | undefined): Partial<HTTPSFormValue> | null {
  if (!https?.isOn) {
    return null;
  }

  const defaults: Partial<HTTPSFormValue> = {};
  const sslPolicyDefaults: NonNullable<HTTPSFormValue["sslPolicy"]> = {};

  if (!hasHTTPSListen(https.listen)) {
    defaults.listen = [{ protocol: "https", portRange: "443" }];
  }

  if (!hasHTTPSMinVersion(https.sslPolicy?.minVersion)) {
    sslPolicyDefaults.minVersion = "TLS 1.1";
  }

  if (https.sslPolicy?.http2Enabled == null) {
    sslPolicyDefaults.http2Enabled = true;
  }

  if (Object.keys(sslPolicyDefaults).length > 0) {
    defaults.sslPolicy = sslPolicyDefaults;
  }

  return Object.keys(defaults).length > 0 ? defaults : null;
}
