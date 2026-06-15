import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Coming Soon — Labor Law Partner",
  description:
    "This section of Labor Law Partner is being prepared. Visit our home page or explore our live services in the meantime.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 antialiased flex items-center justify-center px-6 py-16">
      <div className="max-w-xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          Coming Soon
        </div>

        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          We are getting this page ready.
        </h1>

        <p className="mb-8 text-base leading-relaxed text-neutral-600">
          This section of Labor Law Partner is being prepared and will be live shortly. In the
          meantime, you can explore our home page or our live services desk.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Go to Home
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
          >
            View Services
          </Link>
        </div>


      </div>
    </main>
  );
}
