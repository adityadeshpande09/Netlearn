import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AccountPanel } from "@/features/account/account-panel";
import "@/features/account/account.css";
export const metadata: Metadata = {
  title: "Your account",
  description: "Keep your NetLearn lesson progress with you across devices.",
};
export default function AccountPage() {
  return (
    <main id="main-content" tabIndex={-1} className="account-page page-width">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Overview</Link>
        <ChevronRight size={13} />
        <span aria-current="page">Your account</span>
      </nav>
      <div className="account-heading">
        <p className="eyebrow">KEEP YOUR PLACE</p>
        <h1>A little further, every visit.</h1>
        <p>
          Your lessons are always open. An account brings your progress along.
        </p>
      </div>
      <AccountPanel />
    </main>
  );
}
