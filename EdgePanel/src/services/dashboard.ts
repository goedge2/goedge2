import { request } from "@umijs/max";

export async function getDashboardData() {
  return request("/api/admin/dashboard");
}
