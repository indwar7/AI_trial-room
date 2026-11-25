"use client";

import { useEffect, useState } from "react";
import { checkSession, clearSession, loadSession, type Session } from "@/lib/session";
import SignIn from "./SignIn";
import TrialRoom from "./TrialRoom";

type Door =
  | { state: "checking" }
  | { state: "out"; notice?: string }
  | { state: "in"; session: Session };

/** The trial room behind a sign-in. Stores get their login from us. */
export default function App() {
  const [door, setDoor] = useState<Door>({ state: "checking" });

  useEffect(() => {
    let current = true;
    const saved = loadSession();
    const opening: Promise<Door> = saved
      ? checkSession(saved).then((result) =>
          result === "ended"
            ? { state: "out", notice: "Your sign-in has ended. Sign in again." }
            : { state: "in", session: result },
        )
      : Promise.resolve({ state: "out" });
    void opening.then((next) => {
      if (current) setDoor(next);
    });
    return () => {
      current = false;
    };
  }, []);

  function signOut() {
    clearSession();
    setDoor({ state: "out" });
  }

  return (
    <>
      <header className="top">
        <span className="top__mark">Mirror Fit</span>
        {door.state === "in" ? (
          <div className="top__who">
            <span className="top__store">{door.session.store}</span>
            <button type="button" className="btn btn--quiet" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <span className="eyebrow">AI Trial Room</span>
        )}
      </header>

      {door.state === "checking" && (
        <p className="door__wait" role="status">
          Opening…
        </p>
      )}

      {door.state === "out" && (
        <SignIn notice={door.notice} onSignedIn={(session) => setDoor({ state: "in", session })} />
      )}

      {door.state === "in" && (
        <>
          <div className="intro">
            <h1>Try it on without putting it on.</h1>
            <p>
              Take a photo of the person, take a photo of the garment, and the AI shows the
              garment fitted on them.
            </p>
          </div>
          <TrialRoom />
        </>
      )}
    </>
  );
}
