import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "IIIT Connect — Every IIIT. One place.",
  description: "Events, cutoffs, reviews and Q&A across all IIITs in India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-heading text-lg font-bold">IIIT<span className="text-indigo">Connect</span></Link>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <Link href="/colleges" className="hover:text-white">Colleges</Link>
              <Link href="/events" className="hover:text-white">Events</Link>
              <Link href="/clubs" className="hover:text-white">Clubs</Link>
              <Link href="/ask" className="hover:text-white">Ask a Senior</Link>
              <Link href="/auth/login" className="btn-primary !py-1.5 text-sm">Sign in</Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-500">
          IIIT Connect — built by students, for students. Not affiliated with any institute.
        </footer>
      </body>
    </html>
  );
}
