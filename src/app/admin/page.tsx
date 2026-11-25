import type { Metadata } from "next";
import Admin from "@/components/Admin";

export const metadata: Metadata = {
  title: "Mirror Fit · Store logins",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <header className="top">
        <span className="top__mark">Mirror Fit</span>
        <span className="eyebrow">Admin</span>
      </header>
      <Admin />
    </>
  );
}
