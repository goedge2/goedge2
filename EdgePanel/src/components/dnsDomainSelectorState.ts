export interface DNSDomainSelectorSyncState {
  value?: bigint | number | string;
  internalValue: readonly (string | number)[];
  domainName?: string;
}

export type DNSDomainSelectorSyncAction = { type: "noop" } | { type: "clear" } | { type: "load"; domainId: number };

export interface DNSDomainSelectorChangeState {
  valuePath: readonly (string | number)[];
  selectedValue?: string | number;
  selectedLabel?: string;
  isLeaf: boolean;
}

export type DNSDomainSelectorChangeAction = { type: "clear" } | { type: "intermediate" } | { type: "commit"; domainId: number; domainName: string };

export function getDNSDomainSelectorSyncAction({ value, internalValue }: DNSDomainSelectorSyncState): DNSDomainSelectorSyncAction {
  const domainId = Number(value ?? 0);

  if (!domainId) {
    return internalValue.length >= 2 ? { type: "clear" } : { type: "noop" };
  }

  return internalValue.length === 2 && Number(internalValue[1]) === domainId ? { type: "noop" } : { type: "load", domainId };
}

export function getDNSDomainSelectorChangeAction({
  valuePath,
  selectedValue,
  selectedLabel,
  isLeaf,
}: DNSDomainSelectorChangeState): DNSDomainSelectorChangeAction {
  if (valuePath.length === 0) {
    return { type: "clear" };
  }

  if (!isLeaf || selectedValue === undefined || selectedLabel === undefined) {
    return { type: "intermediate" };
  }

  return {
    type: "commit",
    domainId: Number(selectedValue),
    domainName: selectedLabel,
  };
}
