const ROUTE_MENU_KEY_MAP: Record<string, string> = {
  servers: "servers",
  clusters: "clusters",
  dns: "dns",
  admins: "admins",
  settings: "settings",
};

export function getRouteMenuOpenKey(pathname: string): string | undefined {
  const [firstSegment] = pathname.split("/").filter(Boolean);
  if (!firstSegment) {
    return undefined;
  }

  return ROUTE_MENU_KEY_MAP[firstSegment];
}

export function normalizeMenuOpenKeys(openKeys: readonly string[]): string[] {
  return [...new Set(openKeys.filter(Boolean))];
}

export function areMenuOpenKeysEqual(leftOpenKeys: readonly string[], rightOpenKeys: readonly string[]): boolean {
  if (leftOpenKeys.length !== rightOpenKeys.length) {
    return false;
  }

  return leftOpenKeys.every((key, index) => key === rightOpenKeys[index]);
}

export function reconcileMenuOpenKeys(currentOpenKeys: string[], candidateOpenKeys: readonly string[], routeMenuKey: string | undefined): string[] {
  const normalizedCurrentOpenKeys = normalizeMenuOpenKeys(currentOpenKeys);
  const normalizedCandidateOpenKeys = routeMenuKey
    ? normalizeMenuOpenKeys([routeMenuKey, ...candidateOpenKeys])
    : normalizeMenuOpenKeys(candidateOpenKeys);

  if (areMenuOpenKeysEqual(normalizedCurrentOpenKeys, normalizedCandidateOpenKeys)) {
    return currentOpenKeys;
  }

  return normalizedCandidateOpenKeys;
}
