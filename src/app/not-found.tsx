import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main id="main-content" tabIndex={-1} className="foundation-page">
      <p className="wordmark">
        NetLearn<span aria-hidden="true"> /</span>
      </p>
      <div className="intro">
        <p className="eyebrow">404 / Page not found</p>
        <h1>This connection leads nowhere.</h1>
        <p className="description">
          The page may have moved, or the address may be incorrect.
        </p>
        <Link href="/" className="home-link">
          Return to NetLearn
        </Link>
      </div>
    </main>
  );
}
