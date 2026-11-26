import Link from "next/link";
import { MirrorMark } from "@/components/Brand";

export default function NotFound() {
  return (
    <>
      <header className="top">
        <span className="top__mark">
          <MirrorMark />
          Mirror Fit
        </span>
      </header>
      <main className="lost">
        <h1>This page does not exist.</h1>
        <p>The address may be mistyped, or the page may have moved.</p>
        <Link className="btn btn--primary" href="/">
          Go to the trial room
        </Link>
      </main>
    </>
  );
}
