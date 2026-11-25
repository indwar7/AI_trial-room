import { hashPassword, isAdmin, newPassword, newSalt } from "@/lib/server/auth";
import { json, notAllowed, preflight, readBody } from "@/lib/server/http";
import { deleteUser, getUser, saveUser } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Context = { params: Promise<{ username: string }> };

/** Turns a login on or off, or gives it a new password. */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  if (!isAdmin(request)) return notAllowed(request);
  const { username } = await params;
  const user = await getUser(username);
  if (!user) return json(request, { error: "That login no longer exists." }, 404);

  const data = await readBody(request);
  let password: string | undefined;
  if (typeof data.active === "boolean") user.active = data.active;
  if (data.resetPassword === true) {
    password = newPassword();
    user.salt = newSalt();
    user.hash = hashPassword(password, user.salt);
  }
  await saveUser(user);
  return json(request, {
    username: user.username,
    store: user.store,
    phone: user.phone,
    active: user.active,
    password,
  });
}

export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  if (!isAdmin(request)) return notAllowed(request);
  const { username } = await params;
  await deleteUser(username);
  return json(request, { ok: true });
}
