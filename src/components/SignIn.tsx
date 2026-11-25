"use client";

import { useState, type FormEvent } from "react";
import { requestLogin, signIn, type Session } from "@/lib/session";

type View = "signin" | "request" | "sent";

interface Props {
  /** Why the person is being asked to sign in again, when there is a reason. */
  notice?: string;
  onSignedIn: (session: Session) => void;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

export default function SignIn({ notice, onSignedIn }: Props) {
  const [view, setView] = useState<View>("signin");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  function go(next: View) {
    setProblem(null);
    setView(next);
  }

  async function submitSignIn(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      onSignedIn(await signIn(username.trim(), password.trim()));
    } catch (err) {
      setProblem(messageOf(err));
      setBusy(false);
    }
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await requestLogin({ name, store, phone, website });
      setView("sent");
    } catch (err) {
      setProblem(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="door">
      <div className="door__card">
        {view === "signin" && (
          <form onSubmit={submitSignIn}>
            <p className="eyebrow">For stores</p>
            <h1 className="door__title">Sign in</h1>
            <p className="door__lead">Use the login ID and password we gave your store.</p>
            {notice && <p className="door__notice">{notice}</p>}

            <label className="field">
              <span>Login ID</span>
              <input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <span className="field__row">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <button
                  type="button"
                  className="btn"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            {problem && (
              <p className="problem" role="alert">
                {problem}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--large door__go" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p className="door__switch">
              No login yet?{" "}
              <button type="button" className="link" onClick={() => go("request")}>
                Request one
              </button>
            </p>
          </form>
        )}

        {view === "request" && (
          <form onSubmit={submitRequest}>
            <p className="eyebrow">For stores</p>
            <h1 className="door__title">Request a login</h1>
            <p className="door__lead">
              Tell us about your store. We will contact you with a login ID and password.
            </p>

            <label className="field">
              <span>Your name</span>
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={60}
                required
              />
            </label>
            <label className="field">
              <span>Store name</span>
              <input
                name="store"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                autoComplete="organization"
                maxLength={80}
                required
              />
            </label>
            <label className="field">
              <span>Phone or WhatsApp number</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                maxLength={20}
                required
              />
            </label>
            {/* Hidden from people. Only a script fills it in. */}
            <input
              className="field__trap"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {problem && (
              <p className="problem" role="alert">
                {problem}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--large door__go" disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </button>
            <p className="door__switch">
              Already have a login?{" "}
              <button type="button" className="link" onClick={() => go("signin")}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {view === "sent" && (
          <div role="status">
            <p className="eyebrow">For stores</p>
            <h1 className="door__title">Request sent</h1>
            <p className="door__lead">
              We will contact you on {phone.trim()} with a login for {store.trim()}.
            </p>
            <button type="button" className="btn" onClick={() => go("signin")}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
