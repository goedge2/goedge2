import { useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { shellQueryKeys } from "../queries/keys";
import type { UIConfig } from "../pb/service_sys_setting_pb";
import { getDefaultPageSize } from "../services/pagination";
import {
  EMPTY_GLOBAL_TASK_SUMMARY,
  type GlobalTaskSummary,
  mergeGlobalTaskSummaryEvent,
  readAdminProfile,
  readShellUIConfig,
  subscribeEvents,
} from "../services/shell";
import { UI_CONFIG_CACHE_KEY, getAccessToken, readCachedJSON, writeCachedJSON } from "./auth";
import { applyDocumentBranding } from "./branding";

const TASK_SUMMARY_QUERY_KEY = shellQueryKeys.taskSummary();

export function getCachedUIConfig(): UIConfig | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return readCachedJSON<UIConfig>(window.localStorage, UI_CONFIG_CACHE_KEY);
}

export function useDefaultPageSize(): number {
  const query = useShellUIConfigQuery();
  return getDefaultPageSize(query.data?.ui ?? getCachedUIConfig());
}

export function useShellUIConfigQuery() {
  const query = useQuery({
    queryKey: shellQueryKeys.uiConfig(),
    queryFn: readShellUIConfig,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !query.data?.ui) {
      return;
    }

    applyDocumentBranding(query.data.ui);
    writeCachedJSON(window.localStorage, UI_CONFIG_CACHE_KEY, query.data.ui);
  }, [query.data?.ui]);

  return query;
}

export function useAdminProfileQuery() {
  return useQuery({
    queryKey: shellQueryKeys.adminProfile(),
    queryFn: readAdminProfile,
    enabled: Boolean(getAccessToken()),
    refetchOnWindowFocus: false,
  });
}

export function useGlobalTaskSummaryQuery() {
  const queryClient = useQueryClient();
  const accessToken = getAccessToken();
  const enabled = Boolean(accessToken);

  const query = useQuery({
    queryKey: TASK_SUMMARY_QUERY_KEY,
    queryFn: async () => {
      return queryClient.getQueryData<GlobalTaskSummary>(TASK_SUMMARY_QUERY_KEY) ?? EMPTY_GLOBAL_TASK_SUMMARY;
    },
    enabled,
    initialData: () => {
      return queryClient.getQueryData<GlobalTaskSummary>(TASK_SUMMARY_QUERY_KEY) ?? EMPTY_GLOBAL_TASK_SUMMARY;
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(() => {
    if (!accessToken) {
      queryClient.setQueryData<GlobalTaskSummary>(TASK_SUMMARY_QUERY_KEY, EMPTY_GLOBAL_TASK_SUMMARY);
      return undefined;
    }

    const eventSource = subscribeEvents({
      token: accessToken,
      onEvent(event) {
        if (event.type === "ping") {
          return;
        }

        queryClient.setQueryData<GlobalTaskSummary>(TASK_SUMMARY_QUERY_KEY, (current) => {
          return mergeGlobalTaskSummaryEvent(current ?? EMPTY_GLOBAL_TASK_SUMMARY, event);
        });
      },
    });

    return () => {
      eventSource?.close();
    };
  }, [accessToken, queryClient]);

  return query;
}
