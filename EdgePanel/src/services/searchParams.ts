import { DEFAULT_PAGE_SIZE_FALLBACK } from "./pagination";

export function searchParamsToObject(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries());
}

export function getPage(searchParams: URLSearchParams, fallback = 1): number {
  return Number(searchParams.get("page")) || fallback;
}

export function getSize(searchParams: URLSearchParams, fallback = DEFAULT_PAGE_SIZE_FALLBACK): number {
  return Number(searchParams.get("size")) || fallback;
}

export function getOffset(page: number, size: number): number {
  return (page - 1) * size;
}

export function withoutKeys<T extends Record<string, string>>(record: T, keys: string[]): T {
  const next = { ...record };
  for (const key of keys) {
    delete next[key as keyof T];
  }

  return next;
}
