/**
 * Typed fetch wrapper for ZypherCenter API calls.
 *
 * All calls hit /api/proxmox/* which the Fastify proxy forwards to Proxmox,
 * injecting auth credentials server-side. The browser never sees the
 * Proxmox PVEAuthCookie or CSRFPreventionToken.
 */

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/proxmox/${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (response.status === 401) {
    // Session expired — redirect to login
    window.location.href = '/login'
    throw new APIError(401, 'Session expired')
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {}
    throw new APIError(
      response.status,
      (body as { errors?: string; message?: string })?.errors ??
        (body as { message?: string })?.message ??
        `Request failed with status ${response.status}`,
      body,
    )
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', signal }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  del: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}
