import { Router } from "express";

const router = Router();

export const PLAN_DEFINITIONS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    emailsPerMonth: 2500,
    subscribersLimit: 500,
    isPopular: false,
    badge: null,
    description: "Try ZeniPost with no commitment",
    features: [
      "2,500 emails/month",
      "500 subscribers",
      "Basic templates",
      "Campaign management",
      "Basic reports",
      "Community support",
    ],
    featureFlags: [] as string[],
  },
  {
    id: "starter",
    name: "Starter",
    price: 35,
    emailsPerMonth: 75000,
    subscribersLimit: 15000,
    isPopular: true,
    badge: "Best Value",
    description: "Everything you need to grow your list",
    features: [
      "75,000 emails/month",
      "15,000 subscribers",
      "All templates",
      "Advanced analytics",
      "List segmentation",
      "Custom sending domains",
      "API access",
      "GDPR tools",
      "Priority support",
    ],
    featureFlags: ["analytics_advanced", "segmentation", "custom_domains", "api_access", "gdpr_tools"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 75,
    emailsPerMonth: 250000,
    subscribersLimit: 50000,
    isPopular: false,
    badge: null,
    description: "Advanced tools for serious email marketers",
    features: [
      "250,000 emails/month",
      "50,000 subscribers",
      "Everything in Starter",
      "A/B testing",
      "Automation workflows",
      "White label",
      "Audit trail",
      "Dedicated support",
    ],
    featureFlags: [
      "analytics_advanced", "segmentation", "custom_domains", "api_access",
      "gdpr_tools", "ab_testing", "automation", "white_label", "audit_trail",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    emailsPerMonth: 1000000,
    subscribersLimit: 250000,
    isPopular: false,
    badge: "Custom",
    description: "High-volume sending, compliance, and managed support",
    features: [
      "1,000,000 emails/month",
      "250,000 subscribers",
      "Everything in Pro",
      "Dedicated infrastructure options",
      "Advanced deliverability support",
      "Managed services",
      "Custom integrations",
      "Priority SLA support",
    ],
    featureFlags: [
      "analytics_advanced", "segmentation", "custom_domains", "api_access",
      "gdpr_tools", "ab_testing", "automation", "white_label", "audit_trail",
      "managed_services", "priority_sla", "custom_integrations",
    ],
  },
];

export const FEATURE_LABELS: Record<string, string> = {
  analytics_advanced: "Advanced Analytics",
  segmentation:       "List Segmentation",
  custom_domains:     "Custom Sending Domains",
  api_access:         "API Access",
  gdpr_tools:         "GDPR Tools",
  ab_testing:         "A/B Testing",
  automation:         "Automation Workflows",
  white_label:        "White Label",
  audit_trail:        "Audit Trail",
  managed_services:   "Managed Services",
  priority_sla:       "Priority SLA Support",
  custom_integrations:"Custom Integrations",
};

router.get("/", (_req, res) => {
  res.json({ plans: PLAN_DEFINITIONS, featureLabels: FEATURE_LABELS });
});

export default router;
