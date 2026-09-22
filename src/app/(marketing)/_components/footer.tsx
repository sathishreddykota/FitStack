import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-0 pb-12 pt-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-4">
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <div className="text-2xl">🏋️</div>
            <span className="text-xl font-extrabold tracking-tight">
              FitStack
            </span>
          </Link>
          <p className="text-sm text-text-muted">
            Build the body. Build the strength. Build the athlete.
          </p>
        </div>

        {/* Product Links */}
        <div>
          <h4 className="mb-4 text-sm font-semibold text-text-primary">Product</h4>
          <ul className="space-y-3 text-sm text-text-muted">
            <li><Link href="#features" className="hover:text-text-primary transition-colors">Features</Link></li>
            <li><Link href="#nutrition" className="hover:text-text-primary transition-colors">Nutrition</Link></li>
            <li><Link href="#training" className="hover:text-text-primary transition-colors">Training</Link></li>
            <li><Link href="#progress" className="hover:text-text-primary transition-colors">Progress</Link></li>
            <li><Link href="#ai-coach" className="hover:text-text-primary transition-colors">AI Coach</Link></li>
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h4 className="mb-4 text-sm font-semibold text-text-primary">Company</h4>
          <ul className="space-y-3 text-sm text-text-muted">
            <li><Link href="#" className="hover:text-text-primary transition-colors">About</Link></li>
            <li><Link href="#" className="hover:text-text-primary transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Legal Links */}
        <div>
          <h4 className="mb-4 text-sm font-semibold text-text-primary">Legal</h4>
          <ul className="space-y-3 text-sm text-text-muted">
            <li><Link href="#" className="hover:text-text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link href="#" className="hover:text-text-primary transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl px-6 border-t border-border/50 pt-8 flex items-center justify-between text-xs text-text-muted">
        <p>© {new Date().getFullYear()} FitStack. All rights reserved.</p>
        <p>Built for athletes.</p>
      </div>
    </footer>
  );
}
