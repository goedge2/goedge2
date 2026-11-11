export type DomainPreviewState = {
  domains: string[];
  previewDomains: string[];
  previewCount: number;
  totalDomains: number;
  hasOverflow: boolean;
  overflowCount: number;
  modalText: string;
};

export function getDomainPreviewState(domains: string[] | undefined, previewCount: number): DomainPreviewState {
  const normalizedDomains = Array.isArray(domains) ? domains.filter((domain) => domain.trim().length > 0) : [];
  const boundedPreviewCount = Math.max(0, previewCount);
  const totalDomains = normalizedDomains.length;
  const previewDomains = normalizedDomains.slice(0, boundedPreviewCount);
  const overflowCount = Math.max(0, totalDomains - previewDomains.length);

  return {
    domains: normalizedDomains,
    previewDomains,
    previewCount: boundedPreviewCount,
    totalDomains,
    hasOverflow: overflowCount > 0,
    overflowCount,
    modalText: normalizedDomains.join("\n"),
  };
}
