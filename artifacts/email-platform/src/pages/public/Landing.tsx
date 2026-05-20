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
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────
const ALL_FEATURES = [
  {
    icon: Send,
    title: "Campaign Management",
    desc: "Create, schedule, and control email campaigns with confidence. Send to thousands or millions — with real-time progress and full control at every stage.",
    items: [
      "Create and schedule campaigns effortlessly",
      "Pause, resume, or cancel at any time",
      "Send a test email before going live",
      "Real-time delivery progress tracking",
      "Duplicate send protection built in",
      "Target multiple lists in one campaign",
      "Clone past campaigns to reuse instantly",
      "Timezone-aware scheduled delivery",
    ],
  },
  {
    icon: Zap,
    title: "Email Builder",
    desc: "Design beautiful emails your way. Use a drag-and-drop builder, a full HTML editor, or a quick visual editor — all built in, no extra tools needed.",
    items: [
      "Drag-and-drop email builder",
      "Full HTML editor for complete control",
      "Visual editor for quick designs",
      "Mobile, tablet, and desktop preview",
      "Pre-built templates included",
      "Reusable content block library",
      "Import your own HTML design",
      "Pre-send spam score check",
    ],
  },
  {
    icon: Users,
    title: "Subscriber Management",
    desc: "Import, organise, and manage your contacts at any scale. Keep your list clean and your data accurate without manual work.",
    items: [
      "Bulk CSV import with smart field mapping",
      "Automatic duplicate detection",
      "Real-time import progress tracking",
      "Custom data fields for personalisation",
      "Export your list any time",
      "Add subscribers to multiple lists",
      "Manual subscribe and unsubscribe controls",
      "Full subscriber engagement history",
    ],
  },
  {
    icon: Filter,
    title: "Smart Segmentation",
    desc: "Send the right message to the right people. Build precise audience segments using 8 filter types — no spreadsheets, no guesswork.",
    items: [
      "Filter by subscriber status (active, unsubscribed, bounced)",
      "Filter by list membership",
      "Filter by subscription date range",
      "Filter by location (country or city)",
      "Filter by engagement level (high, medium, low)",
      "Filter by email domain or company",
      "Filter by any custom field value",
      "Live subscriber count preview before sending",
    ],
  },
  {
    icon: Activity,
    title: "Automation Workflows",
    desc: "Set up email sequences once and let them run. Welcome new subscribers, win back inactive ones, or trigger emails from any subscriber action.",
    items: [
      "Welcome and onboarding sequences",
      "Re-engagement and win-back campaigns",
      "Birthday and anniversary triggers",
      "Conditional steps (if/else branching)",
      "A/B split steps inside a workflow",
      "Webhook steps to notify your other tools",
      "Goal tracking and automatic exit conditions",
      "Quiet hours and timezone-aware sending",
    ],
  },
  {
    icon: FlaskConical,
    title: "A/B Testing",
    desc: "Stop guessing what works. Test subject lines and sender details against a sample of your list, then automatically send the winner to the rest.",
    items: [
      "Test two subject lines head-to-head",
      "Test sender name or sender email",
      "Set your own split percentage",
      "Pick winning metric: opens or clicks",
      "Set a custom test duration",
      "Automatic winner declaration",
      "Winner auto-sent to remaining subscribers",
      "Confidence indicator to guide your decision",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    desc: "Know exactly how every campaign performed. Track opens, clicks, bounces, unsubscribes, and complaints — then export anything you need.",
    items: [
      "Open rate and click rate per campaign",
      "Bounce and unsubscribe rate tracking",
      "Spam complaint rate monitoring",
      "Top clicked links ranking",
      "Live campaign delivery progress",
      "Cross-campaign performance dashboard",
      "Export any metric to CSV",
      "Filter reports by custom date range",
    ],
  },
  {
    icon: TrendingUp,
    title: "Deliverability & Inbox Placement",
    desc: "Stay out of spam and maintain a healthy sender reputation. Automatic suppression and compliance tools keep your list clean and your deliverability high.",
    items: [
      "Global and per-list suppression management",
      "Automatic bounce suppression",
      "Automatic spam complaint suppression",
      "Bulk suppression import and export",
      "One-click unsubscribe compliance (RFC 8058)",
      "Smart rate limiting per email provider",
      "Pre-send spam and deliverability check",
      "Sender reputation monitoring",
    ],
  },
  {
    icon: Globe,
    title: "Custom Domains & Branding",
    desc: "Send from your own domain and track links under your brand. Step-by-step setup guides make DNS configuration easy — no technical background needed.",
    items: [
      "Send from your own branded domain",
      "Link tracking under your own domain",
      "Guided SPF setup (with copy-paste records)",
      "Guided DKIM setup",
      "Guided DMARC setup",
      "Multiple sending domains per account",
      "Domain verification status tracking",
      "White-label: remove all ZeniPost branding (Agency)",
    ],
  },
  {
    icon: Tag,
    title: "Personalisation",
    desc: "Make every email feel personal. Merge subscriber data into any part of your email — subject line, body, or buttons — with fallback values if data is missing.",
    items: [
      "Merge tags for any subscriber field ({{first_name}}, etc.)",
      "Personalise the subject line per recipient",
      "Fallback values when a field is missing",
      "Three-tier field priority (campaign, list, subscriber)",
      "Conditional content blocks (show or hide by data)",
      "Loop over subscriber data arrays",
      "Auto-inject unsubscribe link in every email",
      "System variables: date, year, and more",
    ],
  },
  {
    icon: Lock,
    title: "Team, Access & Compliance",
    desc: "Manage who can do what in your account. GDPR tools, audit logs, and role-based access keep your data safe and your team aligned.",
    items: [
      "Invite team members to your workspace",
      "Role-based access control (admin, editor, viewer)",
      "Full activity audit log (Agency)",
      "GDPR consent tracking and management (Pro+)",
      "Subscriber data export on request",
      "Right-to-erasure: delete subscriber data on demand",
      "Secure password management",
      "Session logging and access history",
    ],
  },
  {
    icon: Code2,
    title: "Integrations & API",
    desc: "Connect ZeniPost to your existing tools. Use the REST API to automate anything, or receive real-time updates via webhooks into any system.",
    items: [
      "Full REST API for all core operations (Pro+)",
      "Real-time webhooks for opens, clicks, and unsubscribes",
      "Works with AWS SES, SendGrid, Mailgun, and any SMTP",
      "API-driven subscriber import and management",
      "Custom webhook endpoint per campaign or list",
      "Export all data in CSV or via API",
      "Compatible with Zapier and n8n via webhooks",
      "Use your existing SMTP — no migration needed",
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
    {
      name: "Starter License",
      price: "$49",
      installs: "1 installation (server or domain)",
      popular: true,
      features: [
        "1 server or domain installation",
        "Multi-user shared workspace",
        "Campaign management",
        "Email builder (drag-and-drop, HTML, visual)",
        "Subscriber management",
        "Basic analytics",
        "Suppression & unsubscribe management",
        "Send from your own domain",
        "Real-time webhooks",
        "Lifetime software updates",
      ],
    },
    {
      name: "Pro License",
      price: "$149",
      installs: "Up to 3 installations",
      popular: false,
      features: [
        "Everything in Starter",
        "Up to 3 installations",
        "Automation workflows",
        "A/B testing",
        "Advanced audience segmentation",
        "REST API access",
        "Advanced reporting & CSV export",
        "GDPR tools",
        "Lifetime software updates",
      ],
    },
    {
      name: "Agency License",
      price: "$299",
      installs: "Unlimited installations",
      popular: false,
      features: [
        "Everything in Pro",
        "Unlimited installations",
        "White label (remove ZeniPost branding)",
        "Client usage rights",
        "Full activity audit logs",
        "Team roles & permissions",
        "Advanced reporting",
        "Lifetime software updates",
      ],
    },
  ];

  const supportPlans = [
    {
      name: "Basic Support",
      price: "$19",
      period: "/month",
      badge: null,
      desc: "Best for beginners needing setup help",
      features: [
        "Installation assistance",
        "SMTP setup (SES, SendGrid, etc.)",
        "DNS help (SPF, DKIM, DMARC)",
        "Basic troubleshooting",
      ],
    },
    {
      name: "Advanced Support",
      price: "$49",
      period: "/month",
      badge: "Most Popular",
      desc: "Best for growing users with serious usage",
      features: [
        "Everything in Basic",
        "Deliverability troubleshooting",
        "Performance tuning",
        "Queue / worker debugging",
        "Priority response",
      ],
    },
    {
      name: "Managed Setup",
      price: "$49–$99",
      period: " one-time",
      badge: null,
      desc: "Full setup done for you, once",
      features: [
        "Full installation",
        "SMTP + DNS configuration",
        "Initial platform setup",
        "Handover & walkthrough",
      ],
    },
  ];

  const deliveryPlans = [
    {
      name: "Starter Delivery",
      price: "$35/mo",
      volume: "55,000 emails/month",
      infra: "Shared IP pool",
      routing: "Basic routing",
      Support: "Basic support Plan included",
    },
    {
      name: "Growth Delivery",
      price: "$87/mo",
      volume: "150,000 emails/month",
      infra: "Optimized routing",
      routing: "Better inbox placement",
      Support: "Advance support Plan included",
    },
    {
      name: "Scale Delivery",
      price: "$159/mo",
      volume: "3,50,000 emails/month",
      infra: "Priority queue",
      routing: "Warmup system included",
    },
    {
      name: "Dedicated IP",
      price: "$299+/mo",
      volume: "Custom email volume",
      infra: "Dedicated IP",
      routing: "Reputation management + scaling",
    },
  ];

  return (
    <PublicLayout>
      {/* ── HERO ── */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />

        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div
            {...fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 border border-primary/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            ZeniPost v2.0 — now available
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-5xl md:text-7xl font-display font-extrabold leading-[1.08] tracking-tight mb-4"
          >
            Run your own email infrastructure —
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
              without deliverability headaches
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-lg font-semibold text-muted-foreground mb-3"
          >
            Self-hosted. Your server. Your control.
          </motion.p>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Install on your own server and send using your SMTP — or upgrade to
            our optimized managed delivery anytime.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Link href="#pricing">
              <Button
                size="lg"
                className="gap-2 text-base px-8 h-12 w-full sm:w-auto"
              >
                Buy License <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 h-12 w-full sm:w-auto"
            >
              Get Managed Setup
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-sm text-muted-foreground/70 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-primary/50" />
            Works with AWS SES, SendGrid, and any SMTP provider
          </motion.p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-16 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <motion.h2
            {...fadeUp}
            className="text-center text-2xl font-bold mb-10 text-muted-foreground"
          >
            Up and running in 5 steps
          </motion.h2>
          <motion.div
            {...stagger}
            className="grid grid-cols-2 md:grid-cols-5 gap-3"
          >
            {[
              { step: "01", label: "Install on your server" },
              { step: "02", label: "Create users (shared workspace)" },
              { step: "03", label: "Connect SMTP (SES, SendGrid, etc.)" },
              { step: "04", label: "Send your campaigns" },
              { step: "05", label: "Upgrade delivery (optional)" },
            ].map((s) => (
              <motion.div key={s.step} {...fadeUp}>
                <Card className="text-center hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <p className="text-2xl font-extrabold text-primary/30 mb-1">
                      {s.step}
                    </p>
                    <p className="text-sm font-medium leading-snug">
                      {s.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── DIY vs MANAGED ── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Your infrastructure or ours — you choose
            </h2>
            <p className="text-muted-foreground text-lg">
              Start self-hosted, upgrade to managed delivery as you scale.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* DIY */}
            <motion.div {...fadeUp}>
              <Card className="h-full">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Server className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">DIY (Free Path)</h3>
                      <p className="text-xs text-muted-foreground">
                        Bring your own SMTP
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                    {[
                      "Use your own SMTP (SES, SendGrid…)",
                      "Lowest cost at scale",
                      "Full provider control",
                      "Manual setup and management",
                      "Basic tracking & webhooks",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary/40 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button variant="outline" className="w-full">
                      Start Free (BYOS)
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Managed */}
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }}>
              <Card className="h-full border-primary shadow-xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        Managed (Recommended)
                      </h3>
                      <p className="text-xs text-primary font-semibold">
                        Best for inbox placement
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                    {[
                      "Better inbox placement rates",
                      "Optimized routing infrastructure",
                      "Dedicated IP provisioning",
                      "IP warmup management",
                      "Full reputation monitoring",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full gap-2">
                    Get Managed Setup <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FULL FEATURE SET ── */}
      <section id="features" className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
              Complete Feature Set
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              12 categories. 96+ features.
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to run a professional email programme —
              campaigns, automation, A/B testing, segmentation, deliverability,
              and full control over your brand.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { value: "12", label: "Feature Categories" },
              { value: "96+", label: "Individual Features" },
              { value: "4", label: "Email Providers" },
              { value: "1", label: "One unified system" },
            ].map((stat) => (
              <motion.div key={stat.label} {...fadeUp}>
                <div className="bg-background rounded-xl border border-border p-5 text-center">
                  <p className="text-3xl font-extrabold text-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ALL_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.04 }}
              >
                <FeatureCard feature={feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IS THIS FOR ── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div {...fadeUp} className="mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Built for people who own their infrastructure
            </h2>
            <p className="text-muted-foreground text-lg">
              ZeniPost is the right fit if you are any of the following:
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Code2,
                title: "Developers",
                desc: "Running your own infrastructure and tired of expensive SaaS email platforms with usage-based pricing that adds up fast.",
                points: [
                  "Self-host on any VPS or cloud",
                  "Full API access",
                  "No per-email charges on your tier",
                ],
              },
              {
                icon: Briefcase,
                title: "Agencies",
                desc: "Managing email campaigns across multiple clients and needing a single platform with team access and white-label support.",
                points: [
                  "Unlimited installs (Agency license)",
                  "White-label branding",
                  "Client usage permitted",
                ],
              },
              {
                icon: Building2,
                title: "Businesses",
                desc: "Needing complete control over subscriber data, compliance, and deliverability without depending on third-party providers.",
                points: [
                  "Data stays on your server",
                  "Full audit trail",
                  "Managed delivery available",
                ],
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full text-left hover:shadow-lg transition-shadow">
                  <CardContent className="p-7">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {item.desc}
                    </p>
                    <ul className="space-y-1.5">
                      {item.points.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
              Licensing
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Choose your license. Pay once. Use forever.
            </h2>
            <p className="text-muted-foreground text-lg">
              Use your own SMTP or upgrade to managed delivery anytime. No
              monthly fees on the software.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {licensePlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className={cn(
                    "relative overflow-hidden h-full",
                    plan.popular
                      ? "border-primary shadow-2xl scale-[1.03]"
                      : "hover:border-primary/30 transition-colors",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                  )}
                  {plan.popular && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col h-full">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-4xl font-extrabold mb-1">{plan.price}</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      one-time
                    </p>
                    <div className="text-sm bg-muted/50 rounded-lg px-3 py-2 mb-5 space-y-1">
                      <p>
                        <span className="text-muted-foreground">
                          Installations:
                        </span>{" "}
                        <strong>{plan.installs}</strong>
                      </p>
                      <p className="text-primary/80 font-medium">
                        Includes lifetime updates. Paid support available if
                        needed.
                      </p>
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-7">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register">
                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full"
                      >
                        Get {plan.name}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Disclaimer + upgrade hook */}
          <motion.div
            {...fadeUp}
            className="mt-10 max-w-xl mx-auto text-center space-y-2"
          >
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-4 py-2">
              Support is not included with the license. Paid support plans are
              available if you need assistance.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Most users start with their own SMTP and upgrade to managed
              delivery as they scale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SUPPORT PLANS ── */}
      <section id="support" className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
              Support
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Need help setting things up?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              ZeniPost is self-hosted. If you need help with setup,
              configuration, or troubleshooting, choose a support plan.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {supportPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className={cn(
                    "relative overflow-hidden h-full",
                    plan.badge
                      ? "border-primary shadow-xl scale-[1.02]"
                      : "hover:border-primary/30 transition-colors",
                  )}
                >
                  {plan.badge && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                  )}
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col h-full">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {plan.desc}
                    </p>
                    <div className="mb-5">
                      <span className="text-4xl font-extrabold">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {plan.period}
                      </span>
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-7">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.badge ? "default" : "outline"}
                      className="w-full"
                    >
                      Get {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANAGED DELIVERY ── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Fix deliverability. Stop landing in spam.
            </h2>
            <p className="text-muted-foreground text-lg mb-2">
              Increase inbox placement, reduce spam issues, and scale safely.
            </p>
            <p className="text-sm text-muted-foreground">
              Add optimized email infrastructure on top of your ZeniPost
              license.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-5 mb-10">
            {deliveryPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-base mb-1">{plan.name}</h3>
                    <p className="text-2xl font-extrabold text-primary mb-3">
                      {plan.price}
                    </p>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {plan.volume}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5" />
                        {plan.infra}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {plan.routing}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="text-center">
            <Button size="lg" className="gap-2">
              Get Managed Setup <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 bg-foreground text-background text-center">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-5">
              Start free with your own SMTP —
              <br className="hidden sm:block" />
              <span className="text-primary">
                or let us handle your entire email infrastructure.
              </span>
            </h2>
            <p className="text-xl text-background/70 mb-3">
              Buy once. Get lifetime updates. Pay only if you need help or
              delivery.
            </p>
            <p className="text-sm text-background/50 mb-10">
              Your data. Your server. Your rules.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-foreground hover:bg-white/90 text-base px-8 h-12 w-full sm:w-auto"
                >
                  Start Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-base px-8 h-12 w-full sm:w-auto"
              >
                Get Setup Done For Me
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
