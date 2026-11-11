import {
  BellOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DesktopOutlined,
  GlobalOutlined,
  HistoryOutlined,
  LogoutOutlined,
  SettingOutlined,
  SyncOutlined,
  TeamOutlined,
  TranslationOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuDataItem, Settings as LayoutSettings } from "@ant-design/pro-components";
import { App as AntApp, Badge, Button, Dropdown, Tooltip, message } from "antd";
import type { RequestConfig, RunTimeLayoutConfig } from "@umijs/max";
import { Link, history, request as httpRequest, setLocale, useIntl } from "@umijs/max";
import { Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";

import layoutBg1 from "./assets/layout-bg-1.webp";
import layoutBg2 from "./assets/layout-bg-2.webp";
import layoutBg3 from "./assets/layout-bg-3.webp";
import { UI_CONFIG_CACHE_KEY, clearAccessToken, getAccessToken, readCachedJSON } from "./runtime/auth";
import { applyDocumentBranding, getUIConfigDocumentTitle, getUIConfigLogoHref } from "./runtime/branding";
import {
  createRequestErrorHandler,
  createUnauthorizedHandler,
  installRequestErrorFallback,
  registerRequestError,
} from "./runtime/requestErrorFallback";
import ThemeModeSelector from "./components/ThemeModeSelector";
import type { EdgeMenuIconKey, EdgeMenuItem } from "./runtime/menuData";
import { edgeMenuData } from "./runtime/menuData";
import { getRouteMenuOpenKey, reconcileMenuOpenKeys } from "./runtime/menuNavigation";
import { SUPPORTED_PANEL_LOCALES, getLocaleLabel, normalizePanelLocale } from "./runtime/i18n";
import { getCachedUIConfig, useAdminProfileQuery, useGlobalTaskSummaryQuery, useShellUIConfigQuery } from "./runtime/shellQueries";
import useThemeStore from "./stores/themeStore";

const NodeTaskModal = lazy(() => import("./components/GlobalTasks").then((module) => ({ default: module.NodeTaskModal })));
const DNSTaskModal = lazy(() => import("./components/GlobalTasks").then((module) => ({ default: module.DNSTaskModal })));
const MessageModal = lazy(() => import("./components/GlobalTasks").then((module) => ({ default: module.MessageModal })));
const Profile = lazy(() => import("./pages/admins/_shared/Profile"));
const AIAgentLauncher = lazy(() => import("./components/AIAgent"));

type EdgeInitialState = {
  uiConfig?: ReturnType<typeof getCachedUIConfig>;
  isDarkMode: boolean;
  isMenuCollapsed: boolean;
  menuOpenKeys: string[];
  settings: Partial<LayoutSettings>;
};

type SetEdgeInitialState = (updater: (state: EdgeInitialState | undefined) => EdgeInitialState | undefined) => void;
type RequestInterceptorTuple = NonNullable<NonNullable<RequestConfig["requestInterceptors"]>[number]>;

const layoutSettings: Partial<LayoutSettings> = {
  layout: "mix",
  splitMenus: false,
  fixedHeader: true,
  fixSiderbar: true,
  contentWidth: "Fluid",
};

const defaultMenuOpenKeys = ["servers"];

const menuIcons: Record<EdgeMenuIconKey, ReactNode> = {
  dashboard: <DashboardOutlined />,
  servers: <DesktopOutlined />,
  clusters: <ClusterOutlined />,
  dns: <GlobalOutlined />,
  admins: <TeamOutlined />,
  logs: <HistoryOutlined />,
  settings: <SettingOutlined />,
};

function buildMenuData(items: readonly EdgeMenuItem[]): MenuDataItem[] {
  return items.map(({ children, iconKey, ...item }) => ({
    ...item,
    icon: iconKey ? menuIcons[iconKey] : undefined,
    children: children ? buildMenuData(children) : undefined,
  }));
}

const menuData: MenuDataItem[] = buildMenuData(edgeMenuData);

function getProfileDisplayName(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    return "Profile";
  }

  const responseLike = data as { admin?: { fullname?: string; username?: string } };
  const fullname = responseLike.admin?.fullname?.trim();
  if (fullname) {
    return fullname;
  }

  const username = responseLike.admin?.username?.trim();
  return username || "Profile";
}

function getCurrentPathname(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return "/";
  }

  const [pathname] = hash.split("?");
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function ShellRuntimeSync({ setInitialState }: { setInitialState: SetEdgeInitialState }) {
  const uiConfigQuery = useShellUIConfigQuery();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    const uiConfig = uiConfigQuery.data?.ui;
    if (!uiConfig) {
      return;
    }

    setInitialState((state) => {
      if (!state || state.uiConfig === uiConfig) {
        return state;
      }

      return {
        ...state,
        uiConfig,
      };
    });
  }, [setInitialState, uiConfigQuery.data?.ui]);

  useEffect(() => {
    setInitialState((state) => {
      if (!state || state.isDarkMode === isDarkMode) {
        return state;
      }

      return {
        ...state,
        isDarkMode,
      };
    });
  }, [isDarkMode, setInitialState]);

  return null;
}

