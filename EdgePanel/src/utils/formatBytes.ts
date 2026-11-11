export function formatBytesSimple(bytes: number | bigint | string, decimals = 2) {
  const num = typeof bytes === "bigint" || typeof bytes === "string" ? Number(bytes) : bytes;
  if (!Number.isFinite(num) || num <= 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  const i = Math.max(0, Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1));

  return `${parseFloat((num / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
