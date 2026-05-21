import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight, CheckCircle2, Zap, Server, Mail,
  Activity, Send, Users, Filter, FlaskConical, BarChart3, TrendingUp,
  Globe, Lock, Tag, ChevronDown, ChevronUp, CheckCircle,
  Wifi, Code2, Building2, Briefcase, Inbox,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button, Card, CardContent } from "@/components/ui/core";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Global CSS animations injected once
// ─────────────────────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes env-hero {
  0%   { transform: translateX(0px) translateY(0px) rotate(var(--r)); opacity:0; }
  10%  { opacity:var(--op); }
  88%  { opacity:var(--op); }
  100% { transform: translateX(calc(100vw - 80px)) translateY(-10px) rotate(calc(var(--r) + 6deg)); opacity:0; }
}
@keyframes env-cta {
  0%   { transform: translateY(30px) translateX(0px) rotate(var(--r)); opacity:0; }
  10%  { opacity:var(--op); }
  90%  { opacity:var(--op); }
  100% { transform: translateY(-380px) translateX(var(--dx)) rotate(calc(var(--r) + 8deg)); opacity:0; }
}
@keyframes float-pop {
  0%,100% { transform:translateY(0px); }
  50%     { transform:translateY(-2px); }
}
@keyframes server-flicker {
  0%,18%,20%,22%,60%,62%,100% { opacity:1; }
  19%,21%,61% { opacity:0.3; }
}
@keyframes section-flash {
  0%,100% { text-shadow:none; }
  30%     { text-shadow:0 0 22px hsl(var(--primary)/0.55); color:hsl(var(--primary)); }
}
/* BUG FIX: timing-function MUST come before delay in shorthand */
.env-hero-anim { animation: env-hero var(--dur) ease-in-out var(--del) infinite; }
.env-cta-anim  { animation: env-cta  var(--dur) ease-in-out var(--del) infinite; }
.pop-float     { animation: float-pop 4s ease-in-out infinite; }
.srv-flicker   { animation: server-flicker 4s linear 0.8s 1; }
.sec-flash     { animation: section-flash 0.9s ease-out; }
`;

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared envelope SVG — 15% teal/white fill, 2px stroke, reads at all sizes
// Opacity is controlled entirely by CSS animation (var(--op)) — NO inline opacity
// ─────────────────────────────────────────────────────────────────────────────
function EnvelopeSVG({ size }: { size: number }) {
  const w = size;
  const h = Math.round(size * 0.72);
  return (
    <svg width={w} height={h} viewBox="0 0 32 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body — subtle fill so shape reads even at low opacity */}
      <rect x="1" y="1" width="30" height="21" rx="3"
        fill="currentColor" fillOpacity="0.15"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* Flap crease */}
      <polyline points="1,5 16,14.5 31,5"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// A — Hero Envelope Journey  (left → server → inbox, 10 envelopes)
// ─────────────────────────────────────────────────────────────────────────────
const HERO_ENVS = [
  { y: "12%", dur: "10s", del: "0s",    r: "-8deg",  op: 0.38, size: 40 },
  { y: "26%", dur: "13s", del: "2s",    r: "5deg",   op: 0.30, size: 52 },
  { y: "39%", dur: "11s", del: "4.5s",  r: "-4deg",  op: 0.42, size: 36 },
  { y: "51%", dur: "14s", del: "1s",    r: "10deg",  op: 0.32, size: 58 },
  { y: "63%", dur: "9s",  del: "7s",    r: "-12deg", op: 0.36, size: 44 },
  { y: "20%", dur: "12s", del: "9.5s",  r: "7deg",   op: 0.28, size: 48 },
  { y: "73%", dur: "15s", del: "3s",    r: "-6deg",  op: 0.30, size: 38 },
  { y: "44%", dur: "10s", del: "11.5s", r: "12deg",  op: 0.34, size: 54 },
  { y: "33%", dur: "13s", del: "5.5s",  r: "-9deg",  op: 0.40, size: 42 },
  { y: "57%", dur: "11s", del: "8s",    r: "3deg",   op: 0.28, size: 46 },
];

function HeroEnvelopes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* Source — left anchor */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30">
        <Server className="w-9 h-9" />
      </div>
      {/* Destination — right anchor */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/30">
        <Inbox className="w-9 h-9" />
      </div>
      {/* 10 drifting envelopes — NO inline opacity; animation handles it */}
      {HERO_ENVS.map((e, i) => (
        <span
          key={i}
          className="env-hero-anim absolute text-primary"
          style={{
            left: "44px",       // start just right of the Server icon
            top: e.y,
            "--dur": e.dur,
            "--del": e.del,
            "--r": e.r,
            "--op": String(e.op),
          } as React.CSSProperties}
        >
          <EnvelopeSVG size={e.size} />
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C — Word-by-word reveal on "without deliverability headaches"
// ─────────────────────────────────────────────────────────────────────────────
const GRADIENT_WORDS = "without deliverability headaches".split(" ");

const wordV = {
  hidden: { opacity: 0, y: 8, filter: "blur(2px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, delay: 0.35 + i * 0.08, ease: "easeOut" },
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// K — CountUp hook
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 650) {
  const [val, setVal] = useState(0);
  const elRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(eased * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return { val, elRef };
}

function CUp({ n, pre = "", suf = "", cls = "" }: { n: number; pre?: string; suf?: string; cls?: string }) {
  const { val, elRef } = useCountUp(n);
  return <span ref={elRef} className={cls}>{pre}{val}{suf}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// P — Cursor glow (page-wide, desktop only)
// ─────────────────────────────────────────────────────────────────────────────
function CursorGlow() {
  const [pos, setPos] = useState({ x: -300, y: -300 });
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mv = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setOn(true); };
    const lv = () => setOn(false);
    window.addEventListener("mousemove", mv, { passive: true });
    document.addEventListener("mouseleave", lv);
    return () => { window.removeEventListener("mousemove", mv); document.removeEventListener("mouseleave", lv); };
  }, []);
  return (
    <div className="hidden md:block fixed inset-0 pointer-events-none z-[9998]" aria-hidden>
      <div
        style={{
          position: "absolute",
          left: pos.x - 220,
          top:  pos.y - 220,
          width: 440, height: 440,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--primary)/0.06) 0%, transparent 68%)",
          opacity: on ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// E + F — Step cards with connecting line + glow cascade
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { step: "01", label: "Install on your server" },
  { step: "02", label: "Create users (shared workspace)" },
  { step: "03", label: "Connect SMTP (SES, SendGrid, etc.)" },
  { step: "04", label: "Send your campaigns" },
  { step: "05", label: "Upgrade delivery (optional)" },
];

function StepCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.4 });

  return (
    <div ref={containerRef} className="relative">
      {/* F — Teal connecting line (md+) */}
      <div className="hidden md:block absolute top-[38px] inset-x-0 pointer-events-none" style={{ zIndex: 0 }}>
        <svg width="100%" height="3" preserveAspectRatio="none" viewBox="0 0 1000 3">
          <line
            x1="0" y1="1.5" x2="1000" y2="1.5"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeDasharray="1000"
            style={{
              strokeDashoffset: isInView ? 0 : 1000,
              transition: isInView ? "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1) 0.15s" : "none",
            }}
          />
        </svg>
      </div>

      {/* E — Cards with sequential glow */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" style={{ position: "relative", zIndex: 1 }}>
        {STEPS.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 18 }}
            animate={isInView ? {
              opacity: 1,
              y: 0,
              boxShadow: [
                "0 0 0 0px transparent",
                `0 0 0 4px hsl(var(--primary)/0.22), 0 0 18px hsl(var(--primary)/0.14)`,
                "0 0 0 0px transparent",
              ],
            } : {}}
            transition={{
              opacity:    { duration: 0.4,  delay: i * 0.12 },
              y:          { duration: 0.4,  delay: i * 0.12 },
              boxShadow:  { duration: 0.75, delay: i * 0.25 + 0.2, times: [0, 0.45, 1] },
            }}
            className="rounded-xl"
          >
            <Card className="text-center hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <motion.p
                  animate={isInView ? { color: ["hsl(var(--primary)/0.3)", "hsl(var(--primary))", "hsl(var(--primary)/0.35)"] } : {}}
                  transition={{ duration: 0.7, delay: i * 0.25 + 0.25, times: [0, 0.45, 1] }}
                  className="text-2xl font-extrabold mb-1"
                  style={{ color: "hsl(var(--primary)/0.3)" }}
                >
                  {s.step}
                </motion.p>
                <p className="text-sm font-medium leading-snug">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// G + H — Tilt + cursor-glow card, with compare-dim support
// ─────────────────────────────────────────────────────────────────────────────
function TiltCard({
  children, dimmed = false, onEnter, onLeave, className = "",
}: {
  children: React.ReactNode;
  dimmed?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    setTilt({ rx: (ny - 0.5) * -9, ry: (nx - 0.5) * 9 });
    setGlow({ x: nx * 100, y: ny * 100 });
  }, []);

  const onLeaveCard = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
    setGlow({ x: 50, y: 50 });
    setActive(false);
    onLeave?.();
  }, [onLeave]);

  const onEnterCard = useCallback(() => {
    setActive(true);
    onEnter?.();
  }, [onEnter]);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnterCard}
      onMouseLeave={onLeaveCard}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: active ? "transform 0.06s linear, opacity 0.3s ease" : "transform 0.45s ease, opacity 0.3s ease",
        opacity: dimmed ? 0.7 : 1,
        position: "relative",
      }}
      className={className}
    >
      {active && (
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            borderRadius: "inherit",
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, hsl(var(--primary)/0.11) 0%, transparent 60%)`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 3 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// O — Section flash on hash-nav
// ─────────────────────────────────────────────────────────────────────────────
function useSectionFlash() {
  useEffect(() => {
    const flash = () => {
      const hash = window.location.hash.replace("#", "");
      const section = document.getElementById(hash);
      if (!section) return;
      const h2 = section.querySelector<HTMLElement>("h2");
      if (!h2) return;
      h2.classList.remove("sec-flash");
      void h2.offsetWidth; // reflow
      h2.classList.add("sec-flash");
    };
    window.addEventListener("hashchange", flash);
    return () => window.removeEventListener("hashchange", flash);
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// M — CTA Mail Trail  (14 envelopes, 36–58px, 0.18–0.32 opacity dark bg)
// Opacity controlled entirely by CSS animation var(--op) — NO inline opacity
// ─────────────────────────────────────────────────────────────────────────────
const CTA_ENVS = [
  { x: "3%",  dur: "20s", del: "0s",    r: "-10deg", op: 0.22, dx: "20px",  size: 38 },
  { x: "10%", dur: "24s", del: "4s",    r: "7deg",   op: 0.18, dx: "-18px", size: 48 },
  { x: "19%", dur: "18s", del: "8s",    r: "-5deg",  op: 0.26, dx: "28px",  size: 42 },
  { x: "27%", dur: "22s", del: "2s",    r: "12deg",  op: 0.20, dx: "-24px", size: 56 },
  { x: "35%", dur: "26s", del: "11s",   r: "-8deg",  op: 0.30, dx: "16px",  size: 36 },
  { x: "43%", dur: "19s", del: "6s",    r: "4deg",   op: 0.24, dx: "-32px", size: 52 },
  { x: "52%", dur: "23s", del: "14s",   r: "-13deg", op: 0.18, dx: "22px",  size: 44 },
  { x: "60%", dur: "21s", del: "1s",    r: "9deg",   op: 0.28, dx: "-20px", size: 58 },
  { x: "68%", dur: "17s", del: "9s",    r: "-6deg",  op: 0.22, dx: "30px",  size: 40 },
  { x: "75%", dur: "25s", del: "5s",    r: "11deg",  op: 0.32, dx: "-14px", size: 46 },
  { x: "82%", dur: "20s", del: "12s",   r: "-4deg",  op: 0.20, dx: "18px",  size: 54 },
  { x: "88%", dur: "22s", del: "3s",    r: "6deg",   op: 0.26, dx: "-26px", size: 38 },
  { x: "93%", dur: "18s", del: "7s",    r: "-11deg", op: 0.24, dx: "12px",  size: 50 },
  { x: "97%", dur: "24s", del: "15s",   r: "8deg",   op: 0.18, dx: "-10px", size: 44 },
];

function CtaEnvelopes() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {CTA_ENVS.map((e, i) => (
        <span
          key={i}
          className="env-cta-anim absolute text-white"
          style={{
            bottom: "-30px",
            left: e.x,
            "--dur": e.dur,
            "--del": e.del,
            "--r": e.r,
            "--op": String(e.op),
            "--dx": e.dx,
          } as React.CSSProperties}
        >
          <EnvelopeSVG size={e.size} />
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────────────────────
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
      "Social links, video, and multi-column layout blocks",
      "Import your own HTML design",
      "Compliance-ready unsubscribe block with auto-filled link",
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
    desc: "Send the right message to the right people. Build precise audience segments using 7 filter types — available on every plan, no spreadsheets, no guesswork.",
    items: [
      "Filter by subscriber status (active, inactive, bounced, unsubscribed)",
      "Filter by list membership",
      "Filter by subscription date range",
      "Filter by location (country or city)",
      "Filter by profile fields (company, job title, phone number)",
      "Filter by email domain (Gmail, Outlook, corporate)",
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
      "Birthday trigger for date-based automation",
      "Conditional steps (if/else branching on opens, clicks, fields)",
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
      "One-click unsubscribe compliance built in",
      "Smart rate limiting per email provider",
      "Provider error alerts for SMTP and authentication issues",
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
      "Custom reply-to address configurable per campaign",
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
      "Field mapping configured per campaign — different tags each send",
      "Merge tags work in campaigns, A/B tests, and automation equally",
      "Auto-inject unsubscribe link in every email",
      "Personalise sender name and reply-to per campaign",
    ],
  },
  {
    icon: Lock,
    title: "Security & Access",
    desc: "Your data stays on your server — always. Audit every action, control user access, and keep your email programme fully under your control.",
    items: [
      "Full audit trail — every action logged (all plans)",
      "Secure login with password protection",
      "Self-hosted — data never leaves your server",
      "Session management and access control",
      "No third-party access to your subscriber data",
      "Individual user accounts per installation",
      "Multiple user accounts on Agency plan",
      "Activity history per user",
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
      "Send events to any URL in real time",
      "Use your existing SMTP — no migration needed",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FeatureCard — J (30ms stagger applied in parent)
// ─────────────────────────────────────────────────────────────────────────────
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
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> +{rest.length} more</>}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: "easeOut" },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function Landing() {
  useSectionFlash();

  // H — track which path card is hovered
  const [hoveredPath, setHoveredPath] = useState<"diy" | "managed" | null>(null);

  const licensePlans = [
    {
      id: "starter",
      name: "Starter License",
      price: 49,
      installs: 1,
      installsLabel: "1",
      popular: true,
      features: [
        "1 server or domain installation",
        "Campaign management",
        "Email builder (drag-and-drop, HTML, visual)",
        "Subscriber management & segmentation",
        "Analytics & suppression management",
        "Send from your own domain",
        "Real-time webhooks",
        "Full audit trail",
        "Lifetime software updates",
      ],
    },
    {
      id: "pro",
      name: "Pro License",
      price: 149,
      installs: 3,
      installsLabel: "3",
      popular: false,
      features: [
        "Everything in Starter",
        "Up to 3 installations",
        "Automation workflows",
        "A/B testing",
        "REST API access",
        "Deliverability dashboard",
        "CSV export & advanced reporting",
        "Lifetime software updates",
      ],
    },
    {
      id: "agency",
      name: "Agency License",
      price: 299,
      installs: null,
      installsLabel: "Unlimited",
      popular: false,
      features: [
        "Everything in Pro",
        "Unlimited installations",
        "Multiple user accounts per install",
        "Lifetime software updates",
      ],
    },
  ];

  const supportPlans = [
    {
      name: "Basic Support",
      price: 19,
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
      price: 49,
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
      price: null,
      priceLabel: "$49–$99",
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
    { name: "Starter Delivery", price: 35,  suffix: "/mo", volume: "55,000 emails/month",    infra: "Shared IP pool",    routing: "Basic routing" },
    { name: "Growth Delivery",  price: 87,  suffix: "/mo", volume: "150,000 emails/month",   infra: "Optimized routing", routing: "Better inbox placement" },
    { name: "Scale Delivery",   price: 159, suffix: "/mo", volume: "350,000 emails/month",   infra: "Priority queue",    routing: "Warmup system included" },
    { name: "Dedicated IP",     price: 299, suffix: "+/mo",volume: "Custom email volume",    infra: "Dedicated IP",      routing: "Reputation management + scaling" },
  ];

  return (
    <PublicLayout>
      <StyleInjector />
      <CursorGlow />

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        {/* A — drifting envelopes */}
        <HeroEnvelopes />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
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

          {/* C — word-by-word reveal on gradient line only */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-5xl md:text-7xl font-display font-extrabold leading-[1.08] tracking-tight mb-4"
          >
            Run your own email infrastructure —
            <br />
            <span className="inline">
              {GRADIENT_WORDS.map((word, i) => (
                <motion.span
                  key={i}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  variants={wordV}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 inline-block mr-[0.22em] last:mr-0"
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.65 }}
            className="text-lg font-semibold text-muted-foreground mb-3"
          >
            Self-hosted. Your server. Your control.
          </motion.p>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.72 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Install on your own server and send using your SMTP — or upgrade to
            our optimized managed delivery anytime.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.78 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Link href="#pricing">
              <Button size="lg" className="gap-2 text-base px-8 h-12 w-full sm:w-auto">
                Buy License <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-base px-8 h-12 w-full sm:w-auto">
              Get Managed Setup
            </Button>
          </motion.div>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.85 }}
            className="text-sm text-muted-foreground/70 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-primary/50" />
            Works with AWS SES, SendGrid, and any SMTP provider
          </motion.p>
        </div>
      </section>

      {/* ── HOW IT WORKS (E + F) ── */}
      <section id="how" className="py-16 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <motion.h2 {...fadeUp} className="text-center text-2xl font-bold mb-10 text-muted-foreground">
            Up and running in 5 steps
          </motion.h2>
          <StepCards />
        </div>
      </section>

      {/* ── DIY vs MANAGED (G + H) ── */}
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
              <TiltCard
                dimmed={hoveredPath === "managed"}
                onEnter={() => setHoveredPath("diy")}
                onLeave={() => setHoveredPath(null)}
              >
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Server className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">DIY (Free Path)</h3>
                        <p className="text-xs text-muted-foreground">Bring your own SMTP</p>
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
                      <Button variant="outline" className="w-full">Start Free (BYOS)</Button>
                    </Link>
                  </CardContent>
                </Card>
              </TiltCard>
            </motion.div>

            {/* Managed */}
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }}>
              <TiltCard
                dimmed={hoveredPath === "diy"}
                onEnter={() => setHoveredPath("managed")}
                onLeave={() => setHoveredPath(null)}
              >
                <Card className="h-full border-primary shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Managed (Recommended)</h3>
                        <p className="text-xs text-primary font-semibold">Best for inbox placement</p>
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
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FULL FEATURE SET (J) ── */}
      <section id="features" className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
              Complete Feature Set
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              <CUp n={12} cls="tabular-nums" /> categories.{" "}
              <CUp n={96} suf="+" cls="tabular-nums" /> features.
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to run a professional email programme —
              campaigns, automation, A/B testing, segmentation, deliverability,
              and full control over your brand.
            </p>
          </motion.div>

          {/* K — CountUp stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { n: 12,  suf: "",  label: "Feature Categories" },
              { n: 96,  suf: "+", label: "Individual Features" },
              { n: 4,   suf: "",  label: "Email Providers" },
              { n: 1,   suf: "",  label: "One unified system" },
            ].map((stat) => (
              <motion.div key={stat.label} {...fadeUp}>
                <div className="bg-background rounded-xl border border-border p-5 text-center">
                  <p className="text-3xl font-extrabold text-primary">
                    <CUp n={stat.n} suf={stat.suf} cls="tabular-nums" />
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* J — 30ms stagger */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ALL_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.03, ease: "easeOut" }}
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
                points: ["Self-host on any VPS or cloud", "Full API access", "No per-email charges on your tier"],
              },
              {
                icon: Briefcase,
                title: "Agencies",
                desc: "Managing email campaigns across multiple clients and needing a single platform you can install anywhere, as many times as you need.",
                points: ["Unlimited installs (Agency license)", "Multiple user accounts per install", "Full automation and API access"],
              },
              {
                icon: Building2,
                title: "Businesses",
                desc: "Needing complete control over subscriber data, compliance, and deliverability without depending on third-party providers.",
                points: ["Data stays on your server", "Full audit trail", "Managed delivery available"],
              },
            ].map((item, i) => (
              <motion.div key={item.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full text-left hover:shadow-lg transition-shadow">
                  <CardContent className="p-7">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{item.desc}</p>
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

      {/* ── PRICING (K + L) ── */}
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
              Use your own SMTP or upgrade to managed delivery anytime. No monthly fees on the software.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {licensePlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {/* L — float loop on popular card */}
                <motion.div
                  animate={plan.popular ? { y: [0, -2, 0] } : {}}
                  transition={plan.popular ? { duration: 4, ease: "easeInOut", repeat: Infinity } : {}}
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
                      {/* K — CountUp price */}
                      <p className="text-4xl font-extrabold mb-1">
                        $<CUp n={plan.price} cls="tabular-nums" />
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">one-time</p>
                      <div className="text-sm bg-muted/50 rounded-lg px-3 py-2 mb-5 space-y-1">
                        <p>
                          <span className="text-muted-foreground">Installations:</span>{" "}
                          <strong>
                            {plan.installs !== null
                              ? <><CUp n={plan.installs} cls="tabular-nums" /></>
                              : "Unlimited"}
                          </strong>
                        </p>
                        <p className="text-primary/80 font-medium">
                          Includes lifetime updates. Paid support available if needed.
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
                        <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                          Get {plan.name}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-10 max-w-xl mx-auto text-center space-y-2">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-4 py-2">
              Support is not included with the license. Paid support plans are available if you need assistance.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Most users start with their own SMTP and upgrade to managed delivery as they scale.
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
              ZeniPost is self-hosted. If you need help with setup, configuration, or troubleshooting, choose a support plan.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {supportPlans.map((plan, i) => (
              <motion.div key={plan.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card
                  className={cn(
                    "relative overflow-hidden h-full",
                    plan.badge ? "border-primary shadow-xl scale-[1.02]" : "hover:border-primary/30 transition-colors",
                  )}
                >
                  {plan.badge && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />}
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">{plan.badge}</span>
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col h-full">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                    <div className="mb-5">
                      {/* K — CountUp for support prices */}
                      <span className="text-4xl font-extrabold">
                        {plan.price !== null ? (
                          <><span>$</span><CUp n={plan.price as number} cls="tabular-nums" /></>
                        ) : (
                          (plan as any).priceLabel
                        )}
                      </span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-7">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button variant={plan.badge ? "default" : "outline"} className="w-full">
                      Get {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANAGED DELIVERY (K) ── */}
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
              Add optimized email infrastructure on top of your ZeniPost license.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-5 mb-10">
            {deliveryPlans.map((plan, i) => (
              <motion.div key={plan.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-base mb-1">{plan.name}</h3>
                    {/* K — CountUp delivery prices */}
                    <p className="text-2xl font-extrabold text-primary mb-3">
                      $<CUp n={plan.price} cls="tabular-nums" />{plan.suffix}
                    </p>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{plan.volume}</p>
                      <p className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" />{plan.infra}</p>
                      <p className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />{plan.routing}</p>
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

      {/* ── FINAL CTA (M + N) ── */}
      <section className="relative py-24 bg-foreground text-background text-center overflow-hidden">
        {/* M — mail trail */}
        <CtaEnvelopes />

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-5">
              Start free with your own SMTP —
              <br className="hidden sm:block" />
              {/* N — flicker on view-enter */}
              <motion.span
                className="text-primary srv-flicker"
                initial={{ opacity: 1 }}
                whileInView={{ opacity: [1, 0.3, 1, 0.35, 1, 1] }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.5, times: [0, 0.15, 0.3, 0.45, 0.6, 1] }}
              >
                or let us handle your entire email infrastructure.
              </motion.span>
            </h2>
            <p className="text-xl text-background/70 mb-3">
              Buy once. Get lifetime updates. Pay only if you need help or delivery.
            </p>
            <p className="text-sm text-background/50 mb-10">
              Your data. Your server. Your rules.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-foreground hover:bg-white/90 text-base px-8 h-12 w-full sm:w-auto">
                  Start Free
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base px-8 h-12 w-full sm:w-auto">
                Get Setup Done For Me
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
