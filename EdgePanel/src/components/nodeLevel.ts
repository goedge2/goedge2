export function getNodeLevel(level?: number): number {
  return level && level > 0 ? level : 1;
}

export function normalizeNodeLnAddrs(addrs?: string[]): string[] {
  return [...new Set((addrs ?? []).map((addr) => addr.trim()).filter(Boolean))];
}
