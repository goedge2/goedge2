import { Navigate, Outlet } from "@umijs/max";

import { getAccessToken } from "../runtime/auth";

export default function AuthGuard() {
  const hasToken = Boolean(getAccessToken());

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
