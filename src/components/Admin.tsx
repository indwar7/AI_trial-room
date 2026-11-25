"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/session";

interface LoginRequest {
  id: string;
  name: string;
  store: string;
  phone: string;
  createdAt: string;
}

interface StoreLogin {
  username: string;
  store: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

interface Overview {
  requests: LoginRequest[];
  users: StoreLogin[];
}

/** A login that was just made or reset, with the password to hand over. */
interface Issued {
  username: string;
  password: string;
  store: string;
  phone: string;
}

interface Draft {
  username: string;
  store: string;
  phone: string;
  requestId?: string;
}

/** Kept for this browser tab only, so a reload does not ask again. */
const KEY = "mirrorfit.admin";

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "Raymond, Kanpur" -> "raymond-kanpur" */
function suggestLoginId(store: string): string {
  return store
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

/** A 10-digit number is taken to be Indian. */
function whatsappNumber(phone: string): string {
  return phone.length === 10 ? `91${phone}` : phone;
}

function handoverMessage(issued: Issued): string {
  return [
    "Your Mirror Fit login",
    `Login ID: ${issued.username}`,
    `Password: ${issued.password}`,
    `Sign in at ${window.location.origin}`,
  ].join("\n");
}

export default function Admin() {
  const [key, setKey] = useState<string | null>(null);
  const [typedKey, setTypedKey] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function call<T>(adminKey: string, path: string, init: RequestInit = {}): Promise<T> {
    return api<T>(path, { ...init, headers: { "x-admin-key": adminKey } });
  }

  async function open(adminKey: string) {
    setBusy(true);
    setProblem(null);
    try {
      setOverview(await call<Overview>(adminKey, "/api/admin/overview"));
      setKey(adminKey);
      sessionStorage.setItem(KEY, adminKey);
    } catch (err) {
      sessionStorage.removeItem(KEY);
      setProblem(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY);
    if (saved) void open(saved);
    // Runs once, to pick up the key after a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Runs one change, then reloads both lists. */
  async function change(work: (adminKey: string) => Promise<void>) {
    if (!key || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await work(key);
      setOverview(await call<Overview>(key, "/api/admin/overview"));
    } catch (err) {
      setProblem(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function hand(next: Issued) {
    setCopied(false);
    setIssued(next);
  }

  function createLogin(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    void change(async (adminKey) => {
      hand(
        await call<Issued>(adminKey, "/api/admin/users", {
          method: "POST",
          body: JSON.stringify(draft),
        }),
      );
      setDraft(null);
    });
  }

  function resetPassword(username: string) {
    void change(async (adminKey) => {
      hand(
        await call<Issued>(adminKey, `/api/admin/users/${username}`, {
          method: "PATCH",
          body: JSON.stringify({ resetPassword: true }),
        }),
      );
    });
  }

  function setActive(username: string, active: boolean) {
    void change(async (adminKey) => {
      await call(adminKey, `/api/admin/users/${username}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
    });
  }

  function deleteLogin(username: string) {
    void change(async (adminKey) => {
      await call(adminKey, `/api/admin/users/${username}`, { method: "DELETE" });
      setDeleting(null);
    });
  }

  function dismissRequest(id: string) {
    void change(async (adminKey) => {
      await call(adminKey, `/api/admin/requests/${id}`, { method: "DELETE" });
    });
  }

  async function copyMessage() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(handoverMessage(issued));
      setCopied(true);
    } catch {
      setProblem("Copying is blocked in this browser. Select the login ID and password and copy them by hand.");
    }
  }

  function lock() {
    sessionStorage.removeItem(KEY);
    setKey(null);
    setOverview(null);
    setIssued(null);
    setDraft(null);
    setTypedKey("");
  }

  if (!key || !overview) {
    return (
      <main className="door">
        <form
          className="door__card"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void open(typedKey.trim());
          }}
        >
          <p className="eyebrow">Mirror Fit</p>
          <h1 className="door__title">Store logins</h1>
          <p className="door__lead">Enter the admin key to see requests and manage logins.</p>
          <label className="field">
            <span>Admin key</span>
            <input
              name="admin-key"
              type="password"
              value={typedKey}
              onChange={(e) => setTypedKey(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
          {problem && (
            <p className="problem" role="alert">
              {problem}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--large door__go" disabled={busy}>
            {busy ? "Opening…" : "Open"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <div className="admin__head">
        <h1>Store logins</h1>
        <button type="button" className="btn btn--quiet" onClick={lock}>
          Lock
        </button>
      </div>

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}

      {issued && (
        <section className="panel" aria-live="polite" aria-labelledby="issued-title">
          <p className="eyebrow">Hand this over</p>
          <h2 id="issued-title" className="slot__title">
            Login for {issued.store}
          </h2>
          <dl className="creds">
            <dt>Login ID</dt>
            <dd>{issued.username}</dd>
            <dt>Password</dt>
            <dd>{issued.password}</dd>
          </dl>
          <p className="admin__note">
            The password is shown only now. If it is lost, use Reset password to make a new one.
          </p>
          <div className="row__actions">
            {issued.phone && (
              <a
                className="btn btn--primary"
                href={`https://wa.me/${whatsappNumber(issued.phone)}?text=${encodeURIComponent(handoverMessage(issued))}`}
                target="_blank"
                rel="noreferrer"
              >
                Send on WhatsApp
              </a>
            )}
            <button type="button" className="btn" onClick={copyMessage}>
              {copied ? "Copied" : "Copy message"}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setIssued(null)}>
              Done
            </button>
          </div>
        </section>
      )}

      {draft && (
        <form className="panel" onSubmit={createLogin} aria-labelledby="draft-title">
          <h2 id="draft-title" className="slot__title">
            New login
          </h2>
          <div className="panel__grid">
            <label className="field">
              <span>Store name</span>
              <input
                name="store"
                value={draft.store}
                onChange={(e) => setDraft({ ...draft, store: e.target.value })}
                maxLength={80}
                required
              />
            </label>
            <label className="field">
              <span>Login ID</span>
              <input
                name="username"
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value.toLowerCase() })}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                required
              />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                maxLength={20}
              />
            </label>
          </div>
          <p className="admin__note">A password is made for you and shown on the next step.</p>
          <div className="row__actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Creating…" : "Create login"}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="admin__section" aria-labelledby="requests-title">
        <div className="admin__head">
          <h2 id="requests-title" className="slot__title">
            Login requests ({overview.requests.length})
          </h2>
        </div>
        {overview.requests.length === 0 ? (
          <p className="admin__empty">No one is waiting for a login.</p>
        ) : (
          <ul className="rows">
            {overview.requests.map((request) => (
              <li key={request.id} className="row">
                <div className="row__main">
                  <p className="row__title">{request.store}</p>
                  <p className="row__meta">
                    {request.name} · {request.phone} · {day(request.createdAt)}
                  </p>
                </div>
                <div className="row__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={busy}
                    onClick={() =>
                      setDraft({
                        username: suggestLoginId(request.store),
                        store: request.store,
                        phone: request.phone,
                        requestId: request.id,
                      })
                    }
                  >
                    Create login
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => dismissRequest(request.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin__section" aria-labelledby="logins-title">
        <div className="admin__head">
          <h2 id="logins-title" className="slot__title">
            Stores with a login ({overview.users.length})
          </h2>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => setDraft({ username: "", store: "", phone: "" })}
          >
            Add a login
          </button>
        </div>
        {overview.users.length === 0 ? (
          <p className="admin__empty">No store has a login yet.</p>
        ) : (
          <ul className="rows">
            {overview.users.map((user) => (
              <li key={user.username} className={user.active ? "row" : "row row--off"}>
                <div className="row__main">
                  <p className="row__title">
                    {user.store}
                    {!user.active && <span className="tag">Off</span>}
                  </p>
                  <p className="row__meta">
                    {user.username}
                    {user.phone && ` · ${user.phone}`} · since {day(user.createdAt)}
                  </p>
                </div>
                <div className="row__actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => resetPassword(user.username)}
                  >
                    Reset password
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => setActive(user.username, !user.active)}
                  >
                    {user.active ? "Turn off" : "Turn on"}
                  </button>
                  {deleting === user.username ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--danger"
                        disabled={busy}
                        onClick={() => deleteLogin(user.username)}
                      >
                        Yes, delete
                      </button>
                      <button type="button" className="btn btn--quiet" onClick={() => setDeleting(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--quiet"
                      disabled={busy}
                      onClick={() => setDeleting(user.username)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