function ShellActions() {
  const intl = useIntl();
  const profileQuery = useAdminProfileQuery();
  const taskSummaryQuery = useGlobalTaskSummaryQuery();
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [dnsModalOpen, setDnsModalOpen] = useState(false);
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const profileDisplayName = getProfileDisplayName(profileQuery.data);
  const currentLocale = normalizePanelLocale(intl.locale);

  const handleLogout = async () => {
    try {
      await httpRequest("/api/admin/logout", { method: "POST", skipErrorHandler: true });
    } catch {
      // ignore logout errors
    } finally {
      clearAccessToken();
      applyDocumentBranding(readCachedJSON(window.localStorage, UI_CONFIG_CACHE_KEY));
      history.replace("/login");
    }
  };

  const taskSummary = taskSummaryQuery.data;

  return (
    <>
      <Tooltip title="节点同步" key="node-sync">
        <Button
          type="text"
          icon={
            <SyncOutlined
              spin={taskSummary?.hasNodeTasks}
              style={{ color: taskSummary?.nodeTaskError ? "#ff4d4f" : taskSummary?.hasNodeTasks ? "#1890ff" : undefined }}
            />
          }
          onClick={() => setNodeModalOpen(true)}
        />
      </Tooltip>
      <Tooltip title="DNS同步" key="dns-sync">
        <Button
          type="text"
          icon={
            <GlobalOutlined
              spin={taskSummary?.hasDNSTasks}
              style={{ color: taskSummary?.dnsTaskError ? "#ff4d4f" : taskSummary?.hasDNSTasks ? "#1890ff" : undefined }}
            />
          }
          onClick={() => setDnsModalOpen(true)}
        />
      </Tooltip>
      <Tooltip title="消息" key="messages">
        <Badge count={taskSummary?.unreadMessageCount || 0} size="small" offset={[-5, 5]}>
          <Button type="text" icon={<BellOutlined />} onClick={() => setMsgModalOpen(true)} />
        </Badge>
      </Tooltip>
      <ThemeModeSelector key="theme" />
      <Dropdown
        key="locale-switcher"
        trigger={["click"]}
        menu={{
          selectable: true,
          selectedKeys: [currentLocale],
          items: SUPPORTED_PANEL_LOCALES.map((locale) => ({ key: locale, label: getLocaleLabel(locale) })),
          onClick: ({ key }) => {
            const nextLocale = normalizePanelLocale(String(key));
            if (nextLocale !== currentLocale) {
              setLocale(nextLocale, false);
            }
          },
        }}
      >
        <Tooltip title={getLocaleLabel(currentLocale)}>
          <Button type="text" icon={<TranslationOutlined />} aria-label={`Language ${getLocaleLabel(currentLocale)}`} />
        </Tooltip>
      </Dropdown>
      <Dropdown
        key="user-menu"
        menu={{
          items: [
            { key: "profile", icon: <UserOutlined />, label: profileDisplayName },
            { type: "divider" },
            { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
          ],
          onClick: ({ key }) => {
            if (key === "profile") {
              setProfileModalOpen(true);
            }

            if (key === "logout") {
              void handleLogout();
            }
          },
        }}
      >
        <Button type="text" icon={<UserOutlined />} aria-label="用户菜单" />
      </Dropdown>
      <Suspense fallback={null}>
        {nodeModalOpen ? <NodeTaskModal open={nodeModalOpen} onClose={() => setNodeModalOpen(false)} /> : null}
        {dnsModalOpen ? <DNSTaskModal open={dnsModalOpen} onClose={() => setDnsModalOpen(false)} /> : null}
        {msgModalOpen ? <MessageModal open={msgModalOpen} onClose={() => setMsgModalOpen(false)} /> : null}
        {profileModalOpen ? (
          <Profile open={profileModalOpen} onClose={() => setProfileModalOpen(false)} onDisplayNameChange={() => void profileQuery.refetch()} />
        ) : null}
      </Suspense>
    </>
  );
}

function extractRequestErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { data?: { message?: string }; response?: { statusText?: string } }).data?.message;
    if (maybeMessage) {
      return maybeMessage;
    }

    const statusText = (error as { response?: { statusText?: string } }).response?.statusText;
    if (statusText) {
      return statusText;
    }
  }

  return "请求失败";
}

