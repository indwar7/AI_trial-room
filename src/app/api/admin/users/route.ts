import { hashPassword, isAdmin, newPassword, newSalt } from "@/lib/server/auth";
import { json, notAllowed, phoneDigits, preflight, readBody, text } from "@/lib/server/http";
import { USERNAME, deleteRequest, getUser, saveUser } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

/** Creates a login and returns its password, which is not shown again. */
export async function POST(request: Request): Promise<Response> {
  if (!isAdmin(request)) return notAllowed(request);
  const data = await readBody(request);
  const username = text(data.username, 40).toLowerCase();
  const store = text(data.store, 80);
  const phone = phoneDigits(data.phone);
  const requestId = text(data.requestId, 40);

  if (!USERNAME.test(username)) {
    return json(
      request,
      { error: "A login ID is 3 to 30 small letters, numbers or hyphens, like raymond-kanpur." },
      400,
    );
  }
  if (store.length < 2) return json(request, { error: "Enter the store's name." }, 400);
  if (await getUser(username)) {
    return json(request, { error: "That login ID is already taken. Choose another." }, 409);
  }

  const password = newPassword();
  const salt = newSalt();
  await saveUser({
    username,
    store,
    phone,
    salt,
    hash: hashPassword(password, salt),
    active: true,
    createdAt: new Date().toISOString(),
  });
  if (requestId) await deleteRequest(requestId);
  return json(request, { username, password, store, phone });
}
