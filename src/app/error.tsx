"use client";

import { useEffect } from "react";

/** Shown in place of a page that crashed, so nobody is left on a blank screen. */
export default function PageError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="lost">
      <h1>Something went wrong on this page.</h1>
      <p>Your photos were not sent anywhere. Try again, or reload the page.</p>
      <button type="button" className="btn btn--primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
