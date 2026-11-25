import { readSession, sessionStillGood } from "@/lib/server/auth";
import { json, preflight } from "@/lib/server/http";
import { getUser } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Tells the app whether a saved sign-in is still good. */
export async function GET(request: Request): Promise<Response> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const session = token ? readSession(token) : null;
  const user = session ? await getUser(session.username) : null;
  if (!session || !sessionStillGood(user, session.mark)) {
    return json(request, { error: "Sign in again." }, 401);
  }
  return json(request, { username: user.username, store: user.store });
}