export async function getInitialState(): Promise<EdgeInitialState> {
  const routeMenuKey = getRouteMenuOpenKey(getCurrentPathname());

  return {
    uiConfig: typeof window !== "undefined" ? readCachedJSON(window.localStorage, UI_CONFIG_CACHE_KEY) : undefined,
    isDarkMode: useThemeStore.getState().isDarkMode,
    isMenuCollapsed: false,
    menuOpenKeys: reconcileMenuOpenKeys([], defaultMenuOpenKeys, routeMenuKey),
    settings: layoutSettings,
  };
}

const authRequestInterceptor = ((url: string, config: Record<string, unknown>) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return { url, options: config };
  }

  const headers = typeof config.headers === "object" && config.headers !== null ? (config.headers as Record<string, string>) : {};

  return {
    url,
    options: {
      ...config,
      headers: {
        ...headers,
        Authorization: accessToken,
      },
    },
  };
}) as RequestInterceptorTuple;

const handleUnauthorized = createUnauthorizedHandler({
  getAccessToken,
  getPathname: getCurrentPathname,
  clearAccessToken,
  applyBranding: () => {
    if (typeof window !== "undefined") {
      applyDocumentBranding(readCachedJSON(window.localStorage, UI_CONFIG_CACHE_KEY));
    }
  },
  redirectToLogin: () => history.replace("/login"),
});

installRequestErrorFallback((error) => {
  message.error(extractRequestErrorMessage(error));
});

export const request: RequestConfig = {
  errorConfig: {
    errorHandler: createRequestErrorHandler({ onUnauthorized: handleUnauthorized, register: registerRequestError }),
  },
  requestInterceptors: [authRequestInterceptor],
};

export const reactQuery = {
  queryClient: {
    defaultOptions: {
      queries: {
        // staleTime: 60_000,
        // gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  },
};

export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  const updateInitialState = setInitialState as SetEdgeInitialState;
  const pathname = getCurrentPathname();
  const routeMenuKey = getRouteMenuOpenKey(pathname);
  const selectedKeys = [pathname];
  const isMenuCollapsed = Boolean(initialState?.isMenuCollapsed);
  const openKeys = reconcileMenuOpenKeys(initialState?.menuOpenKeys ?? [], initialState?.menuOpenKeys ?? [], routeMenuKey);

  return {
    title: getUIConfigDocumentTitle(initialState?.uiConfig),
    logo: getUIConfigLogoHref(initialState?.uiConfig),
    pageTitleRender: false,
    breadcrumbRender: false,
    route: {
      path: "/",
      routes: menuData,
    },
    navTheme: initialState?.isDarkMode ? "realDark" : "light",
    menuItemRender: (item: MenuDataItem, dom: ReactNode) => <Link to={item.path || "/"}>{dom}</Link>,
    collapsed: isMenuCollapsed,
    onCollapse: (collapsed) => {
      updateInitialState((state) => {
        if (!state || state.isMenuCollapsed === collapsed) {
          return state;
        }

        return {
          ...state,
          isMenuCollapsed: collapsed,
        };
      });
    },
    menuProps: isMenuCollapsed
      ? {
          selectedKeys,
        }
      : {
          selectedKeys,
          openKeys,
          onOpenChange: (nextOpenKeys: string[]) => {
            updateInitialState((state) => {
              if (!state) {
                return state;
              }

              const next = reconcileMenuOpenKeys(state.menuOpenKeys, nextOpenKeys, routeMenuKey);
              if (next === state.menuOpenKeys) {
                return state;
              }

              return {
                ...state,
                menuOpenKeys: next,
              };
            });
          },
        },
    actionsRender: () => [<ShellActions key="shell-actions" />],
    bgLayoutImgList: [
      {
        src: layoutBg1,
        left: 85,
        bottom: 100,
        height: "303px",
      },
      {
        src: layoutBg2,
        bottom: -68,
        right: -45,
        height: "303px",
      },
      {
        src: layoutBg3,
        bottom: 0,
        left: 0,
        width: "331px",
      },
    ],
    menuHeaderRender: undefined,
    onPageChange: () => {
      const currentPath = getCurrentPathname();
      const nextRouteMenuKey = getRouteMenuOpenKey(currentPath);

      updateInitialState((state) => {
        if (!state) {
          return state;
        }

        const next = reconcileMenuOpenKeys(state.menuOpenKeys, state.menuOpenKeys, nextRouteMenuKey);
        if (next === state.menuOpenKeys) {
          return state;
        }

        return {
          ...state,
          menuOpenKeys: next,
        };
      });
    },
    childrenRender: (children) => (
      <AntApp>
        <ShellRuntimeSync setInitialState={updateInitialState} />
        {children}
        <Suspense fallback={null}>
          <AIAgentLauncher />
        </Suspense>
      </AntApp>
    ),
    ...initialState?.settings,
  };
};
