// Small fetch wrapper: adds the JWT, turns API errors into readable messages.
const TOKEN_KEY = "et_token";

// Where the backend lives.
//  - Local dev / same server: leave VITE_API_BASE_URL empty, calls go to /api on the same site.
//  - Vercel: set VITE_API_BASE_URL=https://your-backend-server (no trailing slash) in Vercel settings.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, detail) {
    const msg = typeof detail === "string" ? detail : detail?.message || (Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : "Request failed");
    super(msg);
    this.status = status;
    this.detail = detail;
  }
}

export async function api(path, { method = "GET", body, form, params } = {}) {
  const url = new URL(API_BASE + "/api" + path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== "" && url.searchParams.set(k, v));
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  if (res.status === 401 && path !== "/auth/login") {
    setToken(null);
    window.location.href = "/login";
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : res;
  if (!res.ok) throw new ApiError(res.status, isJson ? data.detail : res.statusText);
  return data;
}

// Downloads a protected file (needs the auth header, so a plain <a href> won't work)
export async function download(path, params, fallbackName = "download") {
  const res = await api(path, { params });
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const name = decodeURIComponent((cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/) || [])[1] || fallbackName);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const inr = (n, d = 0) =>
  n === null || n === undefined ? "" : "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

export const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};
