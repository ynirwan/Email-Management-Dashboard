import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  BarChart,
  Server,
  Mail,
  Activity,
  Send,
  Users,
  Filter,
  FlaskConical,
  BarChart3,
  TrendingUp,
  Globe,
  Lock,
  Cpu,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wifi,
  Code2,
  Building2,
  Briefcase,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button, Card, CardContent } from "@/components/ui/core";

export function Landing() {
  const licensePlans = [
    { name: "Starter License", price: "$49", installs: "1", support: "$29/year", features: ["1 server/domain", "Multi-user shared workspace", "Campaign management", "All template editors", "Subscriber management", "Basic analytics", "Suppression list", "Custom sending domains", "Community support"], popular: true },
    { name: "Pro License", price: "$149", installs: "Up to 3", support: "$49/year", features: ["Everything in Starter", "Automation workflows", "A/B testing", "Advanced segmentation", "API access", "Webhooks", "Priority support"] },
    { name: "Agency License", price: "$299", installs: "Unlimited", support: "$99/year", features: ["Everything in Pro", "White label", "Client usage allowed", "Audit logs", "Team roles & permissions", "Advanced reporting"] },
  ];

  const deliveryPlans = [
    { name: "Starter Delivery", price: "$29/month", volume: "100,000 emails/month", infra: "Shared IP", routing: "Basic routing" },
    { name: "Growth Delivery", price: "$79/month", volume: "500,000 emails/month", infra: "Optimized routing", routing: "Better inbox placement" },
    { name: "Scale Delivery", price: "$149/month", volume: "1,000,000 emails/month", infra: "Priority queue", routing: "Warmup system" },
    { name: "Dedicated Infrastructure", price: "$299+/month", volume: "Custom volume", infra: "Dedicated IP", routing: "Reputation management + custom scaling" },
  ];

  return (
    <PublicLayout>
      <section className="py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-display font-extrabold mb-6">
          Run your own email infrastructure — without deliverability headaches
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Self-hosted email platform. Install on your server and send using your own SMTP or our optimized delivery.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="#how"><Button size="lg">View Setup Guide</Button></Link>
          <Link href="#pricing"><Button size="lg" variant="outline">Buy License <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
      </section>

      <section id="how" className="py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-4 text-sm">
          {["Install on your server", "Create users (shared workspace)", "Connect SMTP (SES, SendGrid, etc.)", "Send campaigns", "Optimize deliverability (optional upgrade)"].map((step) => (
            <Card key={step}><CardContent className="p-5">{step}</CardContent></Card>
          ))}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <Card><CardContent className="p-8"><h3 className="text-2xl font-bold mb-3">DIY (Free Path)</h3><p className="text-muted-foreground">Use your SMTP, keep costs low, manage setup yourself.</p></CardContent></Card>
          <Card><CardContent className="p-8"><h3 className="text-2xl font-bold mb-3">Managed (Paid Path)</h3><p className="text-muted-foreground mb-4">Better inbox placement, optimized routing, dedicated infrastructure.</p><Button>Get Managed Setup</Button></CardContent></Card>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-display font-bold">Buy once. Host anywhere.</h2>
          <p className="text-muted-foreground mt-2">Use your own SMTP or upgrade to managed delivery anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {licensePlans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg" : ""}>
              <CardContent className="p-7">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-3xl font-extrabold mt-2">{plan.price} <span className="text-base font-medium text-muted-foreground">one-time</span></p>
                <p className="text-sm mt-3">Installations: <strong>{plan.installs}</strong></p>
                <p className="text-sm">Shared Workspace: <strong>Yes</strong></p>
                <p className="text-sm mb-4">Support + Updates: <strong>{plan.support}</strong></p>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />{f}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-display font-bold">Fix deliverability. Stop landing in spam.</h2>
          <p className="text-muted-foreground mt-2">Optimized infrastructure with IP warmup, routing, and reputation management.</p>
          <p className="text-sm text-muted-foreground mt-2">Need better deliverability? Add optimized email infrastructure.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {deliveryPlans.map((plan) => (
            <Card key={plan.name}>
              <CardContent className="p-6">
                <h3 className="font-bold">{plan.name}</h3>
                <p className="text-2xl font-extrabold mt-2">{plan.price}</p>
                <p className="text-sm mt-2">{plan.volume}</p>
                <p className="text-sm text-muted-foreground">{plan.infra}</p>
                <p className="text-sm text-muted-foreground">{plan.routing}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Start with your own SMTP or let us handle everything.</h2>
        <p className="text-muted-foreground mb-6">Buy once. Host anywhere. Scale with your own SMTP or our delivery.</p>
        <div className="flex gap-4 justify-center">
          <Button>Buy License</Button>
          <Button variant="outline">Get Managed Setup</Button>
        </div>
      </section>
    </PublicLayout>
  );
}
