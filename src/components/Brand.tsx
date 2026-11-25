import type { ReactNode } from "react";

/** The small mirror from the app icon, for the header. */
export function MirrorMark() {
  return (
    <svg className="mark" viewBox="0 0 22 25" width="19" height="22" fill="none" aria-hidden="true">
      <path
        d="M11 1.4C5.8 1.4 1.6 5.7 1.6 11v11.6c0 .6.4 1 1 1h16.8c.6 0 1-.4 1-1V11c0-5.3-4.2-9.6-9.4-9.6z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M5.8 13.6 10.2 7.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

/** The arched fitting-room mirror, large. With `draw` its outline is drawn in once. */
export function MirrorArch({ className, draw = false }: { className?: string; draw?: boolean }) {
  const classes = ["arch", draw && "arch--draw", className].filter(Boolean).join(" ");
  return (
    <svg className={classes} viewBox="0 0 200 290" fill="none" aria-hidden="true">
      <path
        className="arch__frame"
        pathLength={1}
        d="M14 280V102a86 86 0 0 1 172 0v178a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z"
      />
      <path className="arch__glint" pathLength={1} d="M50 152l44-64" />
      <path className="arch__glint arch__glint--low" pathLength={1} d="M76 190l28-41" />
    </svg>
  );
}

/** Shown while the app finds out whether this device is signed in. */
export function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={leaving ? "splash splash--leaving" : "splash"}
      role="status"
      aria-label="Opening Mirror Fit"
    >
      <MirrorArch className="splash__arch" draw />
      <p className="splash__name">Mirror Fit</p>
    </div>
  );
}

/** The page a store sees before signing in: the brand on one side, a form on the other. */
export function Door({ children }: { children: ReactNode }) {
  return (
    <div className="door">
      <aside className="door__brand">
        <p className="door__name">
          <MirrorMark />
          Mirror Fit
        </p>
        <MirrorArch className="door__arch" />
        <div className="door__pitch">
          <p className="door__line">See the garment on your customer before they try it on.</p>
          <p className="door__how">
            Photograph the customer, photograph the garment, and the fitted look appears.
          </p>
        </div>
      </aside>
      <main className="door__form">
        <div className="door__inner">{children}</div>
      </main>
    </div>
  );
}
