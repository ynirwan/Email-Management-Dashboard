import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Zap, Shield, BarChart, Server } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button, Card, CardContent } from "@/components/ui/core";

export function Landing() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <PublicLayout>
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="initial" animate="animate" variants={staggerContainer} className="max-w-3xl mx-auto">
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-8 border border-primary/20 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              ZeniPost v2.0 is now live
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-display font-extrabold text-foreground leading-[1.1] mb-6">
              Send emails your way. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Own your data.</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-xl text-muted-foreground mb-10 leading-relaxed">
              The powerful, self-hosted email marketing platform. Drag & drop builder, advanced automation, and AWS SES integration with zero hidden fees.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-lg">
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg bg-background/50 backdrop-blur-sm">
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
                alt="ZeniPost Dashboard" 
                className="w-full rounded-xl"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything you need to grow</h2>
            <p className="text-lg text-muted-foreground">Built for marketers, designed for developers. Get the perfect balance of ease-of-use and technical flexibility.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Visual Campaign Builder", desc: "Design beautiful emails with our drag-and-drop editor or code your own HTML templates." },
              { icon: BarChart, title: "Real-Time Analytics", desc: "Track opens, clicks, bounces, and conversions with beautiful, actionable dashboards." },
              { icon: Server, title: "Self-Hosted Control", desc: "Keep your subscriber data on your own servers. Never worry about arbitrary platform bans." },
            ].map((feature, i) => (
              <Card key={i} className="bg-card hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-border/50">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-display">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">No hidden fees. Just pay for what you use.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { name: "Free", price: "0", emails: "500", subs: "500", features: ["Basic Templates", "Community Support"] },
              { name: "Starter", price: "29", emails: "50k", subs: "5k", features: ["Automation builder", "Email Support"] },
              { name: "Pro", price: "79", emails: "250k", subs: "50k", features: ["A/B Testing", "Priority Support", "Custom Domain"], popular: true },
              { name: "Enterprise", price: "199", emails: "Unlimited", subs: "Unlimited", features: ["Dedicated IP", "SLA", "Custom Integration"] },
            ].map((plan, i) => (
              <Card key={i} className={cn("relative overflow-hidden transition-all duration-300", plan.popular ? "border-primary shadow-xl scale-105 z-10" : "border-border/50 hover:border-primary/50")}>
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                )}
                <CardContent className="p-8 flex flex-col h-full">
                  {plan.popular && <span className="absolute top-4 right-4 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>}
                  <h3 className="text-xl font-bold font-display text-muted-foreground mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-primary" /> Up to {plan.emails} emails
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-primary" /> {plan.subs} subscribers
                    </li>
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary/50" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden bg-foreground text-background">
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">Ready to take control?</h2>
          <p className="text-xl text-background/80 mb-10">Join thousands of businesses who have switched to ZeniPost for better deliverability and control.</p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-foreground hover:bg-white/90 text-lg px-8 h-14">
              Create your free account
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
