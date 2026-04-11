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
  ListChecks,
  Tag,
  ChevronDown,
  ChevronUp
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
function FeatureCard({ feature }) {
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
        <p className="text-muted-foreground text-sm mb-5 leading-relaxed flex-1">
          {feature.desc}
        </p>

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
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> +{rest.length} more</>
            )}
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
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  const plans = [
    {
      name: "Free",
      price: "0",
      emails: "5,000",
      subs: "1,000",
      features: [
        "Campaign Management",
        "Email Templates",
        "Subscriber Management",
        "Analytics Reports",
        "Suppression List",
        "Audit Trail",
        "Community Support"
      ]
    },
    {
      name: "Starter",
      price: "21",
      emails: "100k",
      subs: "10k",
      features: [
        "Everything in Free",
        "Audience Segmentation",
        "Custom Tracking Domain",
        "Email Support"
      ]
    },
    {
      name: "Pro",
      price: "49",
      emails: "500k",
      subs: "50k",
      popular: true,
      features: [
        "Everything in Starter",
        "Automation Workflows",
        "A/B Testing",
        "API Access",
        "Custom Sending Domains",
        "Priority Support"
      ]
    },
    {
      name: "Custom",
      price: "Custom",
      emails: "Unlimited",
      subs: "Unlimited",
      features: [
        "Everything in Pro",
        "Managed SMTP Options",
        "Dedicated IP Support",
        "Team Accounts",
        "Custom Integrations",
        "SLA Support"
      ]
    }
  ];

  return (
    <PublicLayout>

      {/* HERO */}
      <section className="relative pt-20 pb-32 overflow-hidden">

        <div className="absolute inset-0 -z-10">
          <img
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background"/>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="max-w-3xl mx-auto"
          >

            <motion.div
              variants={fadeIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-8 border border-primary/20 backdrop-blur-sm"
            >
              ZeniPost v2.0 is live
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="text-5xl md:text-7xl font-display font-extrabold leading-[1.1] mb-6"
            >
              Self-Hosted Email Marketing
              <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                Own your data. Send at scale.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="text-xl text-muted-foreground mb-10"
            >
              Run powerful email campaigns with automation, analytics, and
              full infrastructure control. Connect your SMTP or use our
              managed delivery.
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button size="lg" className="gap-2 text-lg">
                  Start Free <ArrowRight className="w-5 h-5"/>
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-lg">
                  View Features
                </Button>
              </Link>
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
                className="w-full rounded-xl"
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* FEATURES — original 3-card overview */}
      <section id="features" className="py-24 bg-background">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything you need to grow
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for marketers and developers who need full control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Visual Campaign Builder",
                desc: "Create beautiful emails using drag & drop or HTML templates."
              },
              {
                icon: BarChart,
                title: "Real Time Analytics",
                desc: "Track opens, clicks, bounces and conversions instantly."
              },
              {
                icon: Server,
                title: "Self Hosted Control",
                desc: "Keep subscriber data on your own infrastructure."
              }
            ].map((feature, i) => (
              <Card key={i} className="hover:shadow-xl transition">
                <CardContent className="p-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                    <feature.icon className="w-6 h-6"/>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* ── FULL FEATURE SET (new section) ── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
              Complete Feature Set
            </span>
            <h2 className="text-4xl font-bold mb-4">
              12 categories. 96+ features.
            </h2>
            <p className="text-lg text-muted-foreground">
              Every capability your email programme needs — campaigns, automation,
              A/B testing, segmentation, deliverability, and full infrastructure control.
            </p>
          </div>

          {/* stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { value: "12", label: "Feature Categories" },
              { value: "96+", label: "Individual Features" },
              { value: "4", label: "Email Providers" },
              { value: "8", label: "Segment Filter Types" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-background rounded-xl border border-border p-5 text-center"
              >
                <p className="text-3xl font-extrabold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* feature grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ALL_FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>

        </div>
      </section>
      {/* ── END FULL FEATURE SET ── */}

      {/* HOW IT WORKS */}
      <section className="py-24 bg-muted/30">

        <div className="max-w-7xl mx-auto px-4">

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How ZeniPost works
            </h2>
            <p className="text-muted-foreground text-lg">
              Launch email marketing in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 text-center">
            {[
              {
                icon: Mail,
                title: "Connect SMTP",
                desc: "Use SES or your own SMTP infrastructure."
              },
              {
                icon: Activity,
                title: "Create Campaign",
                desc: "Design emails and automate workflows."
              },
              {
                icon: Shield,
                title: "Track Deliverability",
                desc: "Monitor opens, clicks and reputation."
              }
            ].map((step, i) => (
              <div key={i}>
                <div className="w-14 h-14 mx-auto mb-6 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <step.icon/>
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-background">

        <div className="max-w-7xl mx-auto px-4">

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Simple pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              No hidden costs. Scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={cn(
                  "relative transition",
                  plan.popular ? "border-primary shadow-xl scale-105" : ""
                )}
              >
                <CardContent className="p-8 flex flex-col h-full">

                  {plan.popular && (
                    <span className="absolute top-4 right-4 text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>

                  <ul className="space-y-4 flex-1 mb-8">
                    <li className="flex gap-3 text-sm">
                      <CheckCircle2 className="w-5 text-primary"/>
                      Up to {plan.emails} emails
                    </li>
                    <li className="flex gap-3 text-sm">
                      <CheckCircle2 className="w-5 text-primary"/>
                      {plan.subs} subscribers
                    </li>
                    {plan.features.map(f => (
                      <li key={f} className="flex gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-5 text-primary/50"/>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button className="w-full">Get Started</Button>
                  </Link>

                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* SMTP SECTION */}
      <section className="py-24 bg-muted/30">

        <div className="max-w-6xl mx-auto text-center px-4">

          <h2 className="text-4xl font-bold mb-6">
            Managed Email Delivery
          </h2>

          <p className="text-muted-foreground text-lg mb-16">
            Don't want to manage servers? Use our managed SMTP and dedicated IP services.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "SMTP Starter",
                price: "$29/mo",
                desc: "100k emails with shared IP pool."
              },
              {
                title: "SMTP Growth",
                price: "$79/mo",
                desc: "500k emails with optimized routing."
              },
              {
                title: "Dedicated IP",
                price: "$39/mo",
                desc: "Improve reputation and deliverability."
              }
            ].map((plan, i) => (
              <Card key={i}>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
                  <p className="text-3xl font-bold mb-4">{plan.price}</p>
                  <p className="text-muted-foreground">{plan.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-foreground text-background text-center">

        <div className="max-w-4xl mx-auto px-4">

          <h2 className="text-5xl font-bold mb-6">
            Ready to take control?
          </h2>

          <p className="text-xl text-background/80 mb-10">
            Start sending email campaigns with full control of your infrastructure.
          </p>

          <Link href="/register">
            <Button size="lg" className="bg-white text-foreground">
              Create Free Account
            </Button>
          </Link>

        </div>
      </section>

    </PublicLayout>
  );
}