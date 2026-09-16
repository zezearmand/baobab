import Link from "next/link";
import { BRAND } from "@/content/data";

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
      <Link
        href="#hero"
        className="font-display text-sm font-semibold tracking-[0.3em]"
        style={{ color: "var(--fg)" }}
      >
        {BRAND.name.toUpperCase()}
      </Link>
      <Link
        href="#contact"
        className="hidden rounded-full border px-5 py-2 font-display text-xs tracking-[0.2em] transition-colors duration-300 hover:bg-[var(--fg)] hover:text-[var(--bg)] md:inline-block"
        style={{ borderColor: "var(--line)", color: "var(--fg)" }}
      >
        CONTACT
      </Link>
    </header>
  );
}
