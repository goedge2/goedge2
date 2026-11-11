export const ACCESS_TOKEN_STORAGE_KEY = "AccessToken";
export const UI_CONFIG_CACHE_KEY = "edgepanel.ui-config";

type StorageReader = Pick<Storage, "getItem"> | null | undefined;
type StorageWriter = (Pick<Storage, "setItem"> & Partial<Pick<Storage, "removeItem">>) | null | undefined;

function readAccessToken(storage: StorageReader): string | null {
  const value = storage?.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim();

  return value ? value : null;
}

export function getAccessToken(storage?: StorageReader): string | null {
  if (storage !== undefined) {
    return readAccessToken(storage);
  }

  if (typeof window === "undefined") {
    return null;
  }

  return readAccessToken(window.localStorage) || readAccessToken(window.sessionStorage);
}

function removeAccessToken(storage: StorageWriter): void {
  storage?.removeItem?.(ACCESS_TOKEN_STORAGE_KEY);
}

export function storeAccessToken(token: string, remember: boolean, persistentStorage?: StorageWriter, sessionStorage?: StorageWriter): void {
  const persistent = persistentStorage ?? (typeof window !== "undefined" ? window.localStorage : null);
  const session = sessionStorage ?? (typeof window !== "undefined" ? window.sessionStorage : null);
  const target = remember ? persistent : session;

  removeAccessToken(persistent);
  removeAccessToken(session);
  target?.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(persistentStorage?: StorageWriter, sessionStorage?: StorageWriter): void {
  const persistent = persistentStorage ?? (typeof window !== "undefined" ? window.localStorage : null);
  const session = sessionStorage ?? (typeof window !== "undefined" ? window.sessionStorage : null);

  removeAccessToken(persistent);
  removeAccessToken(session);
}

export function getAuthorizationHeaders(token: string | null | undefined): Record<string, string> {
  if (!token) {
    return {};
  }

  return { Authorization: token };
}

export function readCachedJSON<T>(storage: StorageReader, key: string): T | undefined {
  const raw = storage?.getItem(key);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeCachedJSON(storage: StorageWriter, key: string, value: unknown): void {
  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
}
