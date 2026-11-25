/**
 * Where logins and login requests are kept: one small JSON file each in a
 * private Vercel Blob store. A few stores use this, so there is no database.
 */

import { del, get, list, put } from "@vercel/blob";

export interface StoreUser {
  username: string;
  store: string;
  phone: string;
  salt: string;
  hash: string;
  active: boolean;
  createdAt: string;
}

export interface LoginRequest {
  id: string;
  name: string;
  store: string;
  phone: string;
  createdAt: string;
}

/** Lower-case letters, digits and hyphens, so it is safe as a file name. */
export const USERNAME = /^[a-z0-9][a-z0-9-]{2,29}$/;
const REQUEST_ID = /^[a-z0-9]{8,40}$/;

const userPath = (username: string) => `users/${username}.json`;
const requestPath = (id: string) => `requests/${id}.json`;

async function readJson<T>(pathname: string): Promise<T | null> {
  // Straight from storage, so a login that was just turned off stays off.
  const found = await get(pathname, { access: "private", useCache: false });
  if (!found || found.statusCode !== 200) return null;
  return (await new Response(found.stream).json()) as T;
}

async function writeJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readAll<T>(prefix: string): Promise<T[]> {
  const found: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    const items = await Promise.all(page.blobs.map((blob) => readJson<T>(blob.pathname)));
    for (const item of items) if (item) found.push(item);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found;
}

export async function getUser(username: string): Promise<StoreUser | null> {
  if (!USERNAME.test(username)) return null;
  return readJson<StoreUser>(userPath(username));
}

export async function saveUser(user: StoreUser): Promise<void> {
  await writeJson(userPath(user.username), user);
}

export async function deleteUser(username: string): Promise<void> {
  if (USERNAME.test(username)) await del(userPath(username));
}

export async function allUsers(): Promise<StoreUser[]> {
  const users = await readAll<StoreUser>("users/");
  return users.sort((a, b) => a.store.localeCompare(b.store));
}

export async function saveRequest(request: LoginRequest): Promise<void> {
  await writeJson(requestPath(request.id), request);
}

export async function deleteRequest(id: string): Promise<void> {
  if (REQUEST_ID.test(id)) await del(requestPath(id));
}

export async function allRequests(): Promise<LoginRequest[]> {
  const requests = await readAll<LoginRequest>("requests/");
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countRequests(): Promise<number> {
  const page = await list({ prefix: "requests/", limit: 1000 });
  return page.blobs.length;
}
