import { Link } from "wouter";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/core";
import { useAuth } from "@/hooks/use-auth";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">ZeniPost</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/80">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="outline" className="hidden sm:flex">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link href="/register">
                  <Button className="gap-2">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {children}
      </main>

      <footer className="bg-foreground text-background/80 py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Mail className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-xl text-white">ZeniPost</span>
            </div>
            <p className="text-background/60 max-w-sm mb-6">
              The self-hosted email marketing platform built for developers, agencies, and businesses who demand complete control over their data.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 font-display">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 font-display">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/legal/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="/legal/terms"   className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="/legal/refunds" className="hover:text-primary transition-colors">Refund Policy</a></li>
              <li><a href="/legal/cookies" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              <li><a href="/legal"         className="hover:text-primary transition-colors">Legal</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/10">
          <p className="text-center text-sm text-background/50 mb-4">
            Self-hosted email platform with optional managed delivery.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-background/40">
            <p>© {new Date().getFullYear()} ZeniPost. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0" />
          </div>
        </div>
      </footer>
    </div>
  );
}
