"use client";

import { useEffect, useState } from "react";
import { checkSession, clearSession, loadSession, type Session } from "@/lib/session";
import { MirrorMark, Splash } from "./Brand";
import SignIn from "./SignIn";
import TrialRoom from "./TrialRoom";

type Door =
  | { state: "checking" }
  | { state: "out"; notice?: string }
  | { state: "in"; session: Session };

/** Long enough for the mirror on the splash to finish drawing. */
const SPLASH_MS = 1100;
const SPLASH_FADE_MS = 350;

/** The trial room behind a sign-in. Stores get their login from us. */
export default function App() {
  const [door, setDoor] = useState<Door>({ state: "checking" });
  const [splash, setSplash] = useState<"on" | "leaving" | "off">("on");

  useEffect(() => {
    let current = true;
    const started = Date.now();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saved = loadSession();
    const opening: Promise<Door> = saved
      ? checkSession(saved).then((result) =>
          result === "ended"
            ? { state: "out", notice: "Your sign-in has ended. Sign in again." }
            : { state: "in", session: result },
        )
      : Promise.resolve({ state: "out" });

    let timer: ReturnType<typeof setTimeout>;
    void opening.then((next) => {
      const wait = still ? 0 : Math.max(0, SPLASH_MS - (Date.now() - started));
      timer = setTimeout(() => {
        if (!current) return;
        setDoor(next);
        setSplash("leaving");
        timer = setTimeout(() => current && setSplash("off"), SPLASH_FADE_MS);
      }, wait);
    });
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, []);

  function signOut() {
    clearSession();
    setDoor({ state: "out" });
  }

  return (
    <>
      {splash !== "off" && <Splash leaving={splash === "leaving"} />}

      {door.state === "out" && (
        <SignIn notice={door.notice} onSignedIn={(session) => setDoor({ state: "in", session })} />
      )}

      {door.state === "in" && (
        <>
          <header className="top">
            <span className="top__mark">
              <MirrorMark />
              Mirror Fit
            </span>
            <div className="top__who">
              <span className="top__store">{door.session.store}</span>
              <button type="button" className="btn btn--quiet" onClick={signOut}>
                Sign out
              </button>
            </div>
          </header>
          <TrialRoom />
        </>
      )}
    </>
  );
}
