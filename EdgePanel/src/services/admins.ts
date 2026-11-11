import { request } from "@umijs/max";

import { getOffset, getPage, getSize, searchParamsToObject } from "./searchParams";

export async function listLogs(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const offset = getOffset(page, size);
  const params = searchParamsToObject(searchParams);

  return request("/api/logs", {
    params: { ...params, offset, size },
  });
}

export async function listAdmins(searchParams: URLSearchParams) {
  const page = getPage(searchParams);
  const size = getSize(searchParams);
  const keyword = searchParams.get("keyword") || "";
  const offset = getOffset(page, size);

  return request("/api/admins", {
    params: { offset, size, keyword },
  });
}
