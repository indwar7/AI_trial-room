import { hashPassword, issueSession, safeEqual } from "@/lib/server/auth";
import { json, preflight, readBody, text } from "@/lib/server/http";
import { getUser } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export async function POST(request: Request): Promise<Response> {
  const data = await readBody(request);
  const username = text(data.username, 40).toLowerCase();
  const password = text(data.password, 100);
  if (!username || !password) {
    return json(request, { error: "Enter your login ID and password." }, 400);
  }

  const user = await getUser(username);
  // Hashed even for an unknown login ID, so both cases take the same time.
  const hash = hashPassword(password, user?.salt ?? "no-such-login");
  if (!user || !safeEqual(hash, user.hash)) {
    return json(request, { error: "Wrong login ID or password." }, 401);
  }
  if (!user.active) {
    return json(request, { error: "This login has been turned off. Contact us to turn it back on." }, 403);
  }
  return json(request, { token: issueSession(user), username: user.username, store: user.store });
}
