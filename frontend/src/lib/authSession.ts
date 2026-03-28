export const AUTH_STORE_KEY = "sams-auth-v2";
export const PORTAL_TYPE_KEY = "sams_portal_type";
export const TAB_USER_KEY = "sams_tab_user_key";
export const ACTIVE_USER_KEY_COOKIE = "sams_active_user_key";

type SessionUser = {
  id?: string | null;
  agencyId?: string | null;
  agencySlug?: string | null;
  employeeId?: string | null;
  role?: string | null;
};

export function buildSessionUserKey(user: SessionUser | null | undefined) {
  if (!user?.id) return null;

  return [
    user.id,
    user.agencySlug || user.agencyId || "global",
    user.employeeId || "no-employee",
    user.role || "no-role",
  ].join(":");
}

export function setCookie(name: string, value: string, maxAgeSeconds = 86400) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

export function setActiveSessionUser(user: SessionUser | null | undefined) {
  const key = buildSessionUserKey(user);
  if (!key) {
    clearCookie(ACTIVE_USER_KEY_COOKIE);
    return null;
  }

  setCookie(ACTIVE_USER_KEY_COOKIE, key);
  return key;
}

export function getActiveSessionUserKey() {
  return getCookie(ACTIVE_USER_KEY_COOKIE);
}

export function setTabSessionUser(user: SessionUser | null | undefined) {
  if (typeof window === "undefined") return null;

  const key = buildSessionUserKey(user);
  if (!key) {
    sessionStorage.removeItem(TAB_USER_KEY);
    return null;
  }

  sessionStorage.setItem(TAB_USER_KEY, key);
  return key;
}

export function getTabSessionUserKey() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TAB_USER_KEY);
}

export function clearTabSessionStorage() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(PORTAL_TYPE_KEY);
  sessionStorage.removeItem(TAB_USER_KEY);
  sessionStorage.removeItem(AUTH_STORE_KEY);
  localStorage.removeItem(AUTH_STORE_KEY);
}

export function hasSessionConflict(expectedUserKey?: string | null, activeUserKey?: string | null) {
  return Boolean(expectedUserKey && activeUserKey && expectedUserKey !== activeUserKey);
}

export function getPortalLoginPath(pathname: string, agencySlug?: string | null, portalType?: string | null) {
  if (pathname.startsWith("/admin")) {
    return "/admin/login";
  }

  if (!agencySlug) {
    const [, slug] = pathname.split("/");
    agencySlug = slug || null;
  }

  if (!agencySlug) {
    return "/";
  }

  const isStaffPath = pathname.includes("/staff") || pathname.includes("/my-schedule");
  if (portalType === "staff" || isStaffPath) {
    return `/${agencySlug}/staff-login`;
  }

  return `/${agencySlug}/login`;
}
