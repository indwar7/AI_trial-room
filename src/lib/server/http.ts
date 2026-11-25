/** Small helpers shared by the API routes. */

/** The phone apps load their pages from these addresses and call the API across origins. */
const APP_ORIGINS = new Set(["https://localhost", "capacitor://localhost"]);

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !APP_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { ...cors(request), "Cache-Control": "no-store" },
  });
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** A trimmed string no longer than `max`, or "" for anything that is not a string. */
export function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Digits only, 8 to 15 of them, or "" when it is not a phone number. */
export function phoneDigits(value: unknown): string {
  const digits = text(value, 30).replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

export function notAllowed(request: Request): Response {
  return json(request, { error: "Wrong admin key." }, 401);
}
