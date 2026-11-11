import type { Server } from "@/pb/models/model_server_pb";
import type { HTTPCompression, HTTPPageOptimization, WebPImage, HLS } from "@/pb/models/model_http_web_pb";

export const compressionTypes = ["brotli", "gzip", "zstd", "deflate"] as const;
export type CompressionType = (typeof compressionTypes)[number];

export function getCompressionTypeOrder(types: readonly string[] = [], currentOrder?: CompressionType[]): CompressionType[] {
  const selected = [...new Set(types)].filter((type): type is CompressionType => compressionTypes.some((code) => code === type));
  if (currentOrder) {
    const currentSelected = currentOrder.filter((type) => selected.includes(type));
    // Keep unchecked options in place unless the saved priority changes.
    if (currentSelected.length === selected.length && currentSelected.every((type, index) => type === selected[index])) {
      return currentOrder;
    }
  }
  return [...selected, ...compressionTypes.filter((type) => !selected.includes(type))];
}

export function createCompressionDefaults(): HTTPCompression {
  return {
    isOn: false,
    level: 5,
    useDefaultTypes: true,
    types: [...compressionTypes],
    decompressData: false,
    minLength: { count: "1", unit: "kb" },
    maxLength: { count: "32", unit: "mb" },
    mimeTypes: [
      "text/*",
      "application/javascript",
      "application/json",
      "application/atom+xml",
      "application/rss+xml",
      "application/xhtml+xml",
      "image/svg+xml",
    ],
    extensions: [".js", ".json", ".html", ".htm", ".xml", ".css", ".woff2", ".txt"],
    exceptExtensions: [".apk", ".ipa"],
    enablePartialContent: false,
    onlyURLPatterns: [],
    exceptURLPatterns: [],
  } as unknown as HTTPCompression;
}

export function createPageOptimizationDefaults(): HTTPPageOptimization {
  return {
    isPrior: false,
    html: {
      isOn: false,
      onlyURLPatterns: [],
      exceptURLPatterns: [],
      keepComments: false,
      keepConditionalComments: false,
      keepDefaultAttrVals: true,
      keepDocumentTags: true,
      keepEndTags: true,
      keepQuotes: true,
      keepWhitespace: false,
    },
    javascript: { isOn: false, onlyURLPatterns: [], exceptURLPatterns: [], precision: 0, version: 0, keepVarNames: false },
    css: { isOn: false, onlyURLPatterns: [], exceptURLPatterns: [], precision: 0, keepCSS2: true },
  } as unknown as HTTPPageOptimization;
}

export function createWebPDefaults(): WebPImage {
  return {
    isPrior: false,
    isOn: false,
    minLength: { count: "0", unit: "kb" },
    maxLength: { count: "0", unit: "kb" },
    mimeTypes: ["image/png", "image/jpeg", "image/bmp", "image/x-ico"],
    extensions: [".png", ".jpeg", ".jpg", ".bmp", ".ico"],
  } as WebPImage;
}

export function createHLSDefaults(): HLS {
  return { isPrior: false, encrypting: { isOn: false, onlyURLPatterns: [], exceptURLPatterns: [] } } as unknown as HLS;
}

export function buildContentOptimizationValues(server: Server): Server {
  const result = structuredClone(server);
  if (result.type !== "httpProxy") return result;
  const web = result.web;
  if (!web) return result;
  const compression = web.compression;
  if (!compression || (!compression.extensions?.length && !compression.mimeTypes?.length)) {
    const defaults = createCompressionDefaults();
    web.compression = {
      ...defaults,
      ...compression,
      extensions: defaults.extensions,
      mimeTypes: defaults.mimeTypes,
    };
  }
  const defaults = createPageOptimizationDefaults();
  web.optimization ??= defaults;
  web.optimization.html ??= defaults.html;
  web.optimization.javascript ??= defaults.javascript;
  web.optimization.css ??= defaults.css;
  web.webp ??= createWebPDefaults();
  web.hls ??= createHLSDefaults();
  web.hls.encrypting ??= createHLSDefaults().encrypting;
  return result;
}
