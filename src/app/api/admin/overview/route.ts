import { isAdmin } from "@/lib/server/auth";
import { json, notAllowed, preflight } from "@/lib/server/http";
import { allRequests, allUsers } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Everything the admin page shows: waiting requests and existing logins. */
export async function GET(request: Request): Promise<Response> {
  if (!isAdmin(request)) return notAllowed(request);
  const [requests, users] = await Promise.all([allRequests(), allUsers()]);
  return json(request, {
    requests,
    users: users.map(({ username, store, phone, active, createdAt }) => ({
      username,
      store,
      phone,
      active,
      createdAt,
    })),
  });
}
