/** The signed-in store, remembered on this device, and the calls to our own server. */

export interface Session {
  token: string;
  username: string;
  store: string;
}

/** Empty on the website. The phone apps set it to the website's address. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const KEY = "mirrorfit.session";

/** A refusal from our server, with a message that is safe to show. Status 0 means it was not reached. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your internet connection and try again.", 0);
  }
  const data = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Something went wrong. Try again.",
      response.status,
    );
  }
  return data as T;
}

export function loadSession(): Session | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Session> | null;
    if (saved && typeof saved.token === "string" && typeof saved.username === "string" && typeof saved.store === "string") {
      return { token: saved.token, username: saved.username, store: saved.store };
    }
  } catch {
    // Private browsing, or a damaged entry: treated as signed out.
  }
  return null;
}

function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // The sign-in then lasts until the page is closed.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing was saved.
  }
}

export async function signIn(username: string, password: string): Promise<Session> {
  const session = await api<Session>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveSession(session);
  return session;
}

/**
 * Asks the server whether a remembered sign-in is still good. Only the
 * server's own "no" ends it: a lost connection does not sign anyone out.
 */
export async function checkSession(session: Session): Promise<Session | "ended"> {
  try {
    const fresh = await api<{ username: string; store: string }>("/api/session", {
      headers: { authorization: `Bearer ${session.token}` },
    });
    const current = { ...session, ...fresh };
    saveSession(current);
    return current;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearSession();
      return "ended";
    }
    return session;
  }
}

export async function requestLogin(details: {
  name: string;
  store: string;
  phone: string;
  website: string;
}): Promise<void> {
  await api("/api/request-login", { method: "POST", body: JSON.stringify(details) });
}
