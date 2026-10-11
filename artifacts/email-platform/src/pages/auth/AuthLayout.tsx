import type { ReactNode } from "react";
import { Link } from "wouter";
import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/core";

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
            <Mail className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">ZeniPost</span>
        </Link>
      </div>
      <main className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-8 pt-8">
            <CardTitle className="text-3xl font-display">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}
