const MIN_PORT = 1;
const MAX_PORT = 65535;

const SINGLE_PORT_REGEXP = /^\d+$/;
const PORT_RANGE_REGEXP = /^(\d+)\s*[-:]\s*(\d+)$/;

export const LISTEN_PORT_SPLIT_REGEXP = /[\s,，;；]+/;

export type ListenPortNormalizeResult =
  | {
      ok: true;
      normalized: string;
      dedupeKey: string;
    }
  | {
      ok: false;
      error: string;
    };

export type ListenPortAppendResult =
  | {
      ok: true;
      nextPortRanges: string[];
    }
  | {
      ok: false;
      error: string;
    };

const normalizePortNumber = (raw: string): number | null => {
  if (!SINGLE_PORT_REGEXP.test(raw)) {
    return null;
  }

  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    return null;
  }

  return port;
};

export const normalizeListenPortToken = (raw: string): ListenPortNormalizeResult => {
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, error: "请输入有效的端口或端口范围" };
  }

  if (SINGLE_PORT_REGEXP.test(value)) {
    const port = normalizePortNumber(value);
    if (port === null) {
      return { ok: false, error: "端口必须在 1~65535 范围内" };
    }

    return {
      ok: true,
      normalized: String(port),
      dedupeKey: `port:${port}`,
    };
  }

  const rangeMatch = value.match(PORT_RANGE_REGEXP);
  if (rangeMatch) {
    const startPort = normalizePortNumber(rangeMatch[1]);
    const endPort = normalizePortNumber(rangeMatch[2]);
    if (startPort === null || endPort === null) {
      return { ok: false, error: "端口必须在 1~65535 范围内" };
    }
    if (startPort > endPort) {
      return { ok: false, error: "范围起始端口不能大于结束端口" };
    }

    return {
      ok: true,
      normalized: `${startPort}-${endPort}`,
      dedupeKey: `range:${startPort}-${endPort}`,
    };
  }

  return { ok: false, error: "请输入有效的端口或端口范围" };
};

export const getListenPortDedupeKey = (raw: string): string | null => {
  const result = normalizeListenPortToken(raw);
  return result.ok ? result.dedupeKey : null;
};

export const appendListenPortTokens = (currentPortRanges: string[], rawInput: string): ListenPortAppendResult => {
  const tokens = rawInput
    .split(LISTEN_PORT_SPLIT_REGEXP)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return {
      ok: true,
      nextPortRanges: [...currentPortRanges],
    };
  }

  const nextPortRanges = [...currentPortRanges];
  const dedupeKeys = new Set<string>();

  currentPortRanges.forEach((portRange) => {
    const dedupeKey = getListenPortDedupeKey(portRange);
    if (dedupeKey) {
      dedupeKeys.add(dedupeKey);
    }
  });

  for (const token of tokens) {
    const result = normalizeListenPortToken(token);
    if (!result.ok) {
      return result;
    }

    if (!dedupeKeys.has(result.dedupeKey)) {
      dedupeKeys.add(result.dedupeKey);
      nextPortRanges.push(result.normalized);
    }
  }

  return {
    ok: true,
    nextPortRanges,
  };
};

export const findFirstInvalidListenPortRange = (portRanges: string[]): { portRange: string; error: string } | null => {
  for (const portRange of portRanges) {
    const result = normalizeListenPortToken(portRange);
    if (!result.ok) {
      return { portRange, error: result.error };
    }
  }

  return null;
};

const getDefaultSuggestedListenPortRanges = (protocol?: string): string[] => {
  switch (protocol?.toLowerCase()) {
    case "http":
      return ["80", "8080", "8000", "3000", "4000"];
    case "https":
      return ["443", "8443", "9443", "4443", "10443"];
    default:
      return ["80", "443", "8080", "8443", "3000", "4000"];
  }
};

export const getSuggestedListenPortRanges = (protocol?: string, suggestedPortRanges?: string[]): string[] => {
  const sourcePortRanges = suggestedPortRanges === undefined ? getDefaultSuggestedListenPortRanges(protocol) : suggestedPortRanges;

  const normalizedPortRanges: string[] = [];
  const dedupeKeys = new Set<string>();

  sourcePortRanges.forEach((portRange) => {
    const result = normalizeListenPortToken(portRange);
    if (!result.ok || dedupeKeys.has(result.dedupeKey)) {
      return;
    }

    dedupeKeys.add(result.dedupeKey);
    normalizedPortRanges.push(result.normalized);
  });

  return normalizedPortRanges;
};
