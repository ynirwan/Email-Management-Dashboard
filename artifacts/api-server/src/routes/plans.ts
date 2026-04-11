import { Router } from "express";

const router = Router();

export const PLAN_DEFINITIONS = [
  {
    id: "starter",
    name: "Starter License",
    price: 49,
    billing: "one_time",
    installations: 1,
    sharedWorkspace: true,
    isPopular: true,
    badge: "Best for solo teams",
    description: "Own your stack on one domain/server",
    emailsPerMonth: 100000,
    subscribersLimit: 25000,
    features: [
      "1 installation",
      "Multi-user shared workspace",
      "Campaign management",
      "All template editors",
      "Subscriber management",
      "Basic analytics",
      "Suppression list",
      "Custom sending domains",
      "Community support",
    ],
    featureFlags: [
      "campaign_management", "template_editors", "subscriber_management",
      "analytics_basic", "suppression_list", "custom_domains",
    ],
    supportAndUpdatesYearly: 29,
  },
  {
    id: "pro",
    name: "Pro License",
    price: 149,
    billing: "one_time",
    installations: 3,
    sharedWorkspace: true,
    isPopular: false,
    badge: null,
    description: "Automation and integrations for growing teams",
    emailsPerMonth: 500000,
    subscribersLimit: 100000,
    features: [
      "Everything in Starter",
      "Up to 3 installations",
      "Automation workflows",
      "A/B testing",
      "Advanced segmentation",
      "API access",
      "Webhooks",
      "Priority support",
    ],
    featureFlags: [
      "campaign_management", "template_editors", "subscriber_management",
      "analytics_basic", "suppression_list", "custom_domains",
      "automation", "ab_testing", "segmentation_advanced", "api_access", "webhooks",
    ],
    supportAndUpdatesYearly: 49,
  },
  {
    id: "agency",
    name: "Agency License",
    price: 299,
    billing: "one_time",
    installations: 9999999,
    sharedWorkspace: true,
    isPopular: false,
    badge: "Unlimited",
    description: "Unlimited installs with client usage rights",
    emailsPerMonth: 1000000,
    subscribersLimit: 250000,
    features: [
      "Everything in Pro",
      "Unlimited installations",
      "White label",
      "Client usage allowed",
      "Audit logs",
      "Team roles & permissions",
      "Advanced reporting",
    ],
    featureFlags: [
      "campaign_management", "template_editors", "subscriber_management",
      "analytics_basic", "suppression_list", "custom_domains",
      "automation", "ab_testing", "segmentation_advanced", "api_access", "webhooks",
      "white_label", "client_usage", "audit_logs", "team_roles", "analytics_advanced",
    ],
    supportAndUpdatesYearly: 99,
  },
];

export const DELIVERY_PLANS = [
  { id: "delivery_starter", name: "Starter Delivery", priceMonthly: 29, emailsPerMonth: 100000, infrastructure: "Shared IP", routing: "Basic routing" },
  { id: "delivery_growth",  name: "Growth Delivery",  priceMonthly: 79, emailsPerMonth: 500000, infrastructure: "Optimized routing", routing: "Better inbox placement" },
  { id: "delivery_scale",   name: "Scale Delivery",   priceMonthly: 149, emailsPerMonth: 1000000, infrastructure: "Priority queue", routing: "Warmup system" },
  { id: "delivery_dedicated", name: "Dedicated Infrastructure", priceMonthly: 299, emailsPerMonth: 0, infrastructure: "Dedicated IP", routing: "Reputation management + custom scaling" },
];

export const FEATURE_LABELS: Record<string, string> = {
  campaign_management: "Campaign Management",
  template_editors: "Template Editors",
  subscriber_management: "Subscriber Management",
  analytics_basic: "Basic Analytics",
  suppression_list: "Suppression List",
  custom_domains: "Custom Sending Domains",
  automation: "Automation Workflows",
  ab_testing: "A/B Testing",
  segmentation_advanced: "Advanced Segmentation",
  api_access: "API Access",
  webhooks: "Webhooks",
  white_label: "White Label",
  client_usage: "Client Usage Allowed",
  audit_logs: "Audit Logs",
  team_roles: "Team Roles & Permissions",
  analytics_advanced: "Advanced Reporting",
};

router.get("/", (_req, res) => {
  res.json({
    plans: PLAN_DEFINITIONS,
    deliveryPlans: DELIVERY_PLANS,
    featureLabels: FEATURE_LABELS,
    copy: {
      heroHeadline: "Run your own email infrastructure — without deliverability headaches",
      heroSubtext: "Self-hosted email platform. Install on your server and send using your own SMTP or our optimized delivery.",
      pricingHeader: "Buy once. Host anywhere.",
      pricingSubtext: "Use your own SMTP or upgrade to managed delivery anytime.",
      deliveryHeader: "Fix deliverability. Stop landing in spam.",
      deliverySubtext: "Optimized infrastructure with IP warmup, routing, and reputation management.",
      tagline: "Own your email infrastructure. Send without limits.",
      workspaceModel: "Single installation = shared workspace (multi-user, same data)",
    },
  });
});

export default router;
