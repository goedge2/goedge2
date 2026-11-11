import { getAccessToken } from "./runtime/auth";

export default function access() {
  return {
    canAccessConsole: Boolean(getAccessToken()),
  };
}
