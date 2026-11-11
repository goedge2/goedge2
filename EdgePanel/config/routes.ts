export default [
  {
    path: "/login",
    layout: false,
    component: "./Login",
  },
  {
    path: "/",
    wrappers: ["@/wrappers/AuthGuard"],
    routes: [
      {
        path: "/servers/settings/:serverId",
        redirect: "/servers/:serverId/settings",
      },
      {
        path: "/clusters/settings/:clusterId",
        redirect: "/clusters/:clusterId/settings",
      },
      {
        path: "/nodes/settings/:nodeId",
        redirect: "/clusters/nodes/:nodeId/settings",
      },
      {
        path: "/settings",
        redirect: "/settings/ui",
      },
      {
        path: "/settings/adv",
        redirect: "/settings/api-nodes",
      },
      {
        path: "/",
        component: "./dashboard/index",
      },
      {
        path: "/servers",
        component: "./servers/index",
      },
      {
        path: "/servers/create",
        component: "./servers/create",
      },
      {
        path: "/servers/:serverId/dashboard",
        component: "./servers/dashboard",
      },
      {
        path: "/servers/:serverId/stats",
        component: "./servers/stats",
      },
      {
        path: "/servers/:serverId/accesslogs",
        component: "./servers/accesslogs-detail",
      },
      {
        path: "/servers/:serverId/settings",
        component: "./servers/settings",
      },
      {
        path: "/servers/accesslogs",
        component: "./servers/accesslogs",
      },
      {
        path: "/servers/groups",
        component: "./servers/groups",
      },
      {
        path: "/servers/certs",
        component: "./servers/certs",
      },
      {
        path: "/servers/cache-policies",
        component: "./servers/cache-policies/index",
      },
      {
        path: "/servers/cache-policies/:id",
        component: "./servers/cache-policies/detail",
      },
      {
        path: "/servers/cache-task",
        component: "./servers/cache-task/layout",
        routes: [
          {
            path: "/servers/cache-task",
            component: "./servers/cache-task/purge",
          },
          {
            path: "/servers/cache-task/fetch",
            component: "./servers/cache-task/fetch",
          },
          {
            path: "/servers/cache-task/all",
            component: "./servers/cache-task/all",
          },
        ],
      },
      {
        path: "/servers/metrics",
        component: "./servers/metrics/index",
      },
      {
        path: "/servers/metrics/:id",
        component: "./servers/metrics/detail",
      },
      {
        path: "/servers/waf/policies",
        component: "./servers/waf-policies",
      },
      {
        path: "/servers/waf/policy/:policyId",
        component: "./servers/waf-policy-settings",
      },
      {
        path: "/servers/ip-lists",
        component: "./servers/ip-items",
      },
      {
        path: "/servers/ip-lists/blacklist",
        component: "./servers/ip-lists/blacklist",
      },
      {
        path: "/servers/ip-lists/whitelist",
        component: "./servers/ip-lists/whitelist",
      },
      {
        path: "/clusters",
        component: "./clusters/index",
      },
      {
        path: "/clusters/create",
        component: "./clusters/create",
      },
      {
        path: "/clusters/:clusterId/dashboard",
        component: "./clusters/dashboard",
      },
      {
        path: "/clusters/:clusterId/nodes",
        component: "./clusters/cluster-nodes",
      },
      {
        path: "/clusters/:clusterId/settings",
        component: "./clusters/settings",
      },
      {
        path: "/clusters/node-regions",
        component: "./clusters/node-regions",
      },
      {
        path: "/clusters/nodes",
        component: "./clusters/nodes",
      },
      {
        path: "/clusters/node/create",
        component: "./clusters/node-create",
      },
      {
        path: "/clusters/nodes/:nodeId/dashboard",
        component: "./clusters/node-dashboard",
      },
      {
        path: "/clusters/nodes/:nodeId/details",
        component: "./clusters/node-details",
      },
      {
        path: "/clusters/nodes/:nodeId/logs",
        component: "./clusters/node-logs-detail",
      },
      {
        path: "/clusters/nodes/:nodeId/install",
        component: "./clusters/node-install",
      },
      {
        path: "/clusters/nodes/:nodeId/settings",
        component: "./clusters/node-settings",
      },
      {
        path: "/clusters/node-logs",
        component: "./clusters/node-logs",
      },
      {
        path: "/clusters/node-grants",
        component: "./clusters/node-grants/index",
      },
      {
        path: "/clusters/node-grants/create",
        component: "./clusters/node-grants/create",
      },
      {
        path: "/clusters/node-grants/:id",
        component: "./clusters/node-grants/detail",
      },
      {
        path: "/clusters/monitor",
        component: "./clusters/monitor/layout",
        routes: [
          {
            path: "/clusters/monitor",
            component: "./clusters/monitor/index",
          },
          {
            path: "/clusters/monitor/groups",
            component: "./clusters/monitor/groups",
          },
          {
            path: "/clusters/monitor/settings",
            component: "./clusters/monitor/settings",
          },
          {
            path: "/clusters/monitor/nodes/:id",
            component: "./clusters/monitor/detail",
          },
        ],
      },
      {
        path: "/dns/providers",
        component: "./dns/providers",
      },
      {
        path: "/dns/provider/:providerId/domains",
        component: "./dns/domains",
      },
      {
        path: "/logs",
        component: "./logs/index",
      },
      {
        path: "/admins",
        component: "./admins/index",
      },
      {
        path: "/admins/recipients",
        component: "./admins/recipients/layout",
        routes: [
          {
            path: "/admins/recipients",
            component: "./admins/recipients/index",
          },
          {
            path: "/admins/recipients/groups",
            component: "./admins/recipients/groups",
          },
          {
            path: "/admins/recipients/media",
            component: "./admins/recipients/media",
          },
          {
            path: "/admins/recipients/logs",
            component: "./admins/recipients/logs",
          },
          {
            path: "/admins/recipients/tasks",
            component: "./admins/recipients/tasks",
          },
        ],
      },
      {
        path: "/settings/ui",
        component: "./settings/admin-ui",
      },
      {
        path: "/settings/user-ui",
        component: "./settings/user-ui",
      },
      {
        path: "/settings/security",
        component: "./settings/security",
      },
      {
        path: "/settings/updates",
        component: "./settings/updates",
      },
      {
        path: "/settings/ai-agent",
        component: "./settings/ai-agent",
      },
      {
        path: "/settings/api-nodes",
        component: "./settings/api-nodes",
      },
      {
        path: "/settings/access-log-nodes",
        component: "./settings/access-log-db",
      },
      {
        path: "/settings/db-cleanup",
        component: "./settings/database-cleanup",
      },
    ],
  },
  {
    path: "/*",
    layout: false,
    component: "./NotFound",
  },
];
