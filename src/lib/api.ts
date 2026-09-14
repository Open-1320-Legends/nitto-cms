// Thin fetch wrapper for the Nitto 1320 Legends admin backend.
// Cookie-based session (nl_admin_session) -- always send credentials, never store the cookie
// ourselves. Base URL is same-origin "/api" in production; point VITE_API_BASE_URL at
// http://localhost:8082/api for local dev against a native (non-Docker) backend.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api";

export class ApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response (network error page, etc.)
  }

  const payload = (body ?? {}) as { ok?: boolean; reason?: string };
  if (!res.ok || payload.ok === false) {
    throw new ApiError(
      payload.reason || `request failed (${res.status})`,
      res.status,
      payload.reason,
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};

// ---- admin auth ----
export type AdminSession = {
  accountId: number;
  username: string;
  roleClass: number;
  isOwner: boolean;
  canWriteCms: boolean;
  canUseStaffTools: boolean;
  accessStatus: string;
};

export type SessionResponse = {
  ok: true;
  authenticated: boolean;
  session: AdminSession | null;
  pendingCount: number;
};

export const authApi = {
  session: () => api.get<SessionResponse>("/admin/auth/session"),
  login: (username: string, password: string) =>
    api.post<SessionResponse & { accessStatus: string; isOwner: boolean }>("/admin/auth/login", {
      username,
      password,
    }),
  logout: () => api.post<{ ok: true }>("/admin/auth/logout"),
};

// ---- CMS catalog files (raw content editor) ----
export type CmsFileMeta = {
  id: number;
  seedKey: string;
  category: string;
  label: string;
  contentType: string;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CmsFile = CmsFileMeta & { content: string };

export const cmsApi = {
  list: (category?: string) =>
    api.get<{ ok: true; files: CmsFileMeta[] }>(
      `/admin/cms/files${category ? `?category=${category}` : ""}`,
    ),
  get: (id: number) => api.get<{ ok: true; file: CmsFile }>(`/admin/cms/files/${id}`),
  save: (id: number, content: string) =>
    api.put<{ ok: true; file: CmsFile }>(`/admin/cms/files/${id}`, { content }),
};

// ---- Tuning catalog (structured, field-level) ----
export type TuningCarItem = {
  id: number;
  name: string;
  modelYear: string | number;
  engineFamily: string;
  horsepower: number;
  torque: number;
  weight: number;
};

export type TuningPartItem = {
  i: number;
  n: string;
  mn: string;
  ci: string;
  pi: string;
  hp: number;
  tq: number;
  wt: number;
  p: number;
  pp: number;
};

export const tuningApi = {
  searchCars: (query = "", limit = 100) =>
    api.get<{ ok: true; type: "cars"; items: TuningCarItem[]; count: number }>(
      `/admin/tuning?type=cars&query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
  searchParts: (query = "", limit = 100) =>
    api.get<{ ok: true; type: "parts"; items: TuningPartItem[]; count: number }>(
      `/admin/tuning?type=parts&query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
};

// ---- Action approvals ----
export type ApprovalEntry = {
  id: string;
  method: string;
  path: string;
  status: "pending" | "approved" | "denied" | "canceled" | "failed";
  requestedBy: string;
  requestedRole: string;
  reason?: string;
  createdAt: string;
  decidedBy?: string;
  decidedAt?: string;
};

export const approvalsApi = {
  list: () =>
    api.get<{
      ok: true;
      pendingCount: number;
      approvals: ApprovalEntry[];
      pending: ApprovalEntry[];
      decided: ApprovalEntry[];
    }>("/admin/action-approvals"),
  approve: (id: string) =>
    api.post<{ ok: boolean }>(`/admin/action-approvals/${encodeURIComponent(id)}/approve`),
  deny: (id: string) =>
    api.post<{ ok: boolean }>(`/admin/action-approvals/${encodeURIComponent(id)}/deny`),
};
