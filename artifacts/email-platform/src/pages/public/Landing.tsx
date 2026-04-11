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
} from "lucide-react";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button, Card, CardContent } from "@/components/ui/core";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Full feature data — sourced from actual app capabilities
// ─────────────────────────────────────────────────────────────
const ALL_FEATURES = [
  {
    icon: Send,
    title: "Campaign Management",
    desc: "Full send lifecycle — draft, schedule, pause, resume, and stop. Cursor-based batch processing with duplicate-send protection and real-time progress.",
    items: [
      "Multi-step campaign wizard",
      "Schedule future sends",
      "Pause & resume live campaigns",
      "Graceful or immediate stop",
      "Test email before sending",
      "Cancel scheduled campaigns",
      "Real-time progress tracking",
      "Duplicate-send protection",
    ],
  },
  {
    icon: Zap,
    title: "Email Template Editor",
    desc: "Three editor modes — drag-and-drop blocks, raw HTML, and visual WYSIWYG. Preview on desktop, tablet, and mobile before sending.",
    items: [
      "Drag-and-drop block builder",
      "Raw HTML editor mode",
      "Visual WYSIWYG mode",
      "Desktop / tablet / mobile preview",
      "Deliverability score panel",
      "Spam word detection",
      "Duplicate & export templates",
      "Convert between editor modes",
    ],
  },
  {
    icon: Users,
    title: "Subscriber Management",
    desc: "Upload millions of subscribers via CSV with parallel chunk processing, automatic deduplication, and background job tracking.",
    items: [
      "CSV bulk import with field mapping",
      "Parallel chunk processing (15k/batch)",
      "Background job with live progress",
      "Duplicate detection & deduplication",
      "Three-tier field system",
      "Per-list export as CSV",
      "Subscriber status management",
      "Custom fields per subscriber",
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
// FeatureCard — expandable, matches the card style of the page
// ─────────────────────────────────────────────────────────────
function FeatureCard({ feature }: { feature: typeof ALL_FEATURES[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = feature.icon;
  const preview = feature.items.slice(0, 4);
  const rest = feature.items.slice(4);

  return (
    <Card className="hover:shadow-xl transition-shadow h-full">
      <CardContent className="p-8 flex flex-col h-full">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-5 flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
        <p className="text-muted-foreground text-sm mb-5 leading-relaxed flex-1">{feature.desc}</p>
        <ul className="space-y-2 mb-4">
          {preview.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
          {expanded && rest.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
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
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> +{rest.length} more</>
            }
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
export function Landing() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" },
  };
  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  const plans = [
    {
      name: "Free",
      price: "0",
      emails: "5,000",
      subs: "1,000",
      desc: "Use your own SMTP",
      features: [
        "Campaign Management",
        "Email Templates",
        "Subscriber Management",
        "Analytics Reports",
        "Suppression List",
        "Audit Trail",
        "Community Support",
      ],
      popular: false,
    },
    {
      name: "Pro",
      price: "21",
      emails: "100k",
      subs: "10k",
      desc: "Your SMTP + advanced features",
      features: [
        "Everything in Free",
        "Audience Segmentation",
        "A/B Testing",
        "Custom Tracking Domain",
        "Email Support",
      ],
      popular: false,
    },
    {
      name: "Premium",
      price: "49",
      emails: "500k",
      subs: "50k",
      desc: "Best for automation & scale",
      features: [
        "Everything in Pro",
        "Automation Workflows",
        "API Access",
        "Custom Sending Domains",
        "Priority Support",
      ],
      popular: true,
    },
    {
      name: "Custom",
      price: "Custom",
      emails: "Unlimited",
      subs: "Unlimited",
      desc: "Managed SMTP + white-glove setup",
      features: [
        "Everything in Premium",
        "Managed SMTP Options",
        "Dedicated IP Support",
        "Team Accounts",
        "Custom Integrations",
        "SLA Support",
      ],
      popular: false,
    },
  ];

  return (
    <PublicLayout>

      {/* ── HERO ── */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="max-w-4xl mx-auto">
            <motion.div
              variants={fadeIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-8 border border-primary/20 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              ZeniPost v2.0 is now live
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="text-5xl md:text-7xl font-display font-extrabold leading-[1.1] mb-6"
            >
              Run your own email infrastructure —
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                without deliverability headaches
              </span>
            </motion.h1>

            <motion.p variants={fadeIn} className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Self-hosted email platform with optional managed delivery and optimized inbox performance.
              Connect your SMTP or let us handle everything.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 text-lg w-full sm:w-auto">
                  Start Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg w-full sm:w-auto">
                Get Managed Setup
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-background/50 backdrop-blur-md p-2">
              <img
                src={`${import.meta.env.BASE_URL}images/dashboard-mockup.png`}
                alt="ZeniPost Dashboard"
                className="w-full rounded-xl"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DIY vs MANAGED ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Your infrastructure or ours — you choose
            </h2>
            <p className="text-muted-foreground text-lg">
              ZeniPost works with any sending setup. Start self-hosted, upgrade to managed anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Server className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">Use Your Own SMTP</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  {["AWS SES / SendGrid / Mailjet", "Lower cost at scale", "Full provider control", "Basic tracking & webhooks"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary/50 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button variant="outline" className="w-full">Start Free (BYOS)</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-primary shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Managed Delivery</h3>
                  <span className="ml-auto text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">Recommended</span>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                  {["Better inbox placement rates", "Dedicated IP provisioning", "IP warmup management", "Full reputation monitoring"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full">Get Managed Setup</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FEATURES OVERVIEW (3 cards) ── */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything you need to grow</h2>
            <p className="text-lg text-muted-foreground">Built for marketers and developers who need full control.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Visual Campaign Builder", desc: "Create beautiful emails using drag & drop or raw HTML templates. Preview across all devices." },
              { icon: BarChart, title: "Real-Time Analytics", desc: "Track opens, clicks, bounces, and conversions with actionable dashboards and CSV exports." },
              { icon: Server, title: "Self-Hosted Control", desc: "Keep subscriber data on your own servers. Never worry about arbitrary platform bans again." },
            ].map((feature, i) => (
              <Card key={i} className="hover:shadow-xl transition">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL FEATURE SET ── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
              Complete Feature Set
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">12 categories. 96+ features.</h2>
            <p className="text-lg text-muted-foreground">
              Every capability your email programme needs — campaigns, automation,
              A/B testing, segmentation, deliverability, and full infrastructure control.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { value: "12", label: "Feature Categories" },
              { value: "96+", label: "Individual Features" },
              { value: "4", label: "Email Providers" },
              { value: "8", label: "Segment Filter Types" },
            ].map((stat) => (
              <div key={stat.label} className="bg-background rounded-xl border border-border p-5 text-center">
                <p className="text-3xl font-extrabold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ALL_FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How ZeniPost works</h2>
            <p className="text-muted-foreground text-lg">Launch email marketing in minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 text-center">
            {[
              { icon: Mail, step: "01", title: "Connect Your SMTP", desc: "Use AWS SES, SendGrid, or our managed delivery. Full provider flexibility." },
              { icon: Activity, step: "02", title: "Create & Automate", desc: "Design campaigns, build automation sequences, and set up A/B tests." },
              { icon: Shield, step: "03", title: "Track & Optimise", desc: "Monitor opens, clicks, reputation scores, and deliverability health." },
            ].map((step, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                  <step.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-primary/50 tracking-widest uppercase">{step.step}</span>
                <h3 className="font-bold text-lg mt-1 mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMAIL HEALTH ── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Your email health at a glance</h2>
          <p className="text-muted-foreground text-lg mb-12">
            ZeniPost checks your DNS records automatically. Fix issues before they affect deliverability.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { label: "SPF", status: "pass", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", desc: "Authorises your sending server" },
              { label: "DKIM", status: "warning", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", desc: "Digital signature not yet set" },
              { label: "DMARC", status: "fail", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", desc: "Policy record missing" },
            ].map((record) => (
              <Card key={record.label} className={cn("border", record.bg)}>
                <CardContent className="p-6 text-center">
                  <record.icon className={cn("w-8 h-8 mx-auto mb-3", record.color)} />
                  <h3 className="text-2xl font-extrabold mb-1">{record.label}</h3>
                  <p className={cn("text-xs font-bold uppercase tracking-wider mb-2", record.color)}>
                    {record.status === "pass" ? "✓ Passed" : record.status === "warning" ? "⚠ Warning" : "✕ Missing"}
                  </p>
                  <p className="text-xs text-muted-foreground">{record.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Add your domain in the dashboard and ZeniPost guides you through fixing each record step by step.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Check My Domain <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">No hidden fees. Scale as you grow.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 items-start">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  plan.popular ? "border-primary shadow-2xl scale-105 z-10" : "border-border/50 hover:border-primary/40"
                )}
              >
                {plan.popular && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />}
                <CardContent className="p-8 flex flex-col h-full">
                  {plan.popular && (
                    <span className="absolute top-4 right-4 text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>

                  <div className="mb-6">
                    {plan.price === "Custom" ? (
                      <span className="text-3xl font-extrabold">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold">${plan.price}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    <li className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> Up to {plan.emails} emails
                    </li>
                    <li className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> {plan.subs} subscribers
                    </li>
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary/40 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                      {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── DELIVERABILITY / MANAGED SMTP ── */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Fix deliverability. Stop landing in spam.
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Optimized delivery with warmup schedules, reputation control, and real-time monitoring.
            </p>
            <Button size="lg" className="gap-2">
              Get Managed Setup <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "SMTP Starter", price: "$29/mo", desc: "100k emails with shared IP pool. Basic reputation tracking." },
              { title: "SMTP Growth", price: "$79/mo", desc: "500k emails with optimised routing and priority throughput." },
              { title: "Dedicated IP", price: "$39/mo", desc: "Your own sending IP. Full warmup support and reputation control." },
            ].map((plan, i) => (
              <Card key={i} className="hover:shadow-xl transition">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
                  <p className="text-3xl font-bold text-primary mb-3">{plan.price}</p>
                  <p className="text-muted-foreground text-sm">{plan.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 bg-foreground text-background text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Start free or get it fully set up
          </h2>
          <p className="text-xl text-background/70 mb-10">
            Self-host in minutes or let our team configure everything for you. Either way, you own your data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-foreground hover:bg-white/90 text-lg px-8 h-14 w-full sm:w-auto">
                Start Free
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 text-lg px-8 h-14 w-full sm:w-auto"
            >
              Get Setup Done For Me
            </Button>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
