import { join } from "node:path";

import { defineConfig } from "@umijs/max";

import routes from "./routes";

const proxyTarget = process.env.EDGE_PANEL_PROXY_TARGET || "http://127.0.0.1:7001";

export default defineConfig({
  history: {
    type: "hash",
  },
  hash: true,
  routes,
  proxy: {
    "/api": {
      target: proxyTarget,
      changeOrigin: true,
    },
    "/file": {
      target: proxyTarget,
      changeOrigin: true,
    },
  },
  utoopack: {},
  model: {},
  initialState: {},
  access: {},
  request: {},
  layout: {},
  reactQuery: {},
  locale: {
    default: "zh-CN",
    antd: true,
    baseNavigator: false,
  },
  antd: {
    appConfig: {},
  },
  mock: {
    include: ["src/pages/**/_mock.ts"],
  },
  tailwindcss: {},
  alias: {
    "@": join(__dirname, "..", "src"),
    "@root": join(__dirname, ".."),
  },
});
