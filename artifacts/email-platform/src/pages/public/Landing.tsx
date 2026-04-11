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

// ─────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────
const ALL_FEATURES = [
  {
    icon: Send,
    title: "Campaign Management",
    desc: "Launch, control, and monitor campaigns with precision. Create campaigns in minutes, schedule them for later, or manage them live with full control over delivery.",
    items: [
      "Create and schedule campaigns effortlessly",
      "Pause, resume, or stop anytime",
      "Send test emails before going live",
      "Real-time delivery progress tracking",
      "Built-in protection against duplicate sends",
    ],
  },
  {
    icon: Zap,
    title: "Email Builder",
    desc: "Design emails your way — no limitations. Whether you prefer visual builders or full control with code, you get flexibility without compromise.",
    items: [
      "Drag-and-drop email builder",
      "HTML editor for full customization",
      "Visual editor for quick design",
      "Mobile, tablet, and desktop preview",
      "Built-in spam and deliverability checks",
    ],
  },
  {
    icon: Users,
    title: "Subscriber Management",
    desc: "Handle small lists or millions of contacts with ease. Import, manage, and organize subscribers efficiently with performance built in.",
    items: [
      "Bulk CSV import with smart field mapping",
      "Automatic duplicate detection",
      "Real-time import progress tracking",
      "Custom fields for personalization",
      "Export and manage lists anytime",
    ],
  },
  {
    icon: Filter,
    title: "Smart Segmentation",
    desc: "8 filter types for precise audience targeting — status, geography, engagement, email domain, profile completeness, industry, and custom fields.",
    items: [
      "Subscriber status filter",
      "List membership filter",
      "Subscription date range",
      "Geographic (country / city)",
      "Engagement level (high / medium / low)",
      "Email domain filter",
      "Industry & company size",
      "Live subscriber count preview",
    ],
  },
  {
    icon: Activity,
    title: "Automation Workflows",
    desc: "Multi-step email sequences triggered by subscriber behaviour. Conditional branching, A/B splits, goal tracking, quiet hours, and timezone-aware sending.",
    items: [
      "Welcome sequence trigger",
      "Birthday & re-engagement triggers",
      "Abandoned cart & post-purchase",
      "Conditional branch logic",
      "A/B split steps",
      "Webhook action steps",
      "Goal tracking & exit conditions",
      "Quiet hours & timezone support",
    ],
  },
  {
    icon: FlaskConical,
    title: "A/B Testing",
    desc: "Test subject lines, sender names, and sender emails across a sample of your list. Auto-declare winner and send to remaining subscribers.",
    items: [
      "Subject line A/B test",
      "Sender name / email A/B test",
      "Configurable split percentage",
      "Open rate or click rate criteria",
      "Configurable test duration",
      "Auto winner declaration",
      "Auto-send winner to remainder",
      "Statistical significance indicator",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    desc: "Per-campaign analytics with open, click, bounce, unsubscribe, spam report, and delivery rates. Export any metric as CSV.",
    items: [
      "Open & click rate tracking",
      "Bounce & unsubscribe rates",
      "Spam complaint rate",
      "Top clicked links",
      "Campaign progress tracking",
      "Cross-campaign dashboard",
      "Export per event type (CSV)",
      "Date-range filtering (1–365 days)",
    ],
  },
  {
    icon: TrendingUp,
    title: "Deliverability & Suppression",
    desc: "Full suppression list management with global and list-specific scopes. Bounce and complaint auto-processing via SES webhooks.",
    items: [
      "Global & list-specific suppressions",
      "Bounce auto-suppression via webhook",
      "Complaint auto-suppression",
      "Bulk suppression import / export",
      "List-Unsubscribe header (one-click)",
      "Rate limiting per provider",
      "Circuit breaker pattern",
      "Dead letter queue (DLQ)",
    ],
  },
  {
    icon: Globe,
    title: "Domain & DNS",
    desc: "Add custom sending domains with guided SPF, DKIM, and DMARC setup. Multiple domains for different brands or senders.",
    items: [
      "Custom sending domains",
      "DNS verification flow",
      "SPF record guidance",
      "DKIM record guidance",
      "DMARC record guidance",
      "Multiple domain support",
      "Verification status tracking",
      "Re-verify on DNS change",
    ],
  },
  {
    icon: Tag,
    title: "Personalisation",
    desc: "Map template {{variables}} to subscriber data with fallback values. Subject line personalisation. Full Jinja2 support for loops and conditionals.",
    items: [
      "{{variable}} template syntax",
      "Three-tier field mapping",
      "Fallback value per field",
      "Subject line personalisation",
      "Jinja2 loops & conditionals",
      "Nested object field access",
      "Unsubscribe URL injection",
      "System fields (date, year)",
    ],
  },
  {
    icon: Lock,
    title: "Security & Access",
    desc: "JWT Bearer auth on every protected route. bcrypt password hashing, security headers middleware, and full audit trail.",
    items: [
      "JWT Bearer token auth",
      "bcrypt password hashing",
      "Security headers middleware",
      "CORS configuration",
      "HTTPS enforcement (HSTS)",
      "Full audit trail",
      "IP address logging",
      "Password change flow",
    ],
  },
  {
    icon: Cpu,
    title: "Infrastructure",
    desc: "Celery worker queues with dedicated lanes per feature. Redis-backed rate limiting, worker caching, and resource management.",
    items: [
      "Celery background workers",
      "Dedicated queue per feature",
      "Redis worker-level caching",
      "Campaign content snapshot",
      "Resource manager (CPU / memory)",
      "Exponential retry backoff",
      "Celery Beat scheduled tasks",
      "MongoDB connection pooling",
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// FeatureCard
// ─────────────────────────────────────────────────────────────
function FeatureCard({ feature }: { feature: (typeof ALL_FEATURES)[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = feature.icon;
  const preview = feature.items.slice(0, 4);
  const rest = feature.items.slice(4);
  return (
    <Card className="hover:shadow-xl transition-shadow h-full group">
      <CardContent className="p-8 flex flex-col h-full">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
        <p className="text-muted-foreground text-sm mb-5 leading-relaxed flex-1">
          {feature.desc}
        </p>
        <ul className="space-y-2 mb-4">
          {preview.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
          {expanded &&
            rest.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
        </ul>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline self-start mt-auto"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> +{rest.length} more
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, ease: "easeOut" },
};
const stagger = {
  whileInView: { transition: { staggerChildren: 0.08 } },
  viewport: { once: true },
};

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
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
