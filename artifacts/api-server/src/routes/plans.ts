// artifacts/api-server/src/routes/plans.ts  (FULL REPLACEMENT)
//
// Changes:
//   - featureFlags arrays now use canonical PLAN_FEATURE_FLAGS from feature-flags.ts
//   - FEATURE_LABELS exported from feature-flags.ts (single source of truth)
//   - DELIVERY_PLANS updated with correct values matching Landing page + delivery block spec
//   - Added dedicated_ip and ip_warmup flags to relevant delivery tiers

import { Router } from "express";
import { PLAN_FEATURE_FLAGS, FEATURE_LABELS } from "@workspace/db/schema/feature-flags.js";

const router = Router();

export const PLAN_DEFINITIONS = [
  {
    id:               "starter",
    name:             "Starter License",
    price:            49,
    billing:          "one_time",
    installations:    1,
    sharedWorkspace:  true,
    isPopular:        true,
    badge:            "Best for solo teams",
    description:      "Own your stack on one domain/server",
    emailsPerMonth:   100000,
    subscribersLimit: 25000,
    features: [
      "1 installation (server/domain)",
      "Multi-user shared workspace",
      "Campaign management",
      "All template editors",
      "Subscriber management",
      "Basic analytics",
      "Suppression list",
      "Custom sending domains",
      "Webhooks",
      "Lifetime software updates",
    ],
    featureFlags: PLAN_FEATURE_FLAGS.starter,
  },
  {
    id:               "pro",
    name:             "Pro License",
    price:            149,
    billing:          "one_time",
    installations:    3,
    sharedWorkspace:  true,
    isPopular:        false,
    badge:            null,
    description:      "Automation and integrations for growing teams",
    emailsPerMonth:   500000,
    subscribersLimit: 100000,
    features: [
      "Everything in Starter",
      "Up to 3 installations",
      "Automation workflows",
      "A/B testing",
      "Advanced segmentation",
      "API access",
      "Advanced analytics",
      "GDPR tools",
      "Lifetime software updates",
    ],
    featureFlags: PLAN_FEATURE_FLAGS.pro,
  },
  {
    id:               "agency",
    name:             "Agency License",
    price:            299,
    billing:          "one_time",
    installations:    9999999,   // Unlimited
    sharedWorkspace:  true,
    isPopular:        false,
    badge:            "Unlimited",
    description:      "Unlimited installs with client usage rights",
    emailsPerMonth:   1000000,
    subscribersLimit: 250000,
    features: [
      "Everything in Pro",
      "Unlimited installations",
      "White label",
      "Client usage allowed",
      "Audit logs",
      "Team roles & permissions",
      "Lifetime software updates",
    ],
    featureFlags: PLAN_FEATURE_FLAGS.agency,
  },
];

// ── Delivery plans ─────────────────────────────────────────────────────────────
// These match the Landing page display AND the delivery block written into license files.
// Fields:
//   id              — used in PATCH /licenses/:id/delivery { planId }
//   emailsPerMonth  — 0 = custom/unlimited
//   infrastructure  — written to delivery.infra in license file
//   routing         — written to delivery.routing in license file
//   featureFlags    — delivery-specific flags injected into license features[]
export const DELIVERY_PLANS = [
  {
    id:             "delivery_starter",
    name:           "Starter Delivery",
    priceMonthly:   35,
    emailsPerMonth: 55000,
    infrastructure: "Shared IP pool",
    routing:        "Basic routing",
    featureFlags:   ["managed_delivery"],
  },
  {
    id:             "delivery_growth",
    name:           "Growth Delivery",
    priceMonthly:   87,
    emailsPerMonth: 150000,
    infrastructure: "Optimized routing",
    routing:        "Better inbox placement",
    featureFlags:   ["managed_delivery", "ip_warmup"],
  },
  {
    id:             "delivery_scale",
    name:           "Scale Delivery",
    priceMonthly:   159,
    emailsPerMonth: 350000,
    infrastructure: "Priority queue",
    routing:        "Warmup system included",
    featureFlags:   ["managed_delivery", "ip_warmup"],
  },
  {
    id:             "delivery_dedicated",
    name:           "Dedicated IP",
    priceMonthly:   299,
    emailsPerMonth: 0,   // Custom volume
    infrastructure: "Dedicated IP",
    routing:        "Reputation management + custom scaling",
    featureFlags:   ["managed_delivery", "ip_warmup", "dedicated_ip"],
  },
];

router.get("/", (_req, res) => {
  res.json({
    plans:         PLAN_DEFINITIONS,
    deliveryPlans: DELIVERY_PLANS,
    featureLabels: FEATURE_LABELS,
    copy: {
      heroHeadline:    "Run your own email infrastructure — without deliverability headaches",
      heroSubtext:     "Self-hosted email platform. Install on your server and send using your own SMTP or our optimized delivery.",
      pricingHeader:   "Buy once. Host anywhere.",
      pricingSubtext:  "Use your own SMTP or upgrade to managed delivery anytime.",
      deliveryHeader:  "Fix deliverability. Stop landing in spam.",
      deliverySubtext: "Optimized infrastructure with IP warmup, routing, and reputation management.",
      tagline:         "Own your email infrastructure. Send without limits.",
      workspaceModel:  "Single installation = shared workspace (multi-user, same data)",
    },
  });
});

export default router;