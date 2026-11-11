export type QueryParamLeaf = string | number | boolean | null;
export type QueryParamValue = QueryParamLeaf | QueryParamValue[] | QueryParamRecord;

export interface QueryParamRecord {
  [key: string]: QueryParamValue;
}

type SearchParamsInput = URLSearchParams | Record<string, unknown>;

function normalizeQueryLeaf(value: unknown): QueryParamLeaf | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return undefined;
}

function normalizeQueryValue(value: unknown): QueryParamValue | undefined {
  const leaf = normalizeQueryLeaf(value);
  if (leaf !== undefined) {
    return leaf;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeQueryValue(item)).filter((item): item is QueryParamValue => item !== undefined);
  }

  if (value instanceof URLSearchParams) {
    return normalizeSearchParams(value);
  }

  if (typeof value === "object" && value !== null) {
    return normalizeQueryObject(value as Record<string, unknown>);
  }

  return undefined;
}

export function normalizeQueryObject(record: Record<string, unknown>): QueryParamRecord {
  const entries = Object.entries(record)
    .map(([key, value]) => [key, normalizeQueryValue(value)] as const)
    .filter((entry): entry is readonly [string, QueryParamValue] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(entries);
}

export function normalizeSearchParams(searchParams: SearchParamsInput): QueryParamRecord {
  if (!(searchParams instanceof URLSearchParams)) {
    return normalizeQueryObject(searchParams);
  }

  const grouped = new Map<string, string[]>();

  for (const [key, value] of searchParams.entries()) {
    const current = grouped.get(key);
    if (current) {
      current.push(value);
      continue;
    }

    grouped.set(key, [value]);
  }

  const sortedEntries = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, values]) => [key, values.length === 1 ? values[0] : values] as const);

  return Object.fromEntries(sortedEntries);
}

export function buildSearchParamsKey<TKey extends readonly unknown[]>(
  base: TKey,
  searchParams: SearchParamsInput,
): readonly [...TKey, QueryParamRecord] {
  return [...base, normalizeSearchParams(searchParams)] as const;
}

export function buildObjectKey<TKey extends readonly unknown[]>(base: TKey, record: Record<string, unknown>): readonly [...TKey, QueryParamRecord] {
  return [...base, normalizeQueryObject(record)] as const;
}
