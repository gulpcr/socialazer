export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/v1";

type ReqOpts = { headers?: Record<string, string>; signal?: AbortSignal };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {}
    const err: any = new Error("API request failed");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return null as unknown as T;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

export const api = {
  get: async <T = any>(path: string, opts?: ReqOpts) =>
    request<T>(path, {
      method: "GET",
      headers: opts?.headers,
      signal: opts?.signal,
    }),

  post: async <T = any, B = any>(path: string, body?: B, opts?: ReqOpts) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
    }),

  put: async <T = any, B = any>(path: string, body?: B, opts?: ReqOpts) =>
    request<T>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: opts?.signal,
    }),

  delete: async <T = any>(path: string, opts?: ReqOpts) =>
    request<T>(path, {
      method: "DELETE",
      headers: opts?.headers,
      signal: opts?.signal,
    }),

  upload: async <T = any>(
    path: string,
    formData: FormData,
    opts?: { signal?: AbortSignal }
  ) => {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: opts?.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {}
      const err: any = new Error("Upload failed");
      err.status = res.status;
      err.body = body;
      throw err;
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return res.json();
    return (await res.text()) as unknown as T;
  },
};

export default api;
