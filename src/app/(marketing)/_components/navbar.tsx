import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl">🏋️</div>
          <span className="text-xl font-extrabold tracking-tight">
            FitStack
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <Link href="#features" className="hover:text-text-primary transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="hover:text-text-primary transition-colors">
            How It Works
          </Link>
          <Link href="#training" className="hover:text-text-primary transition-colors">
            Training
          </Link>
          <Link href="#nutrition" className="hover:text-text-primary transition-colors">
            Nutrition
          </Link>
          <Link href="#progress" className="hover:text-text-primary transition-colors">
            Progress
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="hidden sm:block text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Log In
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
